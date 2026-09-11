from __future__ import annotations

from pathlib import Path

import pytest

from app.services.jarvis_adapter import JarvisControlError, ManagedJarvisAdapter


class FakeProcess:
    def __init__(self, pid: int) -> None:
        self.pid = pid
        self.stdout = None
        self.running = True
        self.signals: list[int] = []
        self.terminate_calls = 0
        self.kill_calls = 0

    def poll(self) -> int | None:
        return None if self.running else 0

    def wait(self, timeout: float | None = None) -> int:
        if self.running:
            raise TimeoutError(f"still running after {timeout}")
        return 0

    def send_signal(self, signal_number: int) -> None:
        self.signals.append(signal_number)
        self.running = False

    def terminate(self) -> None:
        self.terminate_calls += 1
        self.running = False

    def kill(self) -> None:
        self.kill_calls += 1
        self.running = False


def project(tmp_path: Path) -> Path:
    target = tmp_path / "Jarvis"
    (target / ".venv" / "Scripts").mkdir(parents=True)
    (target / "jarvis").mkdir()
    (target / ".venv" / "Scripts" / "python.exe").touch()
    (target / "jarvis" / "__main__.py").touch()
    return target


def test_start_does_not_create_a_second_dashboard_process(tmp_path: Path) -> None:
    process = FakeProcess(44_000)
    launches: list[object] = []
    adapter = ManagedJarvisAdapter(
        project(tmp_path),
        tmp_path / "runtime",
        process_factory=lambda *_args, **_kwargs: (launches.append(object()) or process),
    )

    first = adapter.start()
    second = adapter.start()

    assert first["connected"] is True
    assert second["managed"] is True
    assert len(launches) == 1
    assert "nicht ein zweites Mal" in str(second["message"])


def test_start_enforces_utf8_for_both_sides_of_the_log_pipe(tmp_path: Path) -> None:
    process = FakeProcess(44_010)
    launch_options: dict[str, object] = {}

    def factory(*_args, **kwargs):
        launch_options.update(kwargs)
        return process

    adapter = ManagedJarvisAdapter(
        project(tmp_path), tmp_path / "runtime", process_factory=factory
    )

    adapter.start()

    environment = launch_options["env"]
    assert isinstance(environment, dict)
    assert environment["PYTHONUTF8"] == "1"
    assert environment["PYTHONIOENCODING"] == "utf-8:strict"
    assert environment["PYTHONUNBUFFERED"] == "1"
    assert launch_options["encoding"] == "utf-8"
    assert launch_options["errors"] == "strict"


def test_stop_only_targets_the_dashboard_owned_process(tmp_path: Path) -> None:
    process = FakeProcess(44_001)
    adapter = ManagedJarvisAdapter(
        project(tmp_path), tmp_path / "runtime", process_factory=lambda *_args, **_kwargs: process
    )
    adapter.start()

    result = adapter.stop()

    assert result["status"] == "gestoppt"
    assert len(process.signals) == 1
    assert process.terminate_calls == 0
    assert process.kill_calls == 0


def test_stop_when_not_running_is_safe(tmp_path: Path) -> None:
    adapter = ManagedJarvisAdapter(project(tmp_path), tmp_path / "runtime")

    result = adapter.stop()

    assert result["status"] == "gestoppt"
    assert result["connected"] is False


def test_restart_replaces_only_the_owned_process(tmp_path: Path) -> None:
    processes = [FakeProcess(44_002), FakeProcess(44_003)]
    adapter = ManagedJarvisAdapter(
        project(tmp_path),
        tmp_path / "runtime",
        process_factory=lambda *_args, **_kwargs: processes.pop(0),
    )
    adapter.start()

    result = adapter.restart()

    assert result["pid"] == 44_003
    assert result["managed"] is True


def test_missing_project_or_python_is_reported_without_launch(tmp_path: Path) -> None:
    adapter = ManagedJarvisAdapter(tmp_path / "missing", tmp_path / "runtime")

    with pytest.raises(JarvisControlError, match="Projektpfad fehlt"):
        adapter.start()

    incomplete = tmp_path / "incomplete"
    (incomplete / "jarvis").mkdir(parents=True)
    (incomplete / "jarvis" / "__main__.py").touch()
    adapter = ManagedJarvisAdapter(incomplete, tmp_path / "runtime")
    with pytest.raises(JarvisControlError, match="virtuelle Python-Umgebung"):
        adapter.start()


def test_backend_restart_can_recover_a_verified_dashboard_record(tmp_path: Path) -> None:
    process = FakeProcess(44_004)
    runtime = tmp_path / "runtime"
    first = ManagedJarvisAdapter(
        project(tmp_path), runtime, process_factory=lambda *_args, **_kwargs: process
    )
    first.start()
    restarted_backend = ManagedJarvisAdapter(tmp_path / "Jarvis", runtime)
    restarted_backend._verified_record_process = lambda _record: process  # type: ignore[method-assign]

    result = restarted_backend.snapshot()

    assert result["connected"] is True
    assert result["managed"] is True


def test_existing_log_states_are_mapped_without_touching_jarvis_code(tmp_path: Path) -> None:
    adapter = ManagedJarvisAdapter(project(tmp_path), tmp_path / "runtime")

    adapter._record_log("2026 | INFO | Zustand: LISTENING")
    assert adapter.snapshot()["status"] == "hoert_zu"
    adapter._record_log("2026 | INFO | Zustand: EXECUTING")
    assert adapter.snapshot()["status"] == "verarbeitet"
    adapter._record_log("2026 | INFO | Zustand: GREETING")
    assert adapter.snapshot()["status"] == "spricht"
    adapter._record_log("2026 | ERROR | Testfehler")
    assert adapter.snapshot()["status"] == "fehler"
    assert adapter.snapshot()["message"] == "2026 | ERROR | Testfehler"


def test_conversation_events_keep_real_question_and_answer(tmp_path: Path) -> None:
    adapter = ManagedJarvisAdapter(project(tmp_path), tmp_path / "runtime")

    adapter._record_log("2026 | INFO | Zustand: LISTENING")
    assert adapter.snapshot()["last_user_text"] is None
    adapter._record_log("2026 | INFO | Frage: Wie spät ist es?")
    adapter._record_log("2026 | INFO | Zustand: EXECUTING")
    adapter._record_log("2026 | INFO | Antwort: Es ist zwölf Uhr.")
    adapter._record_log("2026 | INFO | Zustand: SPEAKING")

    result = adapter.snapshot()
    assert result["status"] == "spricht"
    assert result["last_user_text"] == "Wie spät ist es?"
    assert result["last_response"] == "Es ist zwölf Uhr."

    adapter._record_log("2026 | INFO | Zustand: LISTENING")
    assert adapter.snapshot()["last_user_text"] is None
    assert adapter.snapshot()["last_response"] is None


def test_german_unicode_survives_logs_and_conversation_fields_unchanged(tmp_path: Path) -> None:
    adapter = ManagedJarvisAdapter(project(tmp_path), tmp_path / "runtime")
    question = "Grüße aus Köln – schön, dass du da bist."
    answer = "dafür persönlich: Präzise Unterstützung. ÄÖÜ äöü ß"

    adapter._record_log(f"2026 | INFO | Frage: {question}")
    adapter._record_log(f"2026 | INFO | Antwort: {answer}")

    result = adapter.snapshot()
    assert result["last_user_text"] == question
    assert result["last_response"] == answer
    assert result["logs"][-2:] == [
        f"2026 | INFO | Frage: {question}",
        f"2026 | INFO | Antwort: {answer}",
    ]
    assert chr(0xFFFD) not in "".join(result["logs"])


def test_new_start_discards_logs_from_the_previous_session(tmp_path: Path) -> None:
    process = FakeProcess(44_011)
    adapter = ManagedJarvisAdapter(
        project(tmp_path),
        tmp_path / "runtime",
        process_factory=lambda *_args, **_kwargs: process,
    )
    adapter._record_log("2026 | INFO | Antwort: alter Sitzungs-Log")

    result = adapter.start()

    assert result["logs"] == []
