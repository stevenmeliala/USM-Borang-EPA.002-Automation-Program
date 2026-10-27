#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=== Starting USM EPA.002 Paperwork Automation ==="

# Set Node & NPM in PATH if needed
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# 1. Start FastAPI Backend in background
echo "-> Starting Backend API on http://localhost:8000..."
PYTHONPATH=backend backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 2. Start Vite Frontend
echo "-> Starting Frontend UI on http://localhost:5173..."
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM EXIT

wait
