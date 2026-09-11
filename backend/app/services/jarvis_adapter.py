"""Sicher begrenzte lokale Prozesssteuerung für das getrennte Jarvis-Projekt."""

from __future__ import annotations

import json
import os
import signal
import subprocess
import threading
import time
from collections import deque
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal, Protocol

import psutil


JarvisStatus = Literal[
    "nicht_verbunden", "bereit", "hoert_zu", "verarbeitet", "spricht", "gestoppt", "fehler"
]

# This path is deliberately not configurable through HTTP or the UI.
# It is derived from the current Windows user's home directory so the
# repository never exposes a private username or absolute local path.
JARVIS_PROJECT_PATH = Path.home() / "Documents" / "VS code" / "Jarvis"
MAX_LOG_LINES = 120


class JarvisControlError(RuntimeError):
    def __init__(self, message: str, status_code: int = 409) -> None:
        super().__init__(message)
        self.status_code = status_code


class ProcessLike(Protocol):
    pid: int
    stdout: object | None

    def poll(self) -> int | None: ...

    def wait(self, timeout: float | None = None) -> int: ...

    def send_signal(self, signal_number: int) -> None: ...

    def terminate(self) -> None: ...

    def kill(self) -> None: ...


class ManagedJarvisAdapter:
    """Owns only the exact Jarvis process started through this adapter."""

    def __init__(
        self,
        project_path: Path = JARVIS_PROJECT_PATH,
        runtime_directory: Path | None = None,
        process_factory: Callable[..., ProcessLike] = subprocess.Popen,
    ) -> None:
        self._project_path = project_path
        self._python_path = project_path / ".venv" / "Scripts" / "python.exe"
        self._runtime_directory = runtime_directory or Path(__file__).resolve().parents[2] / "data"
        self._record_path = self._runtime_directory / "jarvis-process.json"
        self._process_factory = process_factory
        self._process: ProcessLike | None = None
        self._lock = threading.RLock()
        self._logs: deque[str] = deque(maxlen=MAX_LOG_LINES)
        self._state: JarvisStatus = "nicht_verbunden"
        self._message: str | None = None
        self._last_user_text: str | None = None
        self._last_response: str | None = None
        self._last_stop = False

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            managed = self._managed_process()
            if managed is not None:
                return self._snapshot_for_process(managed, managed_by_dashboard=True)

            external = self._find_external_process()
            if external is not None:
                return self._snapshot_for_process(external, managed_by_dashboard=False)

            if self._process is not None:
                exit_code = self._process.poll()
                if exit_code not in (None, 0) and not self._last_stop:
                    self._state = "fehler"
                    self._message = f"Jarvis wurde mit Fehlercode {exit_code} beendet."
                self._process = None
                self._remove_record()

            status: JarvisStatus = "gestoppt" if self._last_stop else self._state
            return self._response(status=status, connected=False, managed=False)

    def start(self) -> dict[str, object]:
        with self._lock:
            current = self._managed_process()
            if current is not None:
                self._message = "Jarvis läuft bereits und wurde nicht ein zweites Mal gestartet."
                return self._snapshot_for_process(current, managed_by_dashboard=True)

            external = self._find_external_process()
            if external is not None:
                return self._snapshot_for_process(
                    external,
                    managed_by_dashboard=False,
                    message="Jarvis läuft bereits außerhalb des Dashboards und wird nicht doppelt gestartet.",
                )

            self._validate_installation()
            child_environment = os.environ.copy()
            child_environment.update(
                {
                    "PYTHONUTF8": "1",
                    "PYTHONIOENCODING": "utf-8:strict",
                    "PYTHONUNBUFFERED": "1",
                }
            )
            try:
                process = self._process_factory(
                    [str(self._python_path), "-m", "jarvis"],
                    cwd=str(self._project_path),
                    stdin=subprocess.DEVNULL,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding="utf-8",
                    errors="strict",
                    env=child_environment,
                    bufsize=1,
                    creationflags=getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0),
                )
            except OSError as exc:
                raise JarvisControlError(f"Jarvis konnte nicht gestartet werden: {exc}", 503) from exc

            self._process = process
            self._state = "bereit"
            self._message = "Jarvis wird gestartet."
            self._logs.clear()
            self._last_user_text = None
            self._last_response = None
            self._last_stop = False
            self._save_record(process.pid)
            self._start_log_reader(process)
            return self._snapshot_for_process(process, managed_by_dashboard=True)

    def stop(self) -> dict[str, object]:
        with self._lock:
            process = self._managed_process()
            if process is None:
                if self._find_external_process() is not None:
                    raise JarvisControlError(
                        "Jarvis wurde nicht vom Dashboard gestartet und kann hier nur beobachtet werden.",
                        409,
                    )
                self._last_stop = True
                self._state = "gestoppt"
                self._message = "Jarvis läuft nicht."
                return self._response(status="gestoppt", connected=False, managed=False)

            self._message = "Jarvis wird kontrolliert beendet."
            self._stop_process(process)
            self._process = None
            self._remove_record()
            self._state = "gestoppt"
            self._last_stop = True
            self._message = "Jarvis wurde beendet."
            return self._response(status="gestoppt", connected=False, managed=False)

    def restart(self) -> dict[str, object]:
        with self._lock:
            if self._managed_process() is not None:
                self.stop()
            elif self._find_external_process() is not None:
                raise JarvisControlError(
                    "Jarvis läuft außerhalb des Dashboards und kann nicht sicher neu gestartet werden.",
                    409,
                )
            return self.start()

    def _validate_installation(self) -> None:
        if not self._project_path.is_dir():
            raise JarvisControlError(f"Jarvis-Projektpfad fehlt: {self._project_path}", 503)
        if not self._python_path.is_file():
            raise JarvisControlError("Die virtuelle Python-Umgebung von Jarvis fehlt.", 503)
        if not (self._project_path / "jarvis" / "__main__.py").is_file():
            raise JarvisControlError("Das Jarvis-Startmodul fehlt im fest konfigurierten Projekt.", 503)

    def _start_log_reader(self, process: ProcessLike) -> None:
        stream = process.stdout
        if stream is None or not hasattr(stream, "readline"):
            return

        def read_logs() -> None:
            while True:
                line = stream.readline()
                if not line:
                    return
                self._record_log(str(line).strip())

        threading.Thread(target=read_logs, name="jarvis-dashboard-logs", daemon=True).start()

    def _record_log(self, line: str) -> None:
        if not line:
            return
        with self._lock:
            self._logs.append(line[:1000])
            if "Zustand: WAITING" in line:
                self._state = "bereit"
            elif "Zustand: GREETING" in line:
                self._state = "spricht"
            elif "Zustand: LISTENING" in line:
                self._state = "hoert_zu"
                self._last_user_text = None
                self._last_response = None
            elif "Zustand: EXECUTING" in line:
                self._state = "verarbeitet"
            elif "Zustand: SPEAKING" in line:
                self._state = "spricht"
            elif "Frage: " in line:
                self._last_user_text = line.partition("Frage: ")[2].strip()[:2000] or None
            elif "Antwort: " in line:
                self._last_response = line.partition("Antwort: ")[2].strip()[:8000] or None
            elif "Jarvis wurde beendet" in line:
                self._state = "gestoppt"
            elif " | ERROR | " in line:
                self._state = "fehler"
                self._message = line

    def _managed_process(self) -> ProcessLike | psutil.Process | None:
        if self._process is not None and self._process.poll() is None:
            return self._process

        record = self._load_record()
        if record is None:
            return None
        process = self._verified_record_process(record)
        if process is None:
            self._remove_record()
            return None
        return process

    def _find_external_process(self) -> psutil.Process | None:
        record = self._load_record()
        managed_pid = record.get("pid") if record else None
        for process in psutil.process_iter(["pid", "exe", "cmdline"]):
            try:
                if process.pid == managed_pid:
                    continue
                if self._is_jarvis_process(process):
                    return process
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                continue
        return None

    def _verified_record_process(self, record: dict[str, object]) -> psutil.Process | None:
        pid = record.get("pid")
        created = record.get("created")
        if not isinstance(pid, int) or not isinstance(created, (int, float)):
            return None
        try:
            process = psutil.Process(pid)
            if abs(process.create_time() - float(created)) > 1:
                return None
            return process if self._is_jarvis_process(process) else None
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            return None

    def _is_jarvis_process(self, process: psutil.Process) -> bool:
        try:
            executable = Path(process.exe()).resolve()
            command = process.cmdline()
        except (psutil.AccessDenied, psutil.NoSuchProcess, OSError):
            return False
        command_python = Path(command[0]).resolve() if command else None
        if executable != self._python_path.resolve() and command_python != self._python_path.resolve():
            return False
        return "-m" in command and "jarvis" in command

    def _snapshot_for_process(
        self,
        process: ProcessLike | psutil.Process,
        *,
        managed_by_dashboard: bool,
        message: str | None = None,
    ) -> dict[str, object]:
        pid = process.pid
        started = self._started_at(process)
        current_state: JarvisStatus = self._state if managed_by_dashboard else "bereit"
        return self._response(
            status=current_state,
            connected=True,
            managed=managed_by_dashboard,
            pid=pid,
            started_at=started,
            message=message or self._message,
        )

    def _started_at(self, process: ProcessLike | psutil.Process) -> str | None:
        try:
            created = process.create_time() if isinstance(process, psutil.Process) else psutil.Process(process.pid).create_time()
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            return None
        return datetime.fromtimestamp(created, UTC).isoformat()

    def _response(
        self,
        *,
        status: JarvisStatus,
        connected: bool,
        managed: bool,
        pid: int | None = None,
        started_at: str | None = None,
        message: str | None = None,
    ) -> dict[str, object]:
        runtime_seconds: int | None = None
        if started_at is not None:
            runtime_seconds = max(0, int(datetime.now(UTC).timestamp() - datetime.fromisoformat(started_at).timestamp()))
        return {
            "status": status,
            "connected": connected,
            "managed": managed,
            "pid": pid,
            "started_at": started_at,
            "runtime_seconds": runtime_seconds,
            "logs": list(self._logs),
            "message": self._message if message is None else message,
            "last_user_text": self._last_user_text,
            "last_response": self._last_response,
        }

    def _stop_process(self, process: ProcessLike | psutil.Process) -> None:
        try:
            process.send_signal(signal.CTRL_BREAK_EVENT)
        except (AttributeError, OSError, psutil.Error):
            pass
        if self._wait_for_exit(process, 5):
            return
        try:
            process.terminate()
        except (OSError, psutil.Error):
            pass
        if self._wait_for_exit(process, 3):
            return
        try:
            process.kill()
        except (OSError, psutil.Error):
            pass
        if not self._wait_for_exit(process, 2):
            raise JarvisControlError("Jarvis konnte nicht kontrolliert beendet werden.", 503)

    @staticmethod
    def _wait_for_exit(process: ProcessLike | psutil.Process, timeout: float) -> bool:
        try:
            process.wait(timeout=timeout)
            return True
        except (subprocess.TimeoutExpired, psutil.TimeoutExpired):
            return False

    def _save_record(self, pid: int) -> None:
        self._runtime_directory.mkdir(parents=True, exist_ok=True)
        try:
            created = psutil.Process(pid).create_time()
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            created = time.time()
        temporary = self._record_path.with_suffix(".tmp")
        temporary.write_text(json.dumps({"pid": pid, "created": created}), encoding="utf-8")
        os.replace(temporary, self._record_path)

    def _load_record(self) -> dict[str, object] | None:
        try:
            raw = json.loads(self._record_path.read_text(encoding="utf-8"))
        except (OSError, ValueError, json.JSONDecodeError):
            return None
        return raw if isinstance(raw, dict) else None

    def _remove_record(self) -> None:
        try:
            self._record_path.unlink()
        except FileNotFoundError:
            pass


jarvis_adapter = ManagedJarvisAdapter()
