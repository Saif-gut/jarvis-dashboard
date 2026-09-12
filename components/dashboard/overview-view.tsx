'use client';

import {
  CalendarDays,
  Check,
  CheckSquare2,
  ChevronRight,
  Cloud,
  CloudRain,
  CloudSun,
  Cpu,
  Droplets,
  FileText,
  HardDrive,
  MemoryStick,
  Menu,
  NotebookPen,
  RefreshCw,
  Sun,
  Wind,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import type {
  MetricPoint,
  NoteItem,
  SystemMetrics,
  TaskItem,
  WeatherData,
} from '@/lib/dashboard-types';
import {
  formatBytes,
  formatDate,
  formatDateTime,
  getGreeting,
} from '@/lib/dashboard-utils';
import { JarvisView } from './jarvis-view';

const chartConfig = {
  cpu: { label: 'CPU', color: '#43eaff' },
  ram: { label: 'RAM', color: '#9a69ff' },
} satisfies ChartConfig;

interface OverviewViewProps {
  metrics: SystemMetrics | null;
  history: MetricPoint[];
  systemLoading: boolean;
  systemError: string | null;
  onSystemRefresh: () => void;
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  tasks: TaskItem[];
  notes: NoteItem[];
  backendConnected: boolean;
  mobileOpen: boolean;
  onOpenNavigation: () => void;
  onNavigate: (view: 'tasks' | 'notes' | 'weather') => void;
}

function WeatherIcon({ code }: { code: number }) {
  const Icon =
    code <= 1 ? Sun : code <= 3 ? CloudSun : code >= 51 ? CloudRain : Cloud;
  return <Icon aria-hidden="true" />;
}

function OverviewWeather({
  weather,
  loading,
  error,
  onOpen,
}: {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  onOpen: () => void;
}) {
  if (!weather) {
    return (
      <article className="overview-module overview-weather-module">
        <header className="overview-module-head">
          <div>
            <p className="eyebrow">WETTER</p>
            <h2>Berlin · 10115</h2>
          </div>
        </header>
        <div className="overview-module-empty">
          <CloudRain aria-hidden="true" />
          <strong>
            {loading ? 'Wetter wird geladen' : 'Wetter nicht verfügbar'}
          </strong>
          <span>{error ?? 'Die lokale API fragt Open-Meteo ab.'}</span>
        </div>
        <button className="overview-module-link" type="button" onClick={onOpen}>
          Wetter öffnen <ChevronRight />
        </button>
      </article>
    );
  }

  return (
    <article className="overview-module overview-weather-module">
      <header className="overview-module-head">
        <div>
          <p className="eyebrow">WETTER</p>
          <h2>
            {weather.location.name} · {weather.location.postal_code}
          </h2>
        </div>
        <span className="weather-updated">
          Stand{' '}
          {new Date(weather.last_updated).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </header>
      <div className="overview-weather-current">
        <div className="overview-weather-glyph">
          <WeatherIcon code={weather.current.weather_code} />
        </div>
        <div>
          <strong>{Math.round(weather.current.temperature)}°</strong>
          <span>{weather.current.description}</span>
        </div>
      </div>
      <div className="overview-weather-facts">
        <span>
          <CloudSun />
          Gefühlt
          <strong>{Math.round(weather.current.apparent_temperature)}°</strong>
        </span>
        <span>
          <Wind />
          Wind<strong>{Math.round(weather.current.wind_speed)} km/h</strong>
        </span>
        <span>
          <Droplets />
          Regen<strong>{weather.current.precipitation_probability}%</strong>
        </span>
      </div>
      <div className="overview-forecast-block">
        <h3>Nächste Stunden</h3>
        <div className="overview-hourly-list">
          {weather.next_hours.slice(0, 5).map((hour) => (
            <div key={hour.time}>
              <time>
                {new Date(hour.time).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
              <WeatherIcon code={hour.weather_code} />
              <strong>{Math.round(hour.temperature)}°</strong>
              <small>
                <Droplets />
                {hour.precipitation_probability}%
              </small>
            </div>
          ))}
        </div>
      </div>
      <div className="overview-tomorrow">
        <div>
          <span>MORGEN · {formatDate(weather.tomorrow.date)}</span>
          <strong>{weather.tomorrow.description}</strong>
        </div>
        <WeatherIcon code={weather.tomorrow.weather_code} />
        <div className="tomorrow-values">
          <strong>{Math.round(weather.tomorrow.temperature_max)}°</strong>
          <span>{Math.round(weather.tomorrow.temperature_min)}°</span>
          <small>
            <Droplets /> {weather.tomorrow.precipitation_probability}%
          </small>
        </div>
      </div>
      <button className="overview-module-link" type="button" onClick={onOpen}>
        Vollständige Vorhersage <ChevronRight />
      </button>
    </article>
  );
}

function OverviewTasks({
  tasks,
  onOpen,
}: {
  tasks: TaskItem[];
  onOpen: () => void;
}) {
  const openTasks = tasks.filter((task) => !task.completed).slice(0, 5);
  return (
    <article className="overview-module overview-list-module">
      <header className="overview-module-head">
        <div>
          <p className="eyebrow">AUFGABEN</p>
          <h2>
            {openTasks.length === 1
              ? '1 offene Aufgabe'
              : `${tasks.filter((task) => !task.completed).length} offene Aufgaben`}
          </h2>
        </div>
        <span className="module-count">{tasks.length}</span>
      </header>
      {openTasks.length ? (
        <div className="overview-item-list">
          {openTasks.map((task) => (
            <div className="overview-task-item" key={task.id}>
              <span className="task-state">
                <Check />
              </span>
              <div>
                <strong>{task.title}</strong>
                <span>
                  {task.due_date ? (
                    <>
                      <CalendarDays />
                      Fällig {formatDate(task.due_date)}
                    </>
                  ) : (
                    'Ohne Fälligkeitsdatum'
                  )}
                </span>
              </div>
              <small className={`priority-${task.priority}`}>
                {task.priority}
              </small>
            </div>
          ))}
        </div>
      ) : (
        <div className="overview-module-empty compact">
          <CheckSquare2 />
          <strong>Alles erledigt</strong>
          <span>Aktuell sind keine Aufgaben offen.</span>
        </div>
      )}
      <button className="overview-module-link" type="button" onClick={onOpen}>
        Alle Aufgaben anzeigen <ChevronRight />
      </button>
    </article>
  );
}

function OverviewNotes({
  notes,
  onOpen,
}: {
  notes: NoteItem[];
  onOpen: () => void;
}) {
  return (
    <article className="overview-module overview-list-module">
      <header className="overview-module-head">
        <div>
          <p className="eyebrow">NOTIZEN</p>
          <h2>{notes.length === 1 ? '1 Notiz' : `${notes.length} Notizen`}</h2>
        </div>
        <span className="module-count">{notes.length}</span>
      </header>
      {notes.length ? (
        <div className="overview-item-list">
          {notes.slice(0, 5).map((note) => (
            <div className="overview-note-item" key={note.id}>
              <span className="note-symbol">
                <FileText />
              </span>
              <div>
                <strong>{note.title || 'Ohne Titel'}</strong>
                <p>{note.content.trim() || 'Leere Notiz'}</p>
                <time>Geändert {formatDateTime(note.updated_at)}</time>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overview-module-empty compact">
          <NotebookPen />
          <strong>Noch keine Notizen</strong>
          <span>Gedanken und Informationen erscheinen hier.</span>
        </div>
      )}
      <button className="overview-module-link" type="button" onClick={onOpen}>
        Alle Notizen anzeigen <ChevronRight />
      </button>
    </article>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const source =
    values.length > 1
      ? values.slice(-12)
      : values.length === 1
        ? [values[0], values[0]]
        : [];
  if (!source.length) {
    return <span className="overview-sparkline-empty">Keine Daten</span>;
  }
  const points = source
    .map((value, index) => {
      const x = (index / Math.max(source.length - 1, 1)) * 100;
      const y = 31 - (Math.min(100, Math.max(0, value)) / 100) * 27;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className="overview-sparkline" viewBox="0 0 100 34" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

function HeroMetric({
  label,
  value,
  detail,
  icon: Icon,
  history,
  tone = 'cyan',
}: {
  label: string;
  value: number | null;
  detail: string;
  icon: typeof Cpu;
  history: number[];
  tone?: 'cyan' | 'violet';
}) {
  return (
    <article className={`overview-metric ${tone}`}>
      <div className="overview-metric-main">
        <span className="overview-metric-icon">
          <Icon aria-hidden="true" />
        </span>
        <div>
          <span className="overview-metric-label">{label}</span>
          <strong>{value === null ? '—' : `${Math.round(value)}%`}</strong>
        </div>
        <Sparkline values={history} />
      </div>
      <Progress
        value={value ?? 0}
        aria-label={`${label}: ${value === null ? 'nicht verfügbar' : `${Math.round(value)} Prozent`}`}
      />
      <small>{detail}</small>
    </article>
  );
}

function OverviewHistory({
  history,
  loading,
  error,
  onRefresh,
}: {
  history: MetricPoint[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  return (
    <section
      className="overview-history"
      aria-labelledby="overview-history-heading"
    >
      <header className="overview-history-head">
        <div>
          <p className="eyebrow">LIVE-MONITORING</p>
          <h2 id="overview-history-heading">CPU &amp; RAM Verlauf</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Systemwerte aktualisieren"
        >
          <RefreshCw className={loading ? 'spin' : ''} />
          Letzte {history.length} Messwerte
        </Button>
      </header>
      {history.length > 1 ? (
        <ChartContainer
          config={chartConfig}
          className="overview-history-chart"
          initialDimension={{ width: 1120, height: 230 }}
        >
          <LineChart
            data={history}
            accessibilityLayer
            margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
          >
            <CartesianGrid stroke="rgba(114,172,210,.09)" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={52}
              tickFormatter={(value: string) => value.slice(0, 5)}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickCount={5}
              tickFormatter={(value) => `${value}%`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="cpu"
              stroke="var(--color-cpu)"
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="ram"
              stroke="var(--color-ram)"
              strokeWidth={2.2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <div className="overview-history-empty">
          <span className="history-pulse" />
          <p>
            {error
              ? 'Das Diagramm wartet auf die lokale API.'
              : 'Sobald zwei Messwerte vorliegen, wird der Verlauf sichtbar.'}
          </p>
        </div>
      )}
    </section>
  );
}

export function OverviewView({
  metrics,
  history,
  systemLoading,
  systemError,
  onSystemRefresh,
  weather,
  weatherLoading,
  weatherError,
  tasks,
  notes,
  backendConnected,
  mobileOpen,
  onOpenNavigation,
  onNavigate,
}: OverviewViewProps) {
  const cpuHistory = history.map((point) => point.cpu);
  const ramHistory = history.map((point) => point.ram);
  const diskHistory = metrics
    ? [metrics.disk_percent, metrics.disk_percent]
    : [];
  const cpuDetail = metrics
    ? `${metrics.cpu_cores_physical ?? '—'} physische · ${metrics.cpu_cores_logical} logische Kerne`
    : 'Warte auf echte Messwerte';
  const ramDetail = metrics
    ? `${formatBytes(metrics.memory_used)} von ${formatBytes(metrics.memory_total)}`
    : 'Warte auf echte Messwerte';
  const diskDetail = metrics
    ? `${formatBytes(metrics.disk_used)} von ${formatBytes(metrics.disk_total)}`
    : 'Warte auf echte Messwerte';

  return (
    <div className="overview-page">
      <section className="overview-hero" aria-labelledby="overview-title">
        <Badge
          variant="outline"
          className={
            backendConnected
              ? 'connection-badge online overview-connection'
              : 'connection-badge overview-connection'
          }
        >
          <span
            className={
              backendConnected ? 'status-dot online' : 'status-dot warning'
            }
          />
          {backendConnected ? 'Backend verbunden' : 'Backend nicht verbunden'}
        </Badge>

        <header className="overview-intro">
          <div className="title-row">
            <Button
              className="mobile-menu"
              variant="ghost"
              size="icon"
              onClick={onOpenNavigation}
              aria-label="Navigation öffnen"
              aria-controls="dashboard-navigation"
              aria-expanded={mobileOpen}
            >
              <Menu />
            </Button>
            <div>
              <p className="eyebrow">PERSÖNLICHES KONTROLLZENTRUM</p>
              <h1 id="overview-title">
                {getGreeting(new Date().getHours())}
              </h1>
              <p className="subtitle">
                Alles Wichtige auf deinem Computer an einem ruhigen Ort.
              </p>
            </div>
          </div>
          <blockquote>
            „Disziplin erschafft die Freiheit,
            <br /> die du morgen lebst.“
          </blockquote>
          <span className="overview-intro-line" aria-hidden="true" />
        </header>

        <JarvisView compact />

        <section className="overview-metrics" aria-label="Systemstatus">
          {systemError && (
            <output className="overview-metrics-error">
              <span className="status-dot warning" /> Lokale API offline
            </output>
          )}
          <HeroMetric
            icon={Cpu}
            label="CPU-Auslastung"
            value={metrics?.cpu_percent ?? null}
            detail={cpuDetail}
            history={cpuHistory}
          />
          <HeroMetric
            icon={MemoryStick}
            label="RAM-Auslastung"
            value={metrics?.memory_percent ?? null}
            detail={ramDetail}
            history={ramHistory}
            tone="violet"
          />
          <HeroMetric
            icon={HardDrive}
            label="Speicher belegt"
            value={metrics?.disk_percent ?? null}
            detail={diskDetail}
            history={diskHistory}
          />
        </section>
      </section>

      <OverviewHistory
        history={history}
        loading={systemLoading}
        error={systemError}
        onRefresh={onSystemRefresh}
      />

      <section
        className="overview-modules"
        aria-label="Wetter, Aufgaben und Notizen"
      >
        <OverviewWeather
          weather={weather}
          loading={weatherLoading}
          error={weatherError}
          onOpen={() => onNavigate('weather')}
        />
        <OverviewTasks tasks={tasks} onOpen={() => onNavigate('tasks')} />
        <OverviewNotes notes={notes} onOpen={() => onNavigate('notes')} />
      </section>
    </div>
  );
}
