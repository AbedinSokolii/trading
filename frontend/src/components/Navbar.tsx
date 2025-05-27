import React, { useState } from 'react';
import { Cog6ToothIcon, SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import Settings from './Settings';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  accounts: Array<{ id: string; name: string }>;
  currentAccount: { id: string; name: string };
  onAccountChange: (accountId: string) => void;
  userEmail: string;
  userName: string;
  profilePic: string | null;
  onLogout: () => void;
  onUpdateProfile: (name: string, pic: string | null) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  accounts,
  currentAccount,
  onAccountChange,
  userEmail,
  userName,
  profilePic,
  onLogout,
  onUpdateProfile,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <>
      <nav className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <span className={`text-2xl font-bold bg-gradient-to-r ${isDarkMode ? 'from-blue-400 to-blue-200' : 'from-blue-600 to-blue-400'} bg-clip-text text-transparent`}>
                Trading Journal
              </span>
              
              <div className="hidden md:flex items-center space-x-4">
                <select
                  value={currentAccount.id}
                  onChange={(e) => onAccountChange(e.target.value)}
                  className={`block w-48 px-3 py-2 ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } border rounded-lg shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors`}
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const name = prompt('Enter new account name:');
                    if (name) {
                      const newAccount = {
                        id: Date.now().toString(),
                        name,
                      };
                      onAccountChange(newAccount.id);
                    }
                  }}
                  className={`px-4 py-2 ${
                    isDarkMode
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white rounded-lg transition-colors duration-200 text-sm font-medium shadow-sm hover:shadow-md`}
                >
                  New Account
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full ${
                  isDarkMode
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                } transition-colors duration-200`}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {profilePic ? (
                    <img
                      src={profilePic}
                      alt={userName}
                      className="w-8 h-8 rounded-full object-cover border-2 border-blue-500"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-500">
                      <span className="text-sm font-bold text-blue-600">
                        {userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} hidden md:block transition-colors`}>
                    {userName}
                  </span>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={`p-2 ${
                    isDarkMode
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  } rounded-full transition-colors duration-200`}
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={onLogout}
                  className={`px-4 py-2 text-sm font-medium ${
                    isDarkMode
                      ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                      : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                  } rounded-lg transition-colors duration-200`}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userEmail={userEmail}
        userName={userName}
        onUpdateProfile={onUpdateProfile}
      />
    </>
  );
};

export default Navbar; 