import type {
  JarvisRuntime,
  NoteItem,
  Priority,
  SystemMetrics,
  TaskDraft,
  TaskItem,
  WeatherData,
} from './dashboard-types';

const API_BASE = 'http://127.0.0.1:8000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 7000);
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    if (!response.ok) {
      let message = `Anfrage fehlgeschlagen (${response.status})`;
      try {
        const body = (await response.json()) as { detail?: string };
        if (body.detail) message = body.detail;
      } catch {
        // A response body is optional for failures.
      }
      throw new ApiError(message, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError')
      throw new ApiError('Die lokale API antwortet nicht rechtzeitig.');
    throw new ApiError('Backend nicht verbunden');
  } finally {
    window.clearTimeout(timeout);
  }
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  system: () => request<SystemMetrics>('/system'),
  weather: () => request<WeatherData>('/weather'),
  jarvisStatus: () => request<JarvisRuntime>('/jarvis/status'),
  startJarvis: () =>
    request<JarvisRuntime>('/jarvis/start', { method: 'POST' }),
  stopJarvis: () => request<JarvisRuntime>('/jarvis/stop', { method: 'POST' }),
  restartJarvis: () =>
    request<JarvisRuntime>('/jarvis/restart', { method: 'POST' }),
  tasks: () => request<TaskItem[]>('/tasks'),
  createTask: (draft: TaskDraft) =>
    request<TaskItem>('/tasks', {
      method: 'POST',
      body: JSON.stringify({ ...draft, due_date: draft.due_date || null }),
    }),
  updateTask: (
    id: number,
    updates: Partial<{
      title: string;
      due_date: string | null;
      priority: Priority;
      completed: boolean;
    }>,
  ) =>
    request<TaskItem>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteTask: (id: number) =>
    request<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  notes: () => request<NoteItem[]>('/notes'),
  createNote: () =>
    request<NoteItem>('/notes', {
      method: 'POST',
      body: JSON.stringify({ title: 'Neue Notiz', content: '' }),
    }),
  updateNote: (id: number, updates: Pick<NoteItem, 'title' | 'content'>) =>
    request<NoteItem>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteNote: (id: number) =>
    request<{ ok: boolean }>(`/notes/${id}`, { method: 'DELETE' }),
};

export { API_BASE };
