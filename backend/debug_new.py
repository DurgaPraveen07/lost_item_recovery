import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

try:
    print(f"Fetching from {SUPABASE_URL} ...")
    response = requests.get(f"{SUPABASE_URL}/items?select=*&limit=1", headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Data length: {len(data)}")
        if data:
            print(json.dumps(data[0], indent=2))
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
