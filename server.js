require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Define schemas
const sessionSchema = new mongoose.Schema({
  name: String,
  start: String,
  end: String,
  color: String
});

const tradeSchema = new mongoose.Schema({
  market: String,
  pair: String,
  position: String,
  entry: Number,
  exit: Number,
  profit_loss: String,
  profit_amount: Number,
  risk_reward: String,
  date: String,
  strategy: String,
  image_url: String,
  notes: String,
  hour: Number,
  minute: Number,
  session: String,
  session_color: String,
  account_id: String,
  user_email: String
});

const accountSchema = new mongoose.Schema({
  name: String,
  user_email: String
});

// Define models
const Session = mongoose.model('Session', sessionSchema);
const Trade = mongoose.model('Trade', tradeSchema);
const Account = mongoose.model('Account', accountSchema);

// Routes
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await Session.find();
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching sessions' });
  }
});

app.get('/api/accounts', async (req, res) => {
  try {
    const userEmail = req.headers['x-user-email'];
    const accounts = await Account.find({ user_email: userEmail });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching accounts' });
  }
});

app.post('/api/accounts', async (req, res) => {
  try {
    const { name } = req.body;
    const userEmail = req.headers['x-user-email'];
    const account = new Account({ name, user_email: userEmail });
    await account.save();
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Error creating account' });
  }
});

app.get('/api/accounts/:accountId/trades', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { session, profit_filter } = req.query;
    const userEmail = req.headers['x-user-email'];

    let query = { account_id: accountId, user_email: userEmail };
    
    if (session) {
      query.session = session;
    }
    
    if (profit_filter === 'wins') {
      query.profit_amount = { $gt: 0 };
    } else if (profit_filter === 'losses') {
      query.profit_amount = { $lt: 0 };
    }

    const trades = await Trade.find(query).sort({ date: -1 });
    const total_pl = trades.reduce((sum, trade) => sum + trade.profit_amount, 0);

    // Calculate session summary
    const session_summary = {};
    trades.forEach(trade => {
      if (!session_summary[trade.session]) {
        session_summary[trade.session] = {
          total_pl: 0,
          count: 0,
          wins: 0,
          losses: 0
        };
      }
      session_summary[trade.session].total_pl += trade.profit_amount;
      session_summary[trade.session].count += 1;
      if (trade.profit_amount > 0) {
        session_summary[trade.session].wins += 1;
      } else if (trade.profit_amount < 0) {
        session_summary[trade.session].losses += 1;
      }
    });

    res.json({ trades, total_pl, session_summary });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching trades' });
  }
});

app.post('/api/accounts/:accountId/trades', async (req, res) => {
  try {
    const { accountId } = req.params;
    const tradeData = { ...req.body, account_id: accountId };
    const trade = new Trade(tradeData);
    await trade.save();
    res.json(trade);
  } catch (error) {
    res.status(500).json({ error: 'Error adding trade' });
  }
});

app.delete('/api/accounts/:accountId/trades/:tradeId', async (req, res) => {
  try {
    const { accountId, tradeId } = req.params;
    await Trade.findByIdAndDelete(tradeId);
    res.json({ message: 'Trade deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting trade' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 