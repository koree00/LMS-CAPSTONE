# Starts the API, the rule engine, and the frontend in three windows.
# Expects these folders side by side:  sned-api, sned-engine, sned-web
$root = Split-Path -Parent $PSScriptRoot

Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\sned-api'; php artisan serve"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$root\sned-engine'; .\venv\Scripts\python -m uvicorn main:app --port 8001 --reload"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "cd '$PSScriptRoot'; npm run dev"

Write-Host "Open http://localhost:5173"
