$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $projectRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $python)) {
    throw 'Virtuelle Python-Umgebung fehlt. Bitte zuerst die Installation aus der README ausführen.'
}

Set-Location -LiteralPath (Join-Path $projectRoot 'backend')
& $python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
