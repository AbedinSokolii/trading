import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/solid'
import Navbar from './components/Navbar'
import ImageUpload from './components/ImageUpload'
import Auth from './components/Auth'
import { ThemeProvider } from './context/ThemeContext'
import AdminPanel from './components/AdminPanel'
import SessionAnalytics from './components/SessionAnalytics'
import { API_URL } from './config'

interface Trade {
  id: number
  market: string
  pair: string
  position: 'Buy' | 'Sell'
  entry: number
  exit: number
  profit_loss: string
  profit_amount: number
  risk_reward: string
  date: string
  strategy: string
  image_url: string | null
  notes: string
  hour?: number
  minute?: number
  session?: string
  session_color?: string
}

interface Account {
  id: string
  name: string
}

interface Session {
  name: string
  start: string
  end: string
  color: string
}

const MARKET_OPTIONS = ['Forex', 'Crypto', 'Commodities', 'Futures'];
const RISK_REWARD_OPTIONS = ['1:1', '1:2', '1:3', '1:4', '1:5', '2:1', '3:1'];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [userName, setUserName] = useState<string>('Trader')
  const [profilePic, setProfilePic] = useState<string | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [currentAccount, setCurrentAccount] = useState<Account>({ id: '', name: 'Main Account' })
  const [newTrade, setNewTrade] = useState<Trade>({
    id: 0,
    market: '',
    pair: '',
    position: 'Buy',
    entry: 0,
    exit: 0,
    profit_loss: '',
    profit_amount: 0,
    risk_reward: '',
    date: '',
    hour: new Date().getHours(),
    minute: new Date().getMinutes(),
    strategy: '',
    image_url: null,
    notes: ''
  })
  const [previousPairs, setPreviousPairs] = useState<Set<string>>(new Set())
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    console.log('Authentication state:', isAuthenticated);
    console.log('Current account:', currentAccount);
    if (isAuthenticated) {
      fetchAccounts().then(() => {
        console.log('Accounts fetched');
      });
      fetchSessions()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (accounts.length > 0 && !currentAccount.id) {
      setCurrentAccount(accounts[0]);
    }
  }, [accounts]);

  useEffect(() => {
    console.log('Current account changed:', currentAccount);
    if (isAuthenticated && currentAccount.id) {
      fetchTrades()
    }
  }, [currentAccount.id, isAuthenticated])

  useEffect(() => {
    const pairs = new Set<string>()
    Object.values(accounts).forEach(account => {
      trades.forEach(trade => {
        if (trade.pair) {
          pairs.add(trade.pair)
        }
      })
    })
    setPreviousPairs(pairs)
  }, [accounts, trades])

  const handleLogin = (email: string) => {
    console.log('Login successful:', email);
    setIsAuthenticated(true)
    setUserEmail(email)
    setUserName(email.split('@')[0])
    setIsAdmin(email === 'asokoli54@gmail.com')
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setUserEmail('')
    setUserName('Trader')
    setProfilePic(null)
  }

  const handleUpdateProfile = (name: string, pic: string | null) => {
    setUserName(name)
    setProfilePic(pic)
  }

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/accounts`, {
        headers: {
          'X-User-Email': userEmail
        }
      });
      setAccounts(response.data);
      if (response.data.length > 0) {
        setCurrentAccount(response.data[0]);
      } else {
        // Create default account if none exists
        const newAccountResponse = await axios.post(`${API_URL}/api/accounts`, 
          { name: 'Main Account' },
          { headers: { 'X-User-Email': userEmail } }
        );
        setAccounts([newAccountResponse.data]);
        setCurrentAccount(newAccountResponse.data);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchTrades = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/accounts/${currentAccount.id}/trades`, {
        headers: {
          'X-User-Email': userEmail
        }
      });
      setTrades(response.data.trades || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setTrades([]);
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sessions`);
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleAccountChange = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (account) {
      setCurrentAccount(account)
    } else {
      try {
        const response = await axios.post('http://localhost:5000/api/accounts', {
          id: accountId,
          name: `Account ${accounts.length + 1}`
        })
        setAccounts([...accounts, response.data])
        setCurrentAccount(response.data)
      } catch (error) {
        console.error('Error creating account:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount.id) {
      alert('Please wait while we set up your account...');
      return;
    }
    try {
      const tradeData = {
        ...newTrade,
        pair: newTrade.pair.toUpperCase(),
        account_id: currentAccount.id,
        user_email: userEmail
      };
      
      await axios.post(`${API_URL}/api/accounts/${currentAccount.id}/trades`, tradeData, {
        headers: {
          'X-User-Email': userEmail
        }
      });
      
      await fetchTrades();
      setNewTrade({
        id: 0,
        market: '',
        pair: '',
        position: 'Buy',
        entry: 0,
        exit: 0,
        profit_loss: '',
        profit_amount: 0,
        risk_reward: '',
        date: '',
        hour: new Date().getHours(),
        minute: new Date().getMinutes(),
        strategy: '',
        image_url: null,
        notes: '',
        session: '',
        session_color: ''
      });
    } catch (error) {
      console.error('Error adding trade:', error);
      alert('Error adding trade. Please make sure all fields are filled correctly.');
    }
  };

  const handleDelete = async (tradeId: number) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      try {
        await axios.delete(`http://localhost:5000/api/accounts/${currentAccount.id}/trades/${tradeId}`)
        fetchTrades()
      } catch (error) {
        console.error('Error deleting trade:', error)
      }
    }
  }

  const ImageModal = ({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) => {
    const [scale, setScale] = useState(1);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
        <div className="relative" onClick={e => e.stopPropagation()}>
          <img
            src={imageUrl}
            alt="Trade Chart"
            style={{ transform: `scale(${scale})` }}
            className="max-h-[80vh] max-w-[90vw] object-contain transition-transform duration-200"
          />
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
            <button
              onClick={handleZoomOut}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg opacity-75 hover:opacity-100 transition-opacity"
            >
              Zoom Out
            </button>
            <button
              onClick={handleZoomIn}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg opacity-75 hover:opacity-100 transition-opacity"
            >
              Zoom In
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 transition-colors duration-200">
        {!isAuthenticated ? (
          <Auth onLogin={handleLogin} />
        ) : (
          <>
            <Navbar
              accounts={accounts}
              currentAccount={currentAccount}
              onAccountChange={handleAccountChange}
              userEmail={userEmail}
              userName={userName}
              profilePic={profilePic}
              onLogout={handleLogout}
              onUpdateProfile={handleUpdateProfile}
            />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {isAdmin && (
                <div className="mb-8">
                  <AdminPanel userEmail={userEmail} />
                </div>
              )}
              
              <div className="mb-8">
                <SessionAnalytics 
                  userEmail={userEmail} 
                  currentAccount={currentAccount} 
                />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Add New Trade Form */}
                <div className="lg:col-span-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sticky top-8">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Add New Trade</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Market</label>
                          <select
                            value={newTrade.market}
                            onChange={(e) => setNewTrade({...newTrade, market: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                            required
                          >
                            <option value="">Select Market</option>
                            {MARKET_OPTIONS.map((market) => (
                              <option key={market} value={market}>{market}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trading Pair</label>
                          <input
                            type="text"
                            placeholder="e.g., EUR/USD"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                            value={newTrade.pair}
                            onChange={(e) => setNewTrade({...newTrade, pair: e.target.value.toUpperCase()})}
                            list="previous-pairs"
                            required
                          />
                          <datalist id="previous-pairs">
                            {Array.from(previousPairs).map((pair) => (
                              <option key={pair} value={pair} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                          <select
                            value={newTrade.position}
                            onChange={(e) => setNewTrade({...newTrade, position: e.target.value as 'Buy' | 'Sell'})}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                            required
                          >
                            <option value="Buy">Buy</option>
                            <option value="Sell">Sell</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entry Price</label>
                            <input
                              type="number"
                              step="0.0001"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                              value={newTrade.entry || ''}
                              onChange={(e) => setNewTrade({...newTrade, entry: parseFloat(e.target.value)})}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exit Price</label>
                            <input
                              type="number"
                              step="0.0001"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                              value={newTrade.exit || ''}
                              onChange={(e) => setNewTrade({...newTrade, exit: parseFloat(e.target.value)})}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profit Amount</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                className="w-full px-4 py-2 pl-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                                value={newTrade.profit_amount || ''}
                                onChange={(e) => setNewTrade({...newTrade, profit_amount: parseFloat(e.target.value)})}
                                required
                              />
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                                $
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk/Reward</label>
                            <select
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                              value={newTrade.risk_reward}
                              onChange={(e) => setNewTrade({...newTrade, risk_reward: e.target.value})}
                              required
                            >
                              <option value="">Select Ratio</option>
                              {RISK_REWARD_OPTIONS.map((ratio) => (
                                <option key={ratio} value={ratio}>{ratio}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                            <input
                              type="date"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                              value={newTrade.date}
                              onChange={(e) => setNewTrade({...newTrade, date: e.target.value})}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Time</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                min="0"
                                max="23"
                                placeholder="HH"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                                value={newTrade.hour}
                                onChange={(e) => setNewTrade({...newTrade, hour: parseInt(e.target.value)})}
                                required
                              />
                              <input
                                type="number"
                                min="0"
                                max="59"
                                placeholder="MM"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                                value={newTrade.minute}
                                onChange={(e) => setNewTrade({...newTrade, minute: parseInt(e.target.value)})}
                                required
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Strategy</label>
                          <input
                            type="text"
                            placeholder="e.g., Break and Retest"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                            value={newTrade.strategy}
                            onChange={(e) => setNewTrade({...newTrade, strategy: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chart Image</label>
                          <ImageUpload
                            onImageUpload={(imageUrl) => setNewTrade({...newTrade, image_url: imageUrl})}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trading Session</label>
                          <select
                            value={newTrade.session || ''}
                            onChange={(e) => {
                              const selectedSession = sessions.find(s => s.name === e.target.value);
                              setNewTrade({
                                ...newTrade,
                                session: e.target.value,
                                session_color: selectedSession?.color || '#6b7280'
                              });
                            }}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                          >
                            <option value="">Select Session</option>
                            {sessions.map((session) => (
                              <option key={session.name} value={session.name}>
                                {session.name} ({session.start} - {session.end})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                          <textarea
                            placeholder="Add your trade notes here..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-shadow"
                            rows={3}
                            value={newTrade.notes}
                            onChange={(e) => setNewTrade({...newTrade, notes: e.target.value})}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        Add Trade
                      </button>
                    </form>
                  </div>
                </div>

                {/* Trades List */}
                <div className="lg:col-span-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.isArray(trades) && trades.map((trade) => (
                      <div 
                        key={trade.id} 
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 hover:shadow-md transition-all duration-200"
                        style={{ borderLeft: `4px solid ${trade.session_color || '#6b7280'}` }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{trade.market}</h3>
                            <p className="text-gray-600 dark:text-gray-400">{trade.pair}</p>
                            {trade.session && (
                              <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full"
                                    style={{ 
                                      backgroundColor: `${trade.session_color}20`,
                                      color: trade.session_color 
                                    }}>
                                {trade.session}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <button
                              onClick={() => handleDelete(trade.id)}
                              className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                            >
                              <TrashIcon className="w-4 h-4" />
                              Delete
                            </button>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              trade.position === 'Buy' 
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' 
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                              {trade.position}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              trade.profit_amount >= 0 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}>
                              ${Math.abs(trade.profit_amount).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        {trade.image_url && (
                          <div className="relative">
                            <img
                              src={trade.image_url}
                              alt="Trade Chart"
                              className="w-full h-48 object-cover rounded-lg mb-4 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setSelectedImage(trade.image_url);
                                setShowImageModal(true);
                              }}
                            />
                          </div>
                        )}
                        <div className="space-y-2 text-sm">
                          <p className="dark:text-gray-300">
                            <span className="font-medium text-gray-700 dark:text-gray-400">Entry:</span>{' '}
                            <span className="text-gray-600 dark:text-gray-300">{trade.entry}</span>
                          </p>
                          <p className="dark:text-gray-300">
                            <span className="font-medium text-gray-700 dark:text-gray-400">Exit:</span>{' '}
                            <span className="text-gray-600 dark:text-gray-300">{trade.exit}</span>
                          </p>
                          <p className="dark:text-gray-300">
                            <span className="font-medium text-gray-700 dark:text-gray-400">Profit/Loss:</span>{' '}
                            <span className={`${trade.profit_amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              ${trade.profit_amount.toFixed(2)}
                            </span>
                          </p>
                          <p className="dark:text-gray-300">
                            <span className="font-medium text-gray-700 dark:text-gray-400">Risk/Reward:</span>{' '}
                            <span className="text-gray-600 dark:text-gray-300">{trade.risk_reward}</span>
                          </p>
                          <p className="dark:text-gray-300">
                            <span className="font-medium text-gray-700 dark:text-gray-400">Date:</span>{' '}
                            <span className="text-gray-600 dark:text-gray-300">{trade.date}</span>
                          </p>
                          <p className="dark:text-gray-300">
                            <span className="font-medium text-gray-700 dark:text-gray-400">Strategy:</span>{' '}
                            <span className="text-gray-600 dark:text-gray-300">{trade.strategy}</span>
                          </p>
                          {trade.notes && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-gray-600 dark:text-gray-300">{trade.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {showImageModal && selectedImage && (
        <ImageModal imageUrl={selectedImage} onClose={() => setShowImageModal(false)} />
      )}
    </ThemeProvider>
  )
}

export default App 