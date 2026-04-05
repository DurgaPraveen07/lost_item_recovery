import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Just the root URL to get the OpenAPI spec and list of tables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

try:
    print(f"Fetching table list from {SUPABASE_URL} ...")
    response = requests.get(SUPABASE_URL, headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        spec = response.json()
        definitions = spec.get('definitions', {})
        print("Available Tables (Definitions):")
        for table in definitions:
            print(f"- {table}")
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
