#!/usr/bin/env bash
# Runs the backend locally (Linux / macOS)
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
