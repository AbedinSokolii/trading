from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
import os
from datetime import datetime, time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB Atlas connection with error handling
try:
    MONGODB_URI = os.getenv('MONGODB_URI')
    if not MONGODB_URI:
        raise ValueError("No MongoDB URI found in environment variables")
    client = MongoClient(MONGODB_URI)
    db = client.trading_journal
    # Test the connection
    client.server_info()
    print("Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"Error connecting to MongoDB Atlas: {e}")
    # Use in-memory fallback for development
    class InMemoryDB:
        def __init__(self):
            self.users = {}
            self.accounts = {}
            self.trades = []
    db = InMemoryDB()

# Set Flask configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')

# Trading session definitions
TRADING_SESSIONS = {
    'London': {
        'start': time(8, 0),  # 8:00 AM UTC
        'end': time(16, 30),  # 4:30 PM UTC
        'color': '#2563eb'  # Blue
    },
    'New York': {
        'start': time(13, 0),  # 1:00 PM UTC
        'end': time(22, 0),  # 10:00 PM UTC
        'color': '#f97316'  # Orange
    },
    'Asia': {
        'start': time(0, 0),  # 12:00 AM UTC
        'end': time(9, 0),  # 9:00 AM UTC
        'color': '#dc2626'  # Red
    }
}

def get_trading_session(trade_time):
    """Determine the trading session based on the trade time"""
    trade_hour = trade_time.hour
    trade_minute = trade_time.minute
    current_time = time(trade_hour, trade_minute)
    
    for session, times in TRADING_SESSIONS.items():
        if times['start'] <= current_time <= times['end']:
            return session
    return 'Other'

# In-memory storage for development
class InMemoryDB:
    def __init__(self):
        self.users = {
            'asokoli54@gmail.com': {
                'password_hash': generate_password_hash('admin'),
                'name': 'Admin',
                'role': 'admin',
                'created_at': datetime.utcnow()
            }
        }
        self.accounts = {}
        self.trades = []
        
    def find_one(self, collection, query):
        data = getattr(self, collection)
        if isinstance(data, dict):
            if 'email' in query:
                return data.get(query['email'])
        return None
        
    def insert_one(self, collection, document):
        data = getattr(self, collection)
        if isinstance(data, dict):
            data[document['email']] = document
        else:
            document['id'] = len(data) + 1
            data.append(document)
        return type('Result', (), {'inserted_id': document.get('id', None)})()
        
    def find(self, collection, query=None):
        data = getattr(self, collection)
        if isinstance(data, dict):
            return [{'email': k, **v} for k, v in data.items()]
        return data
        
    def delete_one(self, collection, query):
        data = getattr(self, collection)
        if isinstance(data, dict):
            if 'email' in query and query['email'] in data:
                del data[query['email']]
                return type('Result', (), {'deleted_count': 1})()
        return type('Result', (), {'deleted_count': 0})()
        
    def update_one(self, collection, query, update):
        data = getattr(self, collection)
        if isinstance(data, dict):
            if 'email' in query and query['email'] in data:
                data[query['email']].update(update['$set'])
                return True
        return False

    def get_session_analytics(self, user_email, session_name=None, start_date=None, end_date=None):
        """Get analytics for trades in a specific session"""
        trades = [t for t in self.trades if t['user_email'] == user_email]
        
        if session_name:
            trades = [t for t in trades if t.get('session') == session_name]
        
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d')
            trades = [t for t in trades if datetime.strptime(t['date'], '%Y-%m-%d') >= start]
            
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d')
            trades = [t for t in trades if datetime.strptime(t['date'], '%Y-%m-%d') <= end]

        if not trades:
            return {
                'total_trades': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'win_rate': 0,
                'total_profit': 0,
                'average_profit': 0,
                'largest_win': 0,
                'largest_loss': 0
            }

        winning_trades = [t for t in trades if t['profit_amount'] > 0]
        losing_trades = [t for t in trades if t['profit_amount'] < 0]
        
        total_profit = sum(t['profit_amount'] for t in trades)
        
        return {
            'total_trades': len(trades),
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'win_rate': (len(winning_trades) / len(trades)) * 100 if trades else 0,
            'total_profit': total_profit,
            'average_profit': total_profit / len(trades) if trades else 0,
            'largest_win': max((t['profit_amount'] for t in winning_trades), default=0),
            'largest_loss': min((t['profit_amount'] for t in losing_trades), default=0)
        }

db = InMemoryDB()

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
        
    if db.find_one('users', {'email': email}):
        return jsonify({'error': 'Email already registered'}), 400
        
    user = {
        'email': email,
        'password_hash': generate_password_hash(password),
        'name': email.split('@')[0],
        'role': 'user',
        'created_at': datetime.utcnow()
    }
    
    db.insert_one('users', user)
    
    return jsonify({
        'message': 'Registration successful',
        'email': email,
        'name': user['name']
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
        
    user = db.find_one('users', {'email': email})
    if not user:
        return jsonify({'error': 'Invalid email or password'}), 401
        
    if not check_password_hash(user['password_hash'], password):
        return jsonify({'error': 'Invalid email or password'}), 401
        
    return jsonify({
        'message': 'Login successful',
        'email': email,
        'name': user['name'],
        'role': user['role']
    })

@app.route('/api/change-password', methods=['POST'])
def change_password():
    data = request.json
    email = data.get('email')
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')
    
    if not all([email, current_password, new_password]):
        return jsonify({'error': 'All fields are required'}), 400
    
    user = db.find_one('users', {'email': email})
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if not check_password_hash(user['password_hash'], current_password):
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    db.update_one(
        'users',
        {'email': email},
        {'$set': {'password_hash': generate_password_hash(new_password)}}
    )
    
    return jsonify({'message': 'Password changed successfully'})

@app.route('/api/users', methods=['GET'])
def get_users():
    auth_email = request.headers.get('X-User-Email')
    user = db.find_one('users', {'email': auth_email})
    
    if not user or user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    
    users = db.find('users')
    return jsonify(users)

@app.route('/api/users/<email>', methods=['DELETE'])
def delete_user(email):
    auth_email = request.headers.get('X-User-Email')
    user = db.find_one('users', {'email': auth_email})
    
    if not user or user['role'] != 'admin':
        return jsonify({'error': 'Unauthorized'}), 401
    
    if email == 'asokoli54@gmail.com':
        return jsonify({'error': 'Cannot delete admin account'}), 400
    
    result = db.delete_one('users', {'email': email})
    if result.deleted_count:
        return jsonify({'message': 'User deleted successfully'})
    
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/accounts', methods=['GET'])
def get_accounts():
    auth_email = request.headers.get('X-User-Email')
    accounts = [account for account in db.accounts.values() if account['user_email'] == auth_email]
    return jsonify(accounts)

@app.route('/api/accounts', methods=['POST'])
def create_account():
    auth_email = request.headers.get('X-User-Email')
    account_data = request.json
    account = {
        'id': len(db.accounts) + 1,
        'user_email': auth_email,
        'name': account_data.get('name', 'New Account'),
        'created_at': datetime.utcnow()
    }
    db.accounts[account['id']] = account
    return jsonify(account), 201

@app.route('/api/accounts/<account_id>/trades', methods=['GET'])
def get_trades(account_id):
    auth_email = request.headers.get('X-User-Email')
    if not auth_email:
        return jsonify({'error': 'No user email provided'}), 401

    session = request.args.get('session')
    profit_filter = request.args.get('profit_filter')  # 'wins' or 'losses'
    sort_by = request.args.get('sort_by', 'date')  # date, profit, session
    sort_order = request.args.get('sort_order', 'desc')  # asc or desc
    
    try:
        # Filter trades by account and user
        trades = [trade for trade in db.trades if trade['account_id'] == account_id and trade['user_email'] == auth_email]
        
        # Apply session filter if specified
        if session:
            trades = [trade for trade in trades if trade.get('session') == session]
        
        # Apply profit filter if specified
        if profit_filter:
            if profit_filter == 'wins':
                trades = [trade for trade in trades if trade['profit_amount'] > 0]
            elif profit_filter == 'losses':
                trades = [trade for trade in trades if trade['profit_amount'] < 0]
        
        # Sort trades
        if sort_by == 'profit':
            trades.sort(key=lambda x: x['profit_amount'], reverse=(sort_order == 'desc'))
        elif sort_by == 'session':
            trades.sort(key=lambda x: x.get('session', ''), reverse=(sort_order == 'desc'))
        else:  # sort by date
            trades.sort(key=lambda x: x['date'], reverse=(sort_order == 'desc'))
        
        # Calculate summaries
        total_pl = sum(trade['profit_amount'] for trade in trades)
        winning_trades = [t for t in trades if t['profit_amount'] > 0]
        losing_trades = [t for t in trades if t['profit_amount'] < 0]
        
        session_summary = {}
        if trades:
            for trade in trades:
                session_name = trade.get('session', 'Other')
                if session_name not in session_summary:
                    session_summary[session_name] = {
                        'total_pl': 0,
                        'count': 0,
                        'wins': 0,
                        'losses': 0
                    }
                session_summary[session_name]['total_pl'] += trade['profit_amount']
                session_summary[session_name]['count'] += 1
                if trade['profit_amount'] > 0:
                    session_summary[session_name]['wins'] += 1
                elif trade['profit_amount'] < 0:
                    session_summary[session_name]['losses'] += 1
        
        return jsonify({
            'trades': trades or [],  # Ensure we always return an array
            'total_pl': total_pl,
            'count': len(trades),
            'winning_trades': len(winning_trades),
            'losing_trades': len(losing_trades),
            'session_summary': session_summary
        })
    except Exception as e:
        print(f"Error processing trades: {e}")
        return jsonify({
            'trades': [],
            'total_pl': 0,
            'count': 0,
            'winning_trades': 0,
            'losing_trades': 0,
            'session_summary': {}
        })

@app.route('/api/accounts/<account_id>/trades', methods=['POST'])
def add_trade(account_id):
    auth_email = request.headers.get('X-User-Email')
    trade = request.json
    
    # Parse the trade time from the date
    trade_date = datetime.strptime(trade['date'], '%Y-%m-%d')
    trade_time = time(
        int(trade.get('hour', 0)),
        int(trade.get('minute', 0))
    )
    trade_datetime = datetime.combine(trade_date.date(), trade_time)
    
    # Determine the trading session
    session = get_trading_session(trade_datetime)
    
    trade.update({
        'id': len(db.trades) + 1,
        'account_id': account_id,
        'user_email': auth_email,
        'created_at': datetime.utcnow(),
        'session': session,
        'session_color': TRADING_SESSIONS.get(session, {}).get('color', '#6b7280')  # Default gray
    })
    
    if 'profit_amount' in trade:
        trade['profit_amount'] = float(trade['profit_amount'])
    
    db.trades.append(trade)
    return jsonify(trade), 201

@app.route('/api/accounts/<account_id>/trades/<trade_id>', methods=['DELETE'])
def delete_trade(account_id, trade_id):
    auth_email = request.headers.get('X-User-Email')
    trade_id = int(trade_id)
    
    for i, trade in enumerate(db.trades):
        if trade['id'] == trade_id and trade['account_id'] == account_id and trade['user_email'] == auth_email:
            del db.trades[i]
            return jsonify({'message': 'Trade deleted'})
    
    return jsonify({'error': 'Trade not found'}), 404

@app.route('/api/analytics/sessions', methods=['GET'])
def get_session_analytics():
    auth_email = request.headers.get('X-User-Email')
    session = request.args.get('session')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    analytics = db.get_session_analytics(auth_email, session, start_date, end_date)
    return jsonify(analytics)

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    return jsonify({
        'sessions': [
            {
                'name': name,
                'start': session['start'].strftime('%H:%M'),
                'end': session['end'].strftime('%H:%M'),
                'color': session['color']
            }
            for name, session in TRADING_SESSIONS.items()
        ]
    })

if __name__ == '__main__':
    print("Server is running on http://localhost:5000")
    app.run(debug=True, port=5000) 