import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface Session {
  name: string;
  start: string;
  end: string;
  color: string;
}

interface Trade {
  id: number;
  market: string;
  pair: string;
  position: 'Buy' | 'Sell';
  profit_amount: number;
  date: string;
  session?: string;
  session_color?: string;
}

interface Analytics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit: number;
  average_profit: number;
  largest_win: number;
  largest_loss: number;
}

interface SessionAnalyticsProps {
  userEmail: string;
  currentAccount: { id: string };
}

const SessionAnalytics: React.FC<SessionAnalyticsProps> = ({ userEmail, currentAccount }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [profitFilter, setProfitFilter] = useState<string>('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [totalPL, setTotalPL] = useState<number>(0);

  useEffect(() => {
    fetchSessions();
    
    // Add ESC key listener
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMinimized(true);
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  useEffect(() => {
    if (currentAccount.id) {
      fetchFilteredTrades();
    }
  }, [selectedSession, profitFilter, currentAccount.id]);

  const fetchSessions = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/sessions`);
      setSessions(response.data.sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchFilteredTrades = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/accounts/${currentAccount.id}/trades`, {
        headers: {
          'X-User-Email': userEmail
        },
        params: {
          session: selectedSession,
          profit_filter: profitFilter
        }
      });

      const trades = response.data.trades || [];
      setFilteredTrades(trades);
      setTotalPL(response.data.total_pl);
      
      // Calculate analytics
      const winningTrades = trades.filter((t: Trade) => t.profit_amount > 0);
      const losingTrades = trades.filter((t: Trade) => t.profit_amount < 0);
      const totalTrades = trades.length;
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

      setAnalytics({
        total_trades: totalTrades,
        winning_trades: winningTrades.length,
        losing_trades: losingTrades.length,
        win_rate: winRate,
        total_profit: response.data.total_pl,
        average_profit: totalTrades > 0 ? response.data.total_pl / totalTrades : 0,
        largest_win: Math.max(...winningTrades.map((t: Trade) => t.profit_amount), 0),
        largest_loss: Math.min(...losingTrades.map((t: Trade) => t.profit_amount), 0)
      });
    } catch (error) {
      console.error('Error fetching filtered trades:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 transition-all duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Session Analytics</h2>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isMinimized ? (
            <ChevronDownIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronUpIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>
      
      <div className={`space-y-6 transition-all duration-300 ${isMinimized ? 'h-0 overflow-hidden opacity-0' : 'opacity-100'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Trading Session
            </label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Sessions</option>
              {sessions.map((session) => (
                <option key={session.name} value={session.name}>
                  {session.name} ({session.start} - {session.end})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Show Only
            </label>
            <select
              value={profitFilter}
              onChange={(e) => setProfitFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Trades</option>
              <option value="wins">Winning Trades</option>
              <option value="losses">Losing Trades</option>
            </select>
          </div>
        </div>

        {analytics && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Win Rate</h3>
                <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
                  {analytics.win_rate.toFixed(1)}%
                </p>
                <div className="mt-1 text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    {analytics.winning_trades} Wins
                  </span>
                  {' / '}
                  <span className="text-red-600 dark:text-red-400">
                    {analytics.losing_trades} Losses
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total P/L</h3>
                <p className={`mt-1 text-2xl font-semibold ${
                  totalPL >= 0 
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  ${totalPL.toFixed(2)}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {analytics.total_trades} Total Trades
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Win</h3>
                <p className="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
                  ${(analytics.largest_win / (analytics.winning_trades || 1)).toFixed(2)}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Per Winning Trade
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Loss</h3>
                <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
                  ${Math.abs(analytics.largest_loss / (analytics.losing_trades || 1)).toFixed(2)}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Per Losing Trade
                </p>
              </div>
            </div>

            {/* Filtered Trades List */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {selectedSession ? `${selectedSession} Session Trades` : 'All Trades'}
                {profitFilter === 'wins' && ' (Winning Trades)'}
                {profitFilter === 'losses' && ' (Losing Trades)'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTrades.map((trade) => (
                  <div 
                    key={trade.id}
                    className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg"
                    style={{ borderLeft: `4px solid ${trade.session_color || '#6b7280'}` }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{trade.pair}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{trade.market}</p>
                        {trade.session && (
                          <span 
                            className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full"
                            style={{ 
                              backgroundColor: `${trade.session_color}20`,
                              color: trade.session_color 
                            }}
                          >
                            {trade.session}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          trade.profit_amount >= 0 
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          ${trade.profit_amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {trade.date}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionAnalytics; 