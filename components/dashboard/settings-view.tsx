import { Database, Gauge, Globe2, LockKeyhole, Server } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { API_BASE } from '@/lib/api';

export function SettingsView() {
  const settings = [
    [Server, 'Lokale API', API_BASE],
    [Gauge, 'System-Aktualisierung', 'Alle 5 Sekunden'],
    [Database, 'Aufgaben & Notizen', 'Lokale SQLite-Datenbank'],
    [Globe2, 'Wetterquelle', 'Open-Meteo · kein API-Key'],
  ] as const;
  return <section aria-labelledby="settings-heading"><div className="section-heading"><div><p className="eyebrow">KONFIGURATION</p><h2 id="settings-heading">Einstellungen</h2></div></div><div className="settings-grid">{settings.map(([Icon, label, value]) => <Card className="panel setting-card" key={label}><CardContent><span><Icon /></span><div><small>{label}</small><strong>{value}</strong></div></CardContent></Card>)}</div><Card className="panel safety-card"><CardHeader><CardDescription>SICHERHEITSGRENZEN</CardDescription><CardTitle><LockKeyhole /> Nur lesen, lokal speichern</CardTitle></CardHeader><CardContent><p>Das Backend stellt Systeminformationen ausschließlich lesend bereit. Es kann keine Dateien löschen, keine Prozesse starten oder beenden, keine Shell-Befehle ausführen und keine Windows-Einstellungen verändern.</p></CardContent></Card></section>;
}
