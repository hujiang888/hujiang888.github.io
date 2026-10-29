#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path 'node_modules')) {
  Write-Host 'Installing dependencies...'
  npm.cmd install
}

if (-not (Test-Path '.env')) {
  Write-Host 'Missing .env. Copy .env.example to .env and fill MySQL credentials.'
  exit 1
}

Write-Host 'Starting Jiang Hu portfolio on http://localhost:3000'
npm.cmd start
