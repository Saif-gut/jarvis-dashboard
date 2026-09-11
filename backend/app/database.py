from __future__ import annotations

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path


def data_directory() -> Path:
    configured = os.getenv("JARVIS_DATA_DIR")
    path = Path(configured) if configured else Path(__file__).resolve().parent.parent / "data"
    path.mkdir(parents=True, exist_ok=True)
    return path


def database_path() -> Path:
    return data_directory() / "jarvis.db"


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    database = sqlite3.connect(database_path(), timeout=5)
    database.row_factory = sqlite3.Row
    database.execute("PRAGMA foreign_keys = ON")
    try:
        yield database
        database.commit()
    except Exception:
        database.rollback()
        raise
    finally:
        database.close()


def initialize_database() -> None:
    with connection() as database:
        database.executescript(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
                completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0, 1)),
                due_date TEXT,
                priority TEXT NOT NULL DEFAULT 'mittel' CHECK(priority IN ('niedrig', 'mittel', 'hoch')),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 200),
                content TEXT NOT NULL DEFAULT '' CHECK(length(content) <= 10000),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
