#!/usr/bin/env python3.11
import os
import sys
import requests
import json

# Ensure we're in backend dir
os.chdir("/Users/charan/Downloads/vitalll/backend")
sys.path.insert(0, "/Users/charan/Downloads/vitalll/backend")

print("=" * 60)
print("🧪 CHATBOT TESTS")
print("=" * 60)

# Test 1: Check .env loading
print("\n1️⃣  Checking .env file...")
from dotenv import load_dotenv
load_dotenv(".env")
api_key = os.getenv("OPENAI_API_KEY")
model = os.getenv("OPENAI_CHAT_MODEL")
print(f"   API Key: {api_key[:20] if api_key else 'NOT FOUND'}...")
print(f"   Model: {model}")

# Test 2: Login
print("\n2️⃣  Logging in as demo user...")
try:
    response = requests.post(
        "http://localhost:8000/api/login",
        data={"username": "demo", "password": "demo123"},
        timeout=5
    )
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        token = response.json().get("access_token", "")
        print(f"   ✅ Token: {token[:30]}...")
        
        # Test 3: Chat
        print("\n3️⃣  Testing chatbot...")
        headers = {"Authorization": f"Bearer {token}"}
        chat_response = requests.post(
            "http://localhost:8000/api/chat",
            json={"message": "what is rppg?"},
            headers=headers,
            timeout=10
        )
        print(f"   Status: {chat_response.status_code}")
        data = chat_response.json()
        print(f"   Response: {data.get('response', 'No response')[:100]}...")
    else:
        print(f"   ❌ Error: {response.text}")
except Exception as e:
    print(f"   ❌ Exception: {type(e).__name__}: {str(e)}")

print("\n" + "=" * 60)
