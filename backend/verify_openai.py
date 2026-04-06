import os
import sys

# Add backend to path
sys.path.insert(0, '/Users/charan/Downloads/vitalll/backend')

print("\n" + "="*70)
print("🧪 OPENAI IMPORT DIAGNOSTIC")
print("="*70 + "\n")

# Check 1: OpenAI import
print("[1/3] Testing OpenAI import...")
try:
    from openai import OpenAI
    print("✅ OpenAI imported successfully\n")
except ImportError as e:
    print(f"❌ Import Error: {e}\n") 
    # Try to install
    print("🔧 Attempting to install openai...")
    os.system("pip install openai==1.51.2 -q")
    try:
        from openai import OpenAI
        print("✅ OpenAI installed and imported\n")
    except:
        print("❌ Failed to install OpenAI\n")
        sys.exit(1)
except Exception as e:
    print(f"❌ Other Error: {type(e).__name__}: {e}\n")
    sys.exit(1)

# Check 2: .env file
print("[2/3] Checking .env file...")
if os.path.exists("/Users/charan/Downloads/vitalll/backend/.env"):
    print("✅ .env file exists")
    with open("/Users/charan/Downloads/vitalll/backend/.env") as f:
        content = f.read()
        if "OPENAI_API_KEY" in content:
            print("✅ OPENAI_API_KEY found in .env\n")
        else:
            print("❌ OPENAI_API_KEY not found in .env\n")
else:
    print("❌ .env file not found\n")

# Check 3: API Key accessible
print("[3/3] Loading API key...")
from dotenv import load_dotenv
load_dotenv("/Users/charan/Downloads/vitalll/backend/.env")
api_key = os.getenv("OPENAI_API_KEY")

if api_key:
    print(f"✅ API Key loaded: {api_key[:30]}...\n")
else:
    print("❌ API Key not loaded\n")
    sys.exit(1)

print("="*70)
print("✅ ALL CHECKS PASSED - OpenAI is ready!")
print("="*70 + "\n")
