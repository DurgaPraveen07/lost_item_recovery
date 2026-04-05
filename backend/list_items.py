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
    response = requests.get(f"{SUPABASE_URL}/items?select=*", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print(f"Total items: {len(data)}")
        for item in data:
            print(f"- {item.get('item_name')} ({item.get('type')})")
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")
