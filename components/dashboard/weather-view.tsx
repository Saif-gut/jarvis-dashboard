'use client';

import { Cloud, CloudRain, CloudSun, Droplets, RefreshCw, Sun, Wind } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { WeatherData } from '@/lib/dashboard-types';
import { formatDate } from '@/lib/dashboard-utils';

function WeatherIcon({ code, className = '' }: { code: number; className?: string }) {
  const Icon = code <= 1 ? Sun : code <= 3 ? CloudSun : code >= 51 ? CloudRain : Cloud;
  return <Icon className={className} aria-hidden="true" />;
}

export function WeatherView({ weather, loading, error, onRefresh, compact = false }: { weather: WeatherData | null; loading: boolean; error: string | null; onRefresh: () => void; compact?: boolean }) {
  if (!weather) {
    return (
      <section aria-labelledby="weather-heading">
        <div className="section-heading"><div><p className="eyebrow">BERLIN · 10115</p><h2 id="weather-heading">Wetter</h2></div></div>
        <Card className="panel weather-empty"><CardContent><CloudRain aria-hidden="true" /><h3>{loading ? 'Wetter wird geladen' : 'Wetter nicht verfügbar'}</h3><p>{error ?? 'Die lokale API fragt Open-Meteo ab.'}</p><Button variant="outline" onClick={onRefresh} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> Erneut versuchen</Button></CardContent></Card>
      </section>
    );
  }

  return (
    <section aria-labelledby="weather-heading">
      <div className="section-heading"><div><p className="eyebrow">BERLIN · 10115</p><h2 id="weather-heading">Wetter</h2></div><Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> Aktualisieren</Button></div>
      {error && <div className="inline-alert" role="status"><span className="status-dot warning" /> {error}</div>}
      <div className={compact ? 'weather-grid compact' : 'weather-grid'}>
        <Card className="panel current-weather">
          <CardHeader className="flex-row items-start justify-between"><div><CardDescription>AKTUELL</CardDescription><CardTitle>{weather.current.description}</CardTitle></div><WeatherIcon code={weather.current.weather_code} className="weather-main-icon" /></CardHeader>
          <CardContent><div className="temperature">{Math.round(weather.current.temperature)}°</div><div className="weather-facts"><span>Gefühlt {Math.round(weather.current.apparent_temperature)}°</span><span><Wind /> {Math.round(weather.current.wind_speed)} km/h</span><span><Droplets /> {weather.current.precipitation_probability}% Regen</span></div></CardContent>
        </Card>
        {!compact && <Card className="panel forecast-panel"><CardHeader><CardDescription>NÄCHSTE STUNDEN</CardDescription><CardTitle>Kurzvorhersage</CardTitle></CardHeader><CardContent className="hourly-list">{weather.next_hours.map((hour) => <div key={hour.time}><time>{new Date(hour.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</time><WeatherIcon code={hour.weather_code} /><strong>{Math.round(hour.temperature)}°</strong><small>{hour.precipitation_probability}%</small></div>)}</CardContent></Card>}
        <Card className="panel tomorrow-card"><CardHeader><CardDescription>MORGEN · {formatDate(weather.tomorrow.date)}</CardDescription><CardTitle>{weather.tomorrow.description}</CardTitle></CardHeader><CardContent><WeatherIcon code={weather.tomorrow.weather_code} className="tomorrow-icon" /><div><strong>{Math.round(weather.tomorrow.temperature_max)}°</strong><span>{Math.round(weather.tomorrow.temperature_min)}°</span><small>{weather.tomorrow.precipitation_probability}% Regen</small></div></CardContent></Card>
      </div>
    </section>
  );
}
