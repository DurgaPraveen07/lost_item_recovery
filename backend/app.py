from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import datetime
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

@app.route('/')
def serve_index():
    return send_from_directory('../frontend', 'index.html')


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        response = requests.get(f"{SUPABASE_URL}/items?select=*&order=timestamp.desc", headers=headers)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify([])

@app.route('/api/items', methods=['POST'])
def add_item():
    data = request.json
    status = data.get('status', 'open')
    resolved_time = None
    if status == 'resolved':
        resolved_time = datetime.datetime.now().isoformat()

    # Official Campus Security Vault Integration
    location = data.get('location')
    handed_over_to = data.get('handed_over_to', '')
    if handed_over_to == 'Security Office':
        location = 'Campus Security Vault'
        
    item_type = data.get('type')
    item_name = data.get('item_name')
    category = data.get('category')
    reporter_email = data.get('reporter_email', '')
    date_reported = data.get('date_reported')
    description = data.get('description', '')

    if not item_type or not item_name or not category or not reporter_email:
        return jsonify({"error": "Missing required fields"}), 400
        
    insert_data = {
        "type": item_type,
        "item_name": item_name,
        "category": category,
        "date_reported": date_reported,
        "location": location,
        "description": description,
        "handed_over_to": handed_over_to,
        "reporter_email": reporter_email,
        "user_id": data.get('user_id'),
        "status": status,
        "resolved_timestamp": resolved_time,
        "image_url": data.get('image_url')
    }
    
    try:
        response = requests.post(f"{SUPABASE_URL}/items", json=insert_data, headers=headers)
        response.raise_for_status()
        res_data = response.json()
        
        # Robust ID retrieval
        new_id = 0
        if isinstance(res_data, list) and len(res_data) > 0:
            new_id = res_data[0].get('id', 0)
        elif isinstance(res_data, dict):
            new_id = res_data.get('id', 0)
            
        return jsonify({"success": True, "id": new_id, "message": f"{item_type.capitalize()} item reported successfully!"}), 201
    except requests.exceptions.HTTPError as e:
        err_msg = e.response.text if e.response else str(e)
        print(f"PostgREST Error: {err_msg}")
        return jsonify({"error": err_msg}), e.response.status_code if e.response else 500
    except Exception as e:
        print(f"Add Item Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/items/<int:item_id>/resolve', methods=['PUT'])
def resolve_item(item_id):
    current_time = datetime.datetime.now().isoformat()
    try:
        update_data = {'status': 'resolved', 'resolved_timestamp': current_time}
        response = requests.patch(f"{SUPABASE_URL}/items?id=eq.{item_id}", json=update_data, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        if len(data) > 0:
            receipt_id = f"REC-{datetime.datetime.now().strftime('%Y%m%d')}-{item_id}"
            return jsonify({
                "success": True,
                "receipt": {
                    "receipt_id": receipt_id,
                    "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "status": "closed",
                    "message": "Item successfully marked as resolved and safely handed over."
                }
            }), 200
        return jsonify({"error": "Item not found"}), 404
    except requests.exceptions.HTTPError as e:
        err_msg = e.response.text if e.response else str(e)
        status_code = e.response.status_code if e.response else 500
        return jsonify({"error": err_msg}), status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/messages', methods=['GET'])
def get_messages_list():
    item_id = request.args.get('item_id')
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "Unauthorized: user_id required"}), 401
        
    try:
        url = f"{SUPABASE_URL}/messages?select=*&order=created_at.asc"
        if item_id:
            url += f"&item_id=eq.{item_id}"
        
        url += f"&or=(sender_id.eq.{user_id},receiver_id.eq.{user_id})"
            
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return jsonify(response.json())
        return jsonify([]), 200
    except Exception as e:
        return jsonify([]), 500

@app.route('/api/messages', methods=['POST'])
def send_message():
    data = request.json
    item_id = data.get('item_id')
    message = data.get('message')
    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')
    
    if not item_id or not message or not sender_id:
        return jsonify({"error": "Missing required fields"}), 400

    # Handle missing receiver_id (for older items)
    if not receiver_id or receiver_id == 'undefined':
        try:
            # Look up item to get reporter_email
            item_res = requests.get(f"{SUPABASE_URL}/items?id=eq.{item_id}", headers=headers)
            if item_res.status_code == 200 and len(item_res.json()) > 0:
                item = item_res.json()[0]
                email = item.get('reporter_email')
                if email:
                    # Look up user ID from our local users.json
                    users = load_local_users()
                    user = users.get(email)
                    if user and user.get('id'):
                        receiver_id = user.get('id')
                    else:
                        # Fallback to email as ID if not in directory (might still fail UUID check)
                        receiver_id = f"email:{email}"
        except:
            pass

    if not receiver_id or receiver_id == 'undefined':
        return jsonify({"error": "Recipient identity not found. The reporter may not have a registered profile."}), 404
        
    # Check for Session Expiry (60 minutes)
    try:
        # Find the very first message between these two users for this item
        # We check both directions (A->B and B->A)
        url = f"{SUPABASE_URL}/messages?item_id=eq.{item_id}&or=(and(sender_id.eq.{sender_id},receiver_id.eq.{receiver_id}),and(sender_id.eq.{receiver_id},receiver_id.eq.{sender_id}))&order=created_at.asc&limit=1"
        res = requests.get(url, headers=headers)
        if res.status_code == 200 and len(res.json()) > 0:
            first_msg = res.json()[0]
            start_time_str = first_msg.get('created_at')
            if start_time_str:
                start_time = datetime.datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
                now = datetime.datetime.now(datetime.timezone.utc)
                if (now - start_time).total_seconds() > 3600:
                    return jsonify({"error": "CHAT_EXPIRED", "message": "This chat session has expired (60 minutes limit reached) and is now permanently closed."}), 403
    except Exception as e:
        print(f"Session Check Error: {e}")

    insert_data = {
        'item_id': item_id,
        'sender_id': sender_id,
        'receiver_id': receiver_id,
        'message': message,
        'is_read': False
    }
    
    try:
        response = requests.post(f"{SUPABASE_URL}/messages", json=insert_data, headers=headers)
        response.raise_for_status()
        return jsonify({"success": True, "message": "Message sent!"}), 201
    except requests.exceptions.HTTPError as e:
        # Check if it was a UUID format error
        err_body = e.response.text
        if "invalid input syntax for type uuid" in err_body:
             return jsonify({"error": "Recipient profile is legacy and cannot receive messages yet."}), 400
        return jsonify({"error": err_body}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/chat/session_info', methods=['GET'])
def get_session_info():
    item_id = request.args.get('item_id')
    u1 = request.args.get('user1')
    u2 = request.args.get('user2')
    
    if not item_id or not u1 or not u2:
        return jsonify({"error": "Missing parameters"}), 400
        
    try:
        # Use complex query to find the earliest message in the thread
        url = f"{SUPABASE_URL}/messages?item_id=eq.{item_id}&or=(and(sender_id.eq.{u1},receiver_id.eq.{u2}),and(sender_id.eq.{u2},receiver_id.eq.{u1}))&order=created_at.asc&limit=1"
        response = requests.get(url, headers=headers)
        msgs = response.json()
        
        if msgs:
            return jsonify({
                "start_time": msgs[0]['created_at'],
                "server_time": datetime.datetime.now(datetime.timezone.utc).isoformat()
            })
        return jsonify({"start_time": None})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/messages/unread_count', methods=['GET'])
def get_unread_count():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"count": 0})
    try:
        url = f"{SUPABASE_URL}/messages?select=id&receiver_id=eq.{user_id}&is_read=eq.false"
        combined_headers = headers.copy()
        combined_headers["Prefer"] = "count=exact"
        response = requests.get(url, headers=combined_headers)
        # Supabase returns count in header when Prefer: count=exact is sent
        count = response.headers.get('Content-Range', '0-0/0').split('/')[-1]
        return jsonify({"count": int(count)})
    except:
        return jsonify({"count": 0})

@app.route('/api/messages/mark_read', methods=['PUT'])
def mark_messages_read():
    item_id = request.args.get('item_id')
    user_id = request.args.get('user_id')
    if not item_id or not user_id:
        return jsonify({"success": False}), 400
    try:
        update_data = {'is_read': True}
        url = f"{SUPABASE_URL}/messages?item_id=eq.{item_id}&receiver_id=eq.{user_id}&is_read=eq.false"
        requests.patch(url, json=update_data, headers=headers)
        return jsonify({"success": True})
    except:
        return jsonify({"success": False}), 500
 
@app.route('/api/stats', methods=['GET'])
def get_stats():
    # Helper to calculate average recovery time
    try:
        response = requests.get(f"{SUPABASE_URL}/items?select=*", headers=headers)
        items = response.json()
    except Exception as e:
        print(f"Stats Error: {e}")
        return jsonify({"error": "Failed to fetch items"}), 500

    lost_count = len([i for i in items if i.get('type') == 'lost'])
    found_count = len([i for i in items if i.get('type') == 'found'])
    recovered_count = len([i for i in items if i.get('status') == 'resolved'])
    
    # Calculate Avg Recovery Time based on timestamp vs resolved_timestamp
    total_hours = 0.0
    resolved_items_with_times = [i for i in items if i.get('status') == 'resolved' and i.get('resolved_timestamp') and i.get('timestamp')]
    
    for item in resolved_items_with_times:
        try:
            start = datetime.datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00'))
            end = datetime.datetime.fromisoformat(item['resolved_timestamp'].replace('Z', '+00:00'))
            diff = float((end - start).total_seconds() / 3600.0)
            total_hours = float(total_hours) + diff
        except:
            pass
            
    avg_recovery_time = 0
    if len(resolved_items_with_times) > 0:
        avg = float(total_hours) / len(resolved_items_with_times)
        avg_recovery_time = int(avg)

    # Categories logic
    category_counts = {}
    for item in items:
        if item.get('type') == 'lost':
            cat = item.get('category')
            category_counts[cat] = category_counts.get(cat, 0) + 1
            
    sorted_cats = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
    top_categories = [{"category": c[0], "count": c[1]} for c in sorted_cats[:3]]
    
    return jsonify({
        "lost": lost_count,
        "found": found_count,
        "recovered": recovered_count,
        "avg_recovery_time_hours": avg_recovery_time,
        "top_lost_categories": top_categories
    })

USERS_FILE = 'users.json'

def load_local_users():
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except:
        return {}

def save_local_users(users):
    try:
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=2)
            return True
    except:
        return False

@app.route('/api/users', methods=['GET'])
def get_users_list():
    users = load_local_users()
    # Convert dict to list for frontend
    return jsonify(list(users.values()))

@app.route('/api/users', methods=['POST'])
def upsert_user():
    data = request.json
    email = data.get('email')
    if not email:
        return jsonify({"error": "Email required"}), 400
    
    # Save locally (backup)
    users = load_local_users()
    users[email] = data
    save_local_users(users)
    
    # Also upsert into Supabase profiles table
    try:
        # Build the profile data with only the fields that exist in the profiles table
        profile_data = {
            "id": data.get('id'),
            "email": email,
            "name": data.get('name'),
            "role": data.get('role', 'student'),
            "roll": data.get('roll'),
            "branch": data.get('branch'),
            "year": data.get('year'),
            "gender": data.get('gender'),
            "section": data.get('section'),
            "mobile": data.get('mobile'),
        }
        # Only include password if provided
        if data.get('password'):
            profile_data['password'] = data.get('password')
        
        # Remove None values
        profile_data = {k: v for k, v in profile_data.items() if v is not None}
        
        upsert_headers = headers.copy()
        upsert_headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        sb_res = requests.post(f"{SUPABASE_URL}/profiles", json=profile_data, headers=upsert_headers)
        if sb_res.status_code not in [200, 201]:
            print(f"Supabase upsert warning: {sb_res.text}")
    except Exception as e:
        print(f"Supabase profile sync error: {e}")
    
    return jsonify({"success": True}), 200

@app.route('/api/auth', methods=['POST'])
def auth():
    data = request.json
    email = data.get('email', '').lower()
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Missing credentials"}), 400
        
    try:
        # Check Supabase profiles table
        url = f"{SUPABASE_URL}/profiles?email=eq.{email}&select=*"
        res = requests.get(url, headers=headers)
        profiles = res.json()
        
        if profiles and len(profiles) > 0:
            profile = profiles[0]
            if profile.get('password') == password:
                return jsonify({"success": True, "user": profile}), 200
            else:
                return jsonify({"error": "Invalid password"}), 401
        
        # New Registration if password is default
        if password == 'student@123':
            import uuid
            new_user = {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": email.split('@')[0].upper(),
                "role": 'student',
                "password": 'student@123'
            }
            res = requests.post(f"{SUPABASE_URL}/profiles", json=new_user, headers=headers)
            if res.status_code not in [200, 201]:
                print(f"Registration error: {res.text}")
                # Try without id (let Supabase auto-generate if there's a conflict)
                new_user_no_id = {k: v for k, v in new_user.items() if k != 'id'}
                res2 = requests.post(f"{SUPABASE_URL}/profiles", json=new_user_no_id, headers=headers)
                if res2.status_code in [200, 201]:
                    created = res2.json()
                    new_user = created[0] if isinstance(created, list) else created
            
            # Also save locally
            users = load_local_users()
            users[email] = new_user
            save_local_users(users)
            
            return jsonify({"success": True, "user": new_user, "message": "Registered successfully! Please update your profile."}), 201
            
        return jsonify({"error": "Account not found. Use default password 'student@123' to register."}), 404
    except Exception as e:
        print(f"Auth Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

