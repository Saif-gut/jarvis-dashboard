# Jarvis Dashboard

Jarvis Dashboard ist ein vollständig lokales persönliches IT-Kontrollzentrum. Die Web-App zeigt echte, ausschließlich gelesene Systeminformationen, verwaltet Aufgaben und Notizen in einer lokalen SQLite-Datenbank und lädt Wetterdaten für Berlin über Open-Meteo. Die klar getrennte JARVIS-Schnittstelle kann genau eine fest konfigurierte lokale Instanz sicher starten, stoppen und beobachten.

## Voraussetzungen

- Windows 10 oder 11
- Node.js 22.13 oder neuer (empfohlen: aktuelle LTS-Version)
- Python 3.11 oder neuer
- Internetzugang nur für die einmalige Installation und die Wetterabfrage

## Installation

Im Projektordner in PowerShell:

```powershell
npm install
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r .\backend\requirements-dev.txt
```

Die virtuelle Umgebung und alle Laufzeitdaten werden von Git ignoriert.

## Backend starten

```powershell
.\start-backend.ps1
```

Das Backend ist danach ausschließlich unter `http://127.0.0.1:8000` erreichbar. Die interaktive lokale API-Dokumentation liegt unter `http://127.0.0.1:8000/docs`.

## Frontend starten

In einem zweiten PowerShell-Fenster:

```powershell
.\start-frontend.ps1
```

Anschließend `http://127.0.0.1:3000` im Browser öffnen.

## Dashboard bequem unter Windows starten

Nach der einmaligen Installation genügt ein Doppelklick auf `start-dashboard.cmd`. Die Datei prüft zuerst Node.js, die lokale Python-Umgebung, die bereits installierten Abhängigkeiten, die benötigten Projektdateien sowie die Ports 3000 und 8000. Anschließend öffnet sie Backend und Frontend jeweils in einem sichtbaren eigenen Terminalfenster und danach `http://localhost:3000` im Standardbrowser.

Das Skript installiert keine Pakete, benötigt keine Administratorrechte und ändert die PowerShell-Ausführungsrichtlinie nicht. Mit `start-dashboard.cmd --check` lassen sich nur die Voraussetzungen prüfen, ohne Server zu starten.

Zum manuellen Beenden in beiden Serverfenstern jeweils `Strg+C` drücken und die Rückfrage gegebenenfalls mit `J` bestätigen. Danach können die beiden Fenster geschlossen werden. Das zuerst geöffnete Startfenster kann nach dem erfolgreichen Start ebenfalls geschlossen werden.

## Tests und Build

Frontend:

```powershell
npm run typecheck
npm test
npm run build
```

Backend:

```powershell
Set-Location .\backend
..\.venv\Scripts\python.exe -m pytest
```

## Projektstruktur

```text
app/                    Seite, Layout und globales Design
components/dashboard/   Wiederverwendbare Dashboard-Ansichten
components/ui/          Kleine barrierearme UI-Bausteine
lib/                    API-Client, Typen, Hilfsfunktionen, Jarvis-Adapter
backend/app/             FastAPI-Anwendung und abgegrenzte Dienste
backend/data/            Lokale SQLite-Datenbank (entsteht beim ersten Start)
backend/tests/           API-, Daten- und Sicherheitstests
```

## Sicherheit

- Der Startbefehl bindet FastAPI fest an `127.0.0.1`.
- Systemdaten werden mit `psutil` nur gelesen.
- Es existieren keine Endpunkte für Shell-Befehle, Dateilöschung, Prozesssteuerung oder Windows-Einstellungen.
- CORS erlaubt nur das lokale Frontend auf Port 3000; unbekannte Hostnamen werden abgewiesen.
- Aufgaben- und Notizeingaben werden serverseitig validiert und mit parametrisierten SQLite-Abfragen gespeichert.
- Es sind keine Zugangsdaten oder API-Schlüssel erforderlich.
- Nur die fest konfigurierte, öffentliche Ortsangabe Berlin wird zur Wetterabfrage an Open-Meteo übermittelt. Persönliche System-, Aufgaben- oder Notizdaten verlassen den Rechner nicht.

## Jarvis-Sprachassistent verbinden und bedienen

Die Jarvis-Seite verbindet sich ausschließlich mit dem fest verdrahteten lokalen Projekt unter `%USERPROFILE%\Documents\VS code\Jarvis` und dessen Interpreter `.venv\Scripts\python.exe`. Der Assistent wird nie beim Dashboard-Start automatisch ausgeführt.

1. Dashboard starten und im Browser die Seite **Jarvis** öffnen.
2. **Starten** auswählen. Das Dashboard startet genau `python -m jarvis` im Jarvis-Projekt.
3. Status, Laufzeit und die letzten lokalen Terminal-Protokolle erscheinen automatisch. Die Statuswerte werden aus Jarvis' bestehenden Terminalmeldungen abgeleitet.
4. **Stoppen** beendet nur den vom Dashboard gestarteten Jarvis-Prozess: zuerst kontrolliert per Konsolensignal, danach nur bei Bedarf über genau diese gespeicherte Prozess-ID.
5. **Neu starten** führt diesen kontrollierten Stopp und anschließend einen einzelnen Start aus.

Läuft Jarvis bereits außerhalb des Dashboards, wird er nur angezeigt. Das Dashboard startet keine zweite Instanz und kann den extern gestarteten Prozess weder stoppen noch neu starten.

Die API kennt ausschließlich die festen lokalen Aktionen `/api/jarvis/status`, `/start`, `/stop` und `/restart`. Browserdaten können weder Befehle, Pfade noch Prozess-IDs übergeben. Mikrofon, Whisper, Aktivierung, Sprachverarbeitung, Internetrecherche, Stimme und Audioausgabe bleiben vollständig im getrennten Jarvis-Projekt.

### UTF-8 in den JARVIS-Protokollen

Beim Start setzt der Prozessadapter für JARVIS `PYTHONUTF8=1` und
`PYTHONIOENCODING=utf-8:strict`; zugleich liest er die zusammengeführte
Standard- und Fehlerausgabe strikt als UTF-8. Damit werden Windows-Codepage und
UTF-8 nicht mehr vermischt und ungültige Bytes nicht still durch das
Unicode-Ersatzzeichen `U+FFFD` ersetzt.
Alte Protokollzeilen liegen nur im Arbeitsspeicher und werden bei einem neuen
Dashboard-Start von JARVIS verworfen. FastAPI liefert die Zeichen als JSON,
`lib/api.ts` liest dieses JSON direkt und React zeigt die Strings unverändert an.
Ein Vitest-Regressionstest sichert auch diesen JSON-Leseweg mit deutschen
Umlauten, `ß` und einem Gedankenstrich ab.
