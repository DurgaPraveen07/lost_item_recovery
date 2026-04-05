import requests
import json

API_URL = "http://localhost:5000/api"

test_item = {
    "type": "lost",
    "item_name": "Test Item",
    "category": "Electronics",
    "date_reported": "2026-03-21",
    "location": "Test Room",
    "description": "Test description",
    "status": "open",
    "reporter_email": "test@diet.ac.in",
    "user_id": "student-123456"
}

try:
    print(f"Testing POST {API_URL}/items ...")
    response = requests.post(f"{API_URL}/items", json=test_item)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
