def test_health_and_real_system_metrics(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    response = client.get("/api/system")
    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["cpu_percent"] <= 100
    assert 0 <= data["memory_percent"] <= 100
    assert data["hostname"]
    assert data["disk_total"] > 0


def test_task_lifecycle(client):
    created = client.post("/api/tasks", json={"title": "  Backup prüfen  ", "priority": "hoch", "due_date": "2026-09-01"})
    assert created.status_code == 201
    task = created.json()
    assert task["title"] == "Backup prüfen"
    updated = client.patch(f"/api/tasks/{task['id']}", json={"completed": True, "title": "Backup geprüft"})
    assert updated.status_code == 200
    assert updated.json()["completed"] is True
    assert len(client.get("/api/tasks").json()) == 1
    assert client.delete(f"/api/tasks/{task['id']}").json() == {"ok": True}
    assert client.get("/api/tasks").json() == []


def test_note_lifecycle(client):
    created = client.post("/api/notes", json={"title": "Idee", "content": "Lokale API"})
    assert created.status_code == 201
    note = created.json()
    changed = client.patch(f"/api/notes/{note['id']}", json={"content": "Sichere lokale API"})
    assert changed.json()["content"] == "Sichere lokale API"
    assert client.delete(f"/api/notes/{note['id']}").status_code == 200


def test_jarvis_is_deliberately_disconnected(client):
    response = client.get("/api/jarvis/status")
    assert response.status_code == 200
    assert response.json()["status"] == "nicht_verbunden"


def test_jarvis_control_endpoints_are_fixed_actions_only(client, monkeypatch):
    from app import main

    class FakeJarvisAdapter:
        def __init__(self):
            self.actions: list[str] = []

        @staticmethod
        def response(status: str = "gestoppt"):
            return {
                "status": status,
                "connected": status != "gestoppt",
                "managed": status != "gestoppt",
                "pid": 123 if status != "gestoppt" else None,
                "started_at": None,
                "runtime_seconds": None,
                "logs": [],
                "message": None,
                "last_user_text": None,
                "last_response": None,
            }

        def snapshot(self):
            return self.response("gestoppt")

        def start(self):
            self.actions.append("start")
            return self.response("bereit")

        def stop(self):
            self.actions.append("stop")
            return self.response("gestoppt")

        def restart(self):
            self.actions.append("restart")
            return self.response("bereit")

    fake = FakeJarvisAdapter()
    monkeypatch.setattr(main, "jarvis_adapter", fake)

    assert client.post("/api/jarvis/start").json()["status"] == "bereit"
    assert client.post("/api/jarvis/stop").json()["status"] == "gestoppt"
    assert client.post("/api/jarvis/restart").json()["status"] == "bereit"
    assert fake.actions == ["start", "stop", "restart"]
    assert client.post("/api/jarvis/command", json={"command": "whoami"}).status_code == 404


def test_jarvis_api_returns_german_unicode_as_utf8(client, monkeypatch):
    from app import main

    question = "Grüße aus Köln – schön, dass du da bist."
    answer = "dafür persönlich: Präzise Unterstützung. ÄÖÜ äöü ß"

    class UnicodeJarvisAdapter:
        @staticmethod
        def snapshot():
            return {
                "status": "spricht",
                "connected": True,
                "managed": True,
                "pid": 123,
                "started_at": None,
                "runtime_seconds": 1,
                "logs": [f"Frage: {question}", f"Antwort: {answer}"],
                "message": None,
                "last_user_text": question,
                "last_response": answer,
            }

    monkeypatch.setattr(main, "jarvis_adapter", UnicodeJarvisAdapter())

    response = client.get("/api/jarvis/status")

    assert response.status_code == 200
    assert response.content.decode("utf-8")
    assert question.encode("utf-8") in response.content
    assert answer.encode("utf-8") in response.content
    assert response.json()["last_user_text"] == question
    assert response.json()["last_response"] == answer
    assert chr(0xFFFD) not in response.content.decode("utf-8")
