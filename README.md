# Trading Journal App

A web application for tracking and analyzing trading performance across different market sessions.

## Features

- Track trades across different sessions (London, New York, Asia)
- Analyze win rates and profit/loss by session
- Upload chart images for trade documentation
- Track multiple trading accounts
- Real-time analytics and performance metrics

## Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
npm install
npm start
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=your_backend_url
```

### Backend (.env)
```
MONGODB_URI=your_mongodb_uri
PORT=5000
```

## Technologies Used

- Frontend:
  - React with TypeScript
  - Tailwind CSS for styling
  - Axios for API calls
  - Heroicons for icons
  
- Backend:
  - Python Flask
  - Flask-CORS for cross-origin requests 