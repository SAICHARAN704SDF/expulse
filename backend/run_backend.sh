#!/bin/bash
cd /Users/charan/Downloads/vitalll/backend
source .env
export OPENAI_API_KEY
export OPENAI_CHAT_MODEL
python3.11 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --log-level info
