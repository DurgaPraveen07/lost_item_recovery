import requests
import json
import datetime
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

item = {
    "type": "lost",
    "item_name": "Test Item",
    "category": "Electronics",
    "date_reported": datetime.datetime.now().strftime("%Y-%m-%d"),
    "location": "Test Library",
    "description": "Test description",
    "handed_over_to": "None",
    "reporter_email": "sync_test@diet.ac.in",
    "status": "open"
}

try:
    print(f"Inserting test item into {SUPABASE_URL} ...")
    response = requests.post(f"{SUPABASE_URL}/items", json=item, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
