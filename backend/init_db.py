from pymongo import MongoClient
from datetime import datetime
from werkzeug.security import generate_password_hash
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://your_connection_string')
client = MongoClient(MONGODB_URI)
db = client.trading_journal

# Trading session definitions
TRADING_SESSIONS = {
    'London': {
        'start': '08:00',  # 8:00 AM UTC
        'end': '16:30',    # 4:30 PM UTC
        'color': '#2563eb'  # Blue
    },
    'New York': {
        'start': '13:00',  # 1:00 PM UTC
        'end': '22:00',    # 10:00 PM UTC
        'color': '#f97316'  # Orange
    },
    'Asia': {
        'start': '00:00',  # 12:00 AM UTC
        'end': '09:00',    # 9:00 AM UTC
        'color': '#dc2626'  # Red
    }
}

def init_db():
    try:
        # Clear existing sessions
        db.sessions.delete_many({})
        print("Cleared existing sessions")

        # Insert sessions
        session_docs = []
        for name, session in TRADING_SESSIONS.items():
            session_docs.append({
                'name': name,
                'start': session['start'],
                'end': session['end'],
                'color': session['color']
            })
        
        if session_docs:
            db.sessions.insert_many(session_docs)
            print(f"Inserted {len(session_docs)} sessions")

        # Check if admin user exists
        admin_user = db.users.find_one({'email': 'asokoli54@gmail.com'})
        if not admin_user:
            # Create admin user if doesn't exist
            admin_user = {
                'email': 'asokoli54@gmail.com',
                'password_hash': generate_password_hash('admin'),
                'name': 'Admin',
                'role': 'admin',
                'created_at': datetime.utcnow()
            }
            db.users.insert_one(admin_user)
            print("Created admin user")
        else:
            print("Admin user already exists")

        print("\nDatabase initialization completed successfully!")
        
        # Print current state
        print("\nCurrent sessions in database:")
        for session in db.sessions.find():
            print(f"- {session['name']}: {session['start']} - {session['end']}")
        
        print("\nCurrent users in database:")
        for user in db.users.find():
            print(f"- {user['email']} (Role: {user['role']})")

    except Exception as e:
        print(f"Error initializing database: {e}")

if __name__ == "__main__":
    init_db() 