$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$npm = Get-Command npm -ErrorAction SilentlyContinue

if (-not $npm) {
    throw 'npm wurde nicht gefunden. Bitte Node.js LTS installieren und das Terminal neu öffnen.'
}

Set-Location -LiteralPath $projectRoot
& $npm.Source run dev -- --host 127.0.0.1
