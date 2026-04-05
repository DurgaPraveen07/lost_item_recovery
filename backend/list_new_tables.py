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
    response = requests.get(f"{SUPABASE_URL}/", headers=headers)
    if response.status_code == 200:
        spec = response.json()
        print("Tables in project:")
        for table in spec.get('definitions', {}).keys():
            print(f"- {table}")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")
