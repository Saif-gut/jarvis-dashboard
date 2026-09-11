'use client';

import {
  Cpu,
  HardDrive,
  MemoryStick,
  MonitorCog,
  RefreshCw,
  Server,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import type { MetricPoint, SystemMetrics } from '@/lib/dashboard-types';
import { formatBytes, formatDateTime } from '@/lib/dashboard-utils';

const chartConfig = {
  cpu: { label: 'CPU', color: '#54e4ff' },
  ram: { label: 'RAM', color: '#8f7cff' },
} satisfies ChartConfig;

interface SystemViewProps {
  metrics: SystemMetrics | null;
  history: MetricPoint[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  compact?: boolean;
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'cyan',
}: {
  label: string;
  value: number | null;
  detail: string;
  icon: typeof Cpu;
  tone?: 'cyan' | 'violet';
}) {
  return (
    <Card className={`metric-card ${tone}`}>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="metric-value">
            {value === null ? '—' : `${Math.round(value)}%`}
          </CardTitle>
        </div>
        <span className="metric-icon">
          <Icon aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <Progress
          value={value ?? 0}
          aria-label={`${label}: ${value === null ? 'nicht verfügbar' : `${Math.round(value)} Prozent`}`}
        />
        <p className="metric-detail">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function SystemView({
  metrics,
  history,
  loading,
  error,
  onRefresh,
  compact = false,
}: SystemViewProps) {
  const diskDetail = metrics
    ? `${formatBytes(metrics.disk_free)} frei von ${formatBytes(metrics.disk_total)}`
    : 'Warte auf echte Messwerte';
  const memoryDetail = metrics
    ? `${formatBytes(metrics.memory_used)} von ${formatBytes(metrics.memory_total)}`
    : 'Warte auf echte Messwerte';

  return (
    <section aria-labelledby="system-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">LIVE-MONITORING</p>
          <h2 id="system-heading">Systemstatus</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Systemwerte aktualisieren"
        >
          <RefreshCw className={loading ? 'spin' : ''} /> Aktualisieren
        </Button>
      </div>
      {error && (
        <output className="inline-alert">
          <span className="status-dot warning" /> {error}
        </output>
      )}
      <div className="metrics-grid">
        <MetricCard
          icon={Cpu}
          label="CPU-Auslastung"
          value={metrics?.cpu_percent ?? null}
          detail={
            metrics
              ? `${metrics.cpu_cores_physical ?? '—'} physische · ${metrics.cpu_cores_logical} logische Kerne`
              : 'Warte auf echte Messwerte'
          }
        />
        <MetricCard
          icon={MemoryStick}
          label="RAM-Auslastung"
          value={metrics?.memory_percent ?? null}
          detail={memoryDetail}
          tone="violet"
        />
        <MetricCard
          icon={HardDrive}
          label="Speicher belegt"
          value={metrics?.disk_percent ?? null}
          detail={diskDetail}
        />
      </div>
      <div className={compact ? 'system-lower compact' : 'system-lower'}>
        <Card className="panel chart-panel">
          <CardHeader>
            <CardDescription>LETZTE {history.length} MESSWERTE</CardDescription>
            <CardTitle>CPU & RAM Verlauf</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length > 1 ? (
              <ChartContainer
                config={chartConfig}
                className="history-chart"
                initialDimension={{ width: 620, height: 240 }}
              >
                <LineChart
                  data={history}
                  accessibilityLayer
                  margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(143,167,202,.1)"
                  />
                  <XAxis
                    dataKey="time"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                    minTickGap={56}
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
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ram"
                    stroke="var(--color-ram)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="empty-chart">
                <MonitorCog aria-hidden="true" />
                <span>
                  {error
                    ? 'Das Diagramm wartet auf die lokale API.'
                    : 'Sobald zwei Messwerte vorliegen, wird hier der Verlauf sichtbar.'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
        {!compact && (
          <Card className="panel detail-panel">
            <CardHeader>
              <CardDescription>GERÄT</CardDescription>
              <CardTitle>Systemdetails</CardTitle>
            </CardHeader>
            <CardContent className="detail-list">
              <div>
                <span>
                  <Server /> Computername
                </span>
                <strong>{metrics?.hostname ?? '—'}</strong>
              </div>
              <div>
                <span>
                  <MonitorCog /> Betriebssystem
                </span>
                <strong>{metrics?.operating_system ?? '—'}</strong>
              </div>
              <div>
                <span>
                  <Cpu /> CPU-Kerne
                </span>
                <strong>
                  {metrics
                    ? `${metrics.cpu_cores_physical ?? '—'} / ${metrics.cpu_cores_logical}`
                    : '—'}
                </strong>
              </div>
              <div>
                <span>
                  <RefreshCw /> Aktualisiert
                </span>
                <strong>
                  {metrics ? formatDateTime(metrics.last_updated) : '—'}
                </strong>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
