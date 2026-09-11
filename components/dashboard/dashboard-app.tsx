'use client';

import {
  Bot,
  CheckSquare2,
  CloudSun,
  Gauge,
  LayoutDashboard,
  Menu,
  NotebookPen,
  Settings,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import type {
  MetricPoint,
  NoteItem,
  SystemMetrics,
  TaskDraft,
  TaskItem,
  WeatherData,
} from '@/lib/dashboard-types';
import { getGreeting, limitMetricHistory } from '@/lib/dashboard-utils';
import { JarvisView } from './jarvis-view';
import { NotesView } from './notes-view';
import { OverviewView } from './overview-view';
import { SettingsView } from './settings-view';
import { SystemView } from './system-view';
import { TasksView } from './tasks-view';
import { WeatherView } from './weather-view';

type View =
  | 'overview'
  | 'system'
  | 'tasks'
  | 'notes'
  | 'weather'
  | 'jarvis'
  | 'settings';
const navItems = [
  { id: 'overview' as const, label: 'Übersicht', icon: LayoutDashboard },
  { id: 'system' as const, label: 'System', icon: Gauge },
  { id: 'tasks' as const, label: 'Aufgaben', icon: CheckSquare2 },
  { id: 'notes' as const, label: 'Notizen', icon: NotebookPen },
  { id: 'weather' as const, label: 'Wetter', icon: CloudSun },
  { id: 'jarvis' as const, label: 'Jarvis', icon: Bot },
  { id: 'settings' as const, label: 'Einstellungen', icon: Settings },
];

function messageOf(error: unknown): string {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Unbekannter Fehler';
}

export function DashboardApp() {
  const [view, setView] = useState<View>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<MetricPoint[]>([]);
  const [systemLoading, setSystemLoading] = useState(true);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState<string | null>(null);
  const closeMobileNavigation = useCallback(() => setMobileOpen(false), []);

  const loadSystem = useCallback(async () => {
    setSystemLoading(true);
    try {
      const next = await api.system();
      setMetrics(next);
      setHistory((current) =>
        limitMetricHistory(current, {
          time: new Date(next.last_updated).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          cpu: next.cpu_percent,
          ram: next.memory_percent,
        }),
      );
      setSystemError(null);
    } catch (error) {
      setSystemError(messageOf(error));
    } finally {
      setSystemLoading(false);
    }
  }, []);

  const loadWeather = useCallback(async () => {
    setWeatherLoading(true);
    try {
      setWeather(await api.weather());
      setWeatherError(null);
    } catch (error) {
      setWeatherError(messageOf(error));
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      setTasks(await api.tasks());
      setTasksError(null);
    } catch (error) {
      setTasksError(messageOf(error));
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    try {
      setNotes(await api.notes());
      setNotesError(null);
    } catch (error) {
      setNotesError(messageOf(error));
    } finally {
      setNotesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSystem();
    void loadWeather();
    void loadTasks();
    void loadNotes();
    const interval = window.setInterval(() => void loadSystem(), 5000);
    return () => window.clearInterval(interval);
  }, [loadSystem, loadWeather, loadTasks, loadNotes]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileNavigation();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeMobileNavigation, mobileOpen]);

  const createTask = async (draft: TaskDraft) => {
    try {
      const task = await api.createTask(draft);
      setTasks((items) => [task, ...items]);
      setTasksError(null);
    } catch (error) {
      setTasksError(messageOf(error));
      throw error;
    }
  };
  const updateTask = async (id: number, draft: TaskDraft) => {
    try {
      const task = await api.updateTask(id, {
        ...draft,
        due_date: draft.due_date || null,
      });
      setTasks((items) => items.map((item) => (item.id === id ? task : item)));
      setTasksError(null);
    } catch (error) {
      setTasksError(messageOf(error));
      throw error;
    }
  };
  const toggleTask = async (task: TaskItem) => {
    try {
      const updated = await api.updateTask(task.id, {
        completed: !task.completed,
      });
      setTasks((items) =>
        items.map((item) => (item.id === task.id ? updated : item)),
      );
    } catch (error) {
      setTasksError(messageOf(error));
    }
  };
  const deleteTask = async (task: TaskItem) => {
    if (!window.confirm(`Aufgabe „${task.title}“ wirklich löschen?`)) return;
    try {
      await api.deleteTask(task.id);
      setTasks((items) => items.filter((item) => item.id !== task.id));
    } catch (error) {
      setTasksError(messageOf(error));
    }
  };
  const createNote = async () => {
    try {
      const note = await api.createNote();
      setNotes((items) => [note, ...items]);
      setNotesError(null);
      return note;
    } catch (error) {
      setNotesError(messageOf(error));
      throw error;
    }
  };
  const saveNote = useCallback(
    async (id: number, title: string, content: string) => {
      try {
        const note = await api.updateNote(id, { title, content });
        setNotes((items) =>
          items.map((item) => (item.id === id ? note : item)),
        );
        setNotesError(null);
      } catch (error) {
        setNotesError(messageOf(error));
        throw error;
      }
    },
    [],
  );
  const deleteNote = async (note: NoteItem) => {
    if (!window.confirm(`Notiz „${note.title}“ wirklich löschen?`)) return;
    try {
      await api.deleteNote(note.id);
      setNotes((items) => items.filter((item) => item.id !== note.id));
    } catch (error) {
      setNotesError(messageOf(error));
    }
  };

  const backendConnected = metrics !== null && systemError === null;
  const navigate = (next: View) => {
    setView(next);
    closeMobileNavigation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const systemProps = {
    metrics,
    history,
    loading: systemLoading,
    error: systemError,
    onRefresh: () => void loadSystem(),
  };
  const weatherProps = {
    weather,
    loading: weatherLoading,
    error: weatherError,
    onRefresh: () => void loadWeather(),
  };
  const dashboardHeader = (
    <header className="topbar">
      <div className="title-row">
        <Button
          className="mobile-menu"
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Navigation öffnen"
          aria-controls="dashboard-navigation"
          aria-expanded={mobileOpen}
        >
          <Menu />
        </Button>
        <div>
          <p className="eyebrow">PERSÖNLICHES KONTROLLZENTRUM</p>
          <h1>{getGreeting(new Date().getHours())}, Saif</h1>
          <p className="subtitle">
            Alles Wichtige auf deinem Computer an einem ruhigen Ort.
          </p>
        </div>
      </div>
      <Badge
        variant="outline"
        className={
          backendConnected ? 'connection-badge online' : 'connection-badge'
        }
      >
        <span
          className={
            backendConnected ? 'status-dot online' : 'status-dot warning'
          }
        />{' '}
        {backendConnected ? 'Backend verbunden' : 'Backend nicht verbunden'}
      </Badge>
    </header>
  );

  return (
    <main className="dashboard-shell">
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          onClick={closeMobileNavigation}
          aria-label="Navigation schließen"
        />
      )}
      <aside
        id="dashboard-navigation"
        className={mobileOpen ? 'sidebar mobile-open' : 'sidebar'}
        aria-label="Dashboard-Navigation"
      >
        <div className="brand-mark">
          <span>J</span>
          <div>
            <strong>JARVIS</strong>
            <small>CONTROL OS</small>
          </div>
          <button
            className="mobile-close"
            onClick={closeMobileNavigation}
            aria-label="Navigation schließen"
          >
            <X />
          </button>
        </div>
        <nav aria-label="Hauptnavigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              className={view === id ? 'nav-item active' : 'nav-item'}
              key={id}
              type="button"
              onClick={() => navigate(id)}
              aria-current={view === id ? 'page' : undefined}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-status">
          <span
            className={
              backendConnected ? 'status-dot online' : 'status-dot warning'
            }
          />
          <div>
            <strong>
              {backendConnected ? 'Backend verbunden' : 'Backend offline'}
            </strong>
            <small>
              {backendConnected
                ? 'Lokale API ist erreichbar'
                : 'Lokale API nicht verbunden'}
            </small>
          </div>
        </div>
      </aside>
      <section className="workspace">
        {view === 'overview' && (
          <OverviewView
            metrics={metrics}
            history={history}
            systemLoading={systemLoading}
            systemError={systemError}
            onSystemRefresh={() => void loadSystem()}
            weather={weather}
            weatherLoading={weatherLoading}
            weatherError={weatherError}
            tasks={tasks}
            notes={notes}
            backendConnected={backendConnected}
            mobileOpen={mobileOpen}
            onOpenNavigation={() => setMobileOpen(true)}
            onNavigate={navigate}
          />
        )}
        {view !== 'overview' && dashboardHeader}
        {view === 'system' && <SystemView {...systemProps} />}
        {view === 'tasks' && (
          <TasksView
            tasks={tasks}
            loading={tasksLoading}
            error={tasksError}
            onCreate={createTask}
            onUpdate={updateTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        )}
        {view === 'notes' && (
          <NotesView
            notes={notes}
            loading={notesLoading}
            error={notesError}
            onCreate={createNote}
            onSave={saveNote}
            onDelete={deleteNote}
          />
        )}
        {view === 'weather' && <WeatherView {...weatherProps} />}
        {view === 'jarvis' && <JarvisView />}
        {view === 'settings' && <SettingsView />}
      </section>
    </main>
  );
}
