from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Priority = Literal["niedrig", "mittel", "hoch"]
JarvisRuntimeState = Literal[
    "nicht_verbunden", "bereit", "hoert_zu", "verarbeitet", "spricht", "gestoppt", "fehler"
]


class JarvisRuntimeResponse(BaseModel):
    status: JarvisRuntimeState
    connected: bool
    managed: bool
    pid: int | None = None
    started_at: datetime | None = None
    runtime_seconds: int | None = None
    logs: list[str] = Field(default_factory=list, max_length=120)
    message: str | None = Field(default=None, max_length=1000)
    last_user_text: str | None = Field(default=None, max_length=2000)
    last_response: str | None = Field(default=None, max_length=8000)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    due_date: date | None = None
    priority: Priority = "mittel"

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Der Aufgabentitel darf nicht leer sein.")
        return cleaned


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    completed: bool | None = None
    due_date: date | None = None
    priority: Priority | None = None

    @field_validator("title")
    @classmethod
    def clean_optional_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Der Aufgabentitel darf nicht leer sein.")
        return cleaned


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    completed: bool
    due_date: date | None
    priority: Priority
    created_at: datetime
    updated_at: datetime


class NoteCreate(BaseModel):
    title: str = Field(default="Neue Notiz", min_length=1, max_length=200)
    content: str = Field(default="", max_length=10000)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Der Notiztitel darf nicht leer sein.")
        return cleaned


class NoteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=10000)

    @field_validator("title")
    @classmethod
    def clean_optional_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Der Notiztitel darf nicht leer sein.")
        return cleaned


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
