'use client';

import {
  Bot,
  CircleDot,
  LockKeyhole,
  Play,
  RotateCcw,
  Square,
  Terminal,
  Timer,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { api, ApiError } from '@/lib/api';
import type { JarvisRuntime, JarvisStatus } from '@/lib/dashboard-types';
import { JarvisCore } from './jarvis-core';

const states: Array<[JarvisStatus, string]> = [
  ['nicht_verbunden', 'Nicht verbunden'],
  ['bereit', 'Bereit'],
  ['hoert_zu', 'Hört zu'],
  ['verarbeitet', 'Verarbeitet'],
  ['spricht', 'Spricht'],
  ['gestoppt', 'Gestoppt'],
  ['fehler', 'Fehler'],
];

const statusCopy: Record<JarvisStatus, string> = {
  nicht_verbunden: 'Jarvis ist nicht verbunden',
  bereit: 'Jarvis ist bereit',
  hoert_zu: 'Jarvis hört zu',
  verarbeitet: 'Jarvis verarbeitet eine Anfrage',
  spricht: 'Jarvis spricht',
  gestoppt: 'Jarvis wurde gestoppt',
  fehler: 'Jarvis meldet einen Fehler',
};

function formatRuntime(seconds: number | null): string {
  if (seconds === null) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${hours} h ${minutes.toString().padStart(2, '0')} min`
    : `${minutes} min ${remaining.toString().padStart(2, '0')} s`;
}

function messageOf(error: unknown): string {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Die Jarvis-Verbindung ist fehlgeschlagen.';
}

export function JarvisView({ compact = false }: { compact?: boolean }) {
  const [runtime, setRuntime] = useState<JarvisRuntime | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'start' | 'stop' | 'restart' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setRuntime(await api.jarvisStatus());
      setError(null);
    } catch (nextError) {
      setError(messageOf(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadStatus(), 0);
    const interval = window.setInterval(() => void loadStatus(), 3000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [loadStatus]);

  const runAction = async (nextAction: 'start' | 'stop' | 'restart') => {
    setAction(nextAction);
    try {
      const request =
        nextAction === 'start'
          ? api.startJarvis
          : nextAction === 'stop'
            ? api.stopJarvis
            : api.restartJarvis;
      setRuntime(await request());
      setError(null);
    } catch (nextError) {
      setError(messageOf(nextError));
    } finally {
      setAction(null);
    }
  };

  const status = runtime?.status ?? 'nicht_verbunden';
  const controllable = runtime?.managed ?? false;
  const busy = action !== null;
  const canStart = !loading && !runtime?.connected && !busy;
  const canStop = runtime?.connected && controllable && !busy;
  const canRestart = runtime?.connected && controllable && !busy;
  const badgeClass =
    status === 'fehler'
      ? 'connection-badge error'
      : runtime?.connected
        ? 'connection-badge online'
        : 'connection-badge';

  if (compact) {
    return (
      <section
        className={`overview-reactor is-${status}`}
        aria-label={`JARVIS-Reaktor: ${statusCopy[status]}`}
      >
        <div className="reactor-state-pill">
          <span
            className={
              status === 'fehler'
                ? 'status-dot error'
                : runtime?.connected
                  ? 'status-dot online'
                  : 'status-dot warning'
            }
          />
          JARVIS {runtime?.connected ? 'ONLINE' : 'OFFLINE'}
        </div>

        <div className="reactor-stage">
          <div className="reactor-readout left upper" aria-hidden="true">
            <span>ANALYSIERT</span>
            <i />
          </div>
          <JarvisCore status={status} />
          <div className="reactor-readout right upper" aria-hidden="true">
            <i />
            <span>ÜBERWACHT</span>
          </div>
          <div className="reactor-readout left lower" aria-hidden="true">
            <span>OPTIMIERT</span>
            <i />
          </div>
          <div className="reactor-readout right lower" aria-hidden="true">
            <i />
            <span>UNTERSTÜTZT</span>
          </div>
        </div>

        <p className="reactor-companion">IMMER AN DEINER SEITE</p>

        {error && (
          <output className="reactor-error" role="alert">
            <span className="status-dot error" /> {error}
          </output>
        )}

        <div className="reactor-actions" aria-label="Jarvis steuern">
          <Button onClick={() => void runAction('start')} disabled={!canStart}>
            <Play /> {action === 'start' ? 'Startet …' : 'Starten'}
          </Button>
          <Button
            variant="outline"
            onClick={() => void runAction('stop')}
            disabled={!canStop}
          >
            <Square /> {action === 'stop' ? 'Stoppt …' : 'Stoppen'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void runAction('restart')}
            disabled={!canRestart}
          >
            <RotateCcw />
            {action === 'restart' ? 'Startet neu …' : 'Neu starten'}
          </Button>
          <span className="reactor-runtime">
            <Timer aria-hidden="true" />
            {formatRuntime(runtime?.runtime_seconds ?? null)}
          </span>
        </div>

        {runtime?.connected && !controllable && (
          <p className="jarvis-observer">
            Dieser Jarvis-Prozess wird hier nur beobachtet.
          </p>
        )}
      </section>
    );
  }

  return (
    <section aria-labelledby="jarvis-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">LOKALE PROZESSVERBINDUNG</p>
          <h2 id="jarvis-heading">Jarvis</h2>
        </div>
        <Badge variant="outline" className={badgeClass} aria-live="polite">
          <span
            className={
              status === 'fehler'
                ? 'status-dot error'
                : runtime?.connected
                  ? 'status-dot online'
                  : 'status-dot warning'
            }
          />
          {statusCopy[status]}
        </Badge>
      </div>
      {error && (
        <output className="inline-alert" role="alert">
          <span className="status-dot warning" /> {error}
        </output>
      )}
      <Card
        className={
          compact ? 'panel jarvis-console compact' : 'panel jarvis-console'
        }
      >
        <CardHeader>
          <div className="jarvis-orb">
            <Bot aria-hidden="true" />
          </div>
          <CardDescription>ASSISTENTENSTATUS</CardDescription>
          <CardTitle>{statusCopy[status]}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            {runtime?.message ??
              (loading
                ? 'Lokaler Status wird geladen …'
                : 'Jarvis wird ausschließlich nach deiner Bestätigung gestartet.')}
          </p>
          <div className="jarvis-runtime">
            <span>
              <Timer aria-hidden="true" />
              Laufzeit{' '}
              <strong>{formatRuntime(runtime?.runtime_seconds ?? null)}</strong>
            </span>
            {runtime?.pid && (
              <span>
                PID <strong>{runtime.pid}</strong>
              </span>
            )}
          </div>
          <div className="jarvis-actions" aria-label="Jarvis steuern">
            <Button
              onClick={() => void runAction('start')}
              disabled={!canStart}
            >
              <Play /> {action === 'start' ? 'Startet …' : 'Starten'}
            </Button>
            <Button
              variant="outline"
              onClick={() => void runAction('stop')}
              disabled={!canStop}
            >
              <Square /> {action === 'stop' ? 'Stoppt …' : 'Stoppen'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void runAction('restart')}
              disabled={!canRestart}
            >
              <RotateCcw />{' '}
              {action === 'restart' ? 'Startet neu …' : 'Neu starten'}
            </Button>
          </div>
          {runtime?.connected && !controllable && (
            <p className="jarvis-observer">
              Dieser Jarvis-Prozess wurde nicht vom Dashboard gestartet und kann
              hier nur beobachtet werden.
            </p>
          )}
        </CardContent>
      </Card>
      {!compact && (
        <div className="jarvis-details">
          <Card className="panel">
            <CardHeader>
              <CardDescription>AKTUELLER ZUSTAND</CardDescription>
              <CardTitle>Statusmodell</CardTitle>
            </CardHeader>
            <CardContent className="state-list">
              {states.map(([key, label]) => (
                <div key={key} className={key === status ? 'active' : ''}>
                  <CircleDot />
                  <span>{label}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="panel jarvis-log-panel">
            <CardHeader>
              <CardDescription>LETZTE PROTOKOLLE</CardDescription>
              <CardTitle>
                <Terminal /> Lokale Ausgabe
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runtime?.logs.length ? (
                <pre className="jarvis-logs" aria-live="polite">
                  {runtime.logs.join('\n')}
                </pre>
              ) : (
                <p className="empty-copy">
                  Noch keine Protokolle aus einem vom Dashboard gestarteten
                  Jarvis-Prozess.
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="panel">
            <CardHeader>
              <CardDescription>SICHERHEIT</CardDescription>
              <CardTitle>
                <LockKeyhole /> Fest begrenzt
              </CardTitle>
            </CardHeader>
            <CardContent className="security-copy">
              <LockKeyhole />
              <p>
                Das Dashboard kennt nur diesen einen lokalen Jarvis-Pfad. Es
                akzeptiert keine Befehle, Prozess-IDs oder Dateipfade aus dem
                Browser und beendet nur einen selbst gestarteten Prozess.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
