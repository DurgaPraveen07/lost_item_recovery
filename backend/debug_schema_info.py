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
    # Get columns by checking an empty select or any available info
    # In PostgREST, we can sometimes use OPTIONS or just check a failed insert if we want schema, 
    # but the best way is to check the REST API documentation or just try to fetch.
    # Since it's empty, we can't see columns via data.
    # We can try to get the OpenAPI spec.
    print(f"Fetching OpenAPI spec from {SUPABASE_URL} ...")
    response = requests.get(f"{SUPABASE_URL}/", headers=headers)
    if response.status_code == 200:
        spec = response.json()
        print("Definitions of items table:")
        print(json.dumps(spec.get('definitions', {}).get('items', {}), indent=2))
    else:
        print(f"Error: {response.text}")
except Exception as e:
    print(f"Error: {e}")
