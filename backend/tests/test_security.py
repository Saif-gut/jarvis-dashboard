def test_input_validation_rejects_empty_and_invalid_values(client):
    assert client.post("/api/tasks", json={"title": "   ", "priority": "hoch"}).status_code == 422
    assert client.post("/api/tasks", json={"title": "Test", "priority": "kritisch"}).status_code == 422
    assert client.post("/api/notes", json={"title": "N", "content": "x" * 10001}).status_code == 422


def test_no_command_or_process_endpoints_exist(client):
    for path in ("/api/shell", "/api/command", "/api/processes/1/kill", "/api/files/delete"):
        assert client.post(path, json={"command": "whoami"}).status_code == 404


def test_untrusted_hosts_and_origins_are_not_allowed(client):
    assert client.get("/api/health", headers={"host": "evil.example"}).status_code == 400
    response = client.options(
        "/api/tasks",
        headers={"origin": "https://evil.example", "access-control-request-method": "POST"},
    )
    assert response.status_code == 400
    assert response.headers.get("access-control-allow-origin") is None
