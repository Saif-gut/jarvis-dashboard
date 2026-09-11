from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import UTC, datetime

import httpx
from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .database import connection, initialize_database
from .schemas import JarvisRuntimeResponse, NoteCreate, NoteResponse, NoteUpdate, TaskCreate, TaskResponse, TaskUpdate
from .services.jarvis_adapter import JarvisControlError, jarvis_adapter
from .services.system_service import read_system_metrics
from .services.weather_service import read_weather


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Jarvis Dashboard API",
    description="Ausschließlich lokal gedachte API für das persönliche IT-Dashboard.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["127.0.0.1", "localhost", "testserver"])
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def now_iso() -> str:
    return datetime.now(UTC).isoformat()


def row_or_404(table: str, item_id: int):
    if table not in {"tasks", "notes"}:
        raise ValueError("Ungültige Tabelle")
    with connection() as database:
        row = database.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden.")
    return dict(row)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/system")
def system_metrics() -> dict[str, object]:
    return read_system_metrics()


@app.get("/api/weather")
async def weather() -> dict[str, object]:
    try:
        return await read_weather()
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        raise HTTPException(status_code=503, detail="Wetterdaten sind derzeit nicht verfügbar. Bitte später erneut versuchen.") from None


def jarvis_response(action: str) -> dict[str, object]:
    try:
        if action == "start":
            return jarvis_adapter.start()
        if action == "stop":
            return jarvis_adapter.stop()
        if action == "restart":
            return jarvis_adapter.restart()
        raise ValueError("Unbekannte Jarvis-Aktion")
    except JarvisControlError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@app.get("/api/jarvis/status", response_model=JarvisRuntimeResponse)
def jarvis_status() -> dict[str, object]:
    return jarvis_adapter.snapshot()


@app.post("/api/jarvis/start", response_model=JarvisRuntimeResponse)
def start_jarvis() -> dict[str, object]:
    return jarvis_response("start")


@app.post("/api/jarvis/stop", response_model=JarvisRuntimeResponse)
def stop_jarvis() -> dict[str, object]:
    return jarvis_response("stop")


@app.post("/api/jarvis/restart", response_model=JarvisRuntimeResponse)
def restart_jarvis() -> dict[str, object]:
    return jarvis_response("restart")


@app.get("/api/tasks", response_model=list[TaskResponse])
def list_tasks():
    with connection() as database:
        rows = database.execute("SELECT * FROM tasks ORDER BY completed ASC, updated_at DESC").fetchall()
    return [dict(row) for row in rows]


@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate):
    timestamp = now_iso()
    with connection() as database:
        cursor = database.execute(
            "INSERT INTO tasks (title, completed, due_date, priority, created_at, updated_at) VALUES (?, 0, ?, ?, ?, ?)",
            (payload.title, payload.due_date.isoformat() if payload.due_date else None, payload.priority, timestamp, timestamp),
        )
        task_id = cursor.lastrowid
    return row_or_404("tasks", int(task_id))


@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, payload: TaskUpdate):
    current = row_or_404("tasks", task_id)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return current
    title = changes.get("title", current["title"])
    completed = int(changes.get("completed", bool(current["completed"])))
    due_value = changes.get("due_date", current["due_date"])
    due_date = due_value.isoformat() if hasattr(due_value, "isoformat") else due_value
    priority = changes.get("priority", current["priority"])
    with connection() as database:
        database.execute("UPDATE tasks SET title = ?, completed = ?, due_date = ?, priority = ?, updated_at = ? WHERE id = ?", (title, completed, due_date, priority, now_iso(), task_id))
    return row_or_404("tasks", task_id)


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_200_OK)
def delete_task(task_id: int) -> dict[str, bool]:
    row_or_404("tasks", task_id)
    with connection() as database:
        database.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    return {"ok": True}


@app.get("/api/notes", response_model=list[NoteResponse])
def list_notes():
    with connection() as database:
        rows = database.execute("SELECT * FROM notes ORDER BY updated_at DESC").fetchall()
    return [dict(row) for row in rows]


@app.post("/api/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(payload: NoteCreate):
    timestamp = now_iso()
    with connection() as database:
        cursor = database.execute("INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)", (payload.title, payload.content, timestamp, timestamp))
        note_id = cursor.lastrowid
    return row_or_404("notes", int(note_id))


@app.patch("/api/notes/{note_id}", response_model=NoteResponse)
def update_note(note_id: int, payload: NoteUpdate):
    current = row_or_404("notes", note_id)
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return current
    title = changes.get("title", current["title"])
    content = changes.get("content", current["content"])
    with connection() as database:
        database.execute("UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?", (title, content, now_iso(), note_id))
    return row_or_404("notes", note_id)


@app.delete("/api/notes/{note_id}", status_code=status.HTTP_200_OK)
def delete_note(note_id: int) -> dict[str, bool]:
    row_or_404("notes", note_id)
    with connection() as database:
        database.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    return {"ok": True}
