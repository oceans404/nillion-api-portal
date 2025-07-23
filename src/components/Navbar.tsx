'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';
import { useWallet } from './WalletProvider';
import { useNetwork } from './NetworkProvider';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const {
    keplrWallet,
    connectingKeplr,
    connectKeplrWallet,
    disconnectKeplrWallet,
  } = useWallet();
  const { network, switchNetwork } = useNetwork();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleNetworkSwitch = async (newNetwork: 'testnet' | 'mainnet') => {
    try {
      await switchNetwork(newNetwork);
    } catch (error) {
      console.error('Failed to switch network:', error);
      // Could show user notification here
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDisconnect = () => {
    disconnectKeplrWallet();
    setShowWalletModal(false);
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
            >
              Nillion API Portal
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* <Link
              href="/api-keys"
              className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium"
            >
              API Keys
            </Link> */}

            {/* Network Switcher */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <select
                  value={network}
                  onChange={(e) =>
                    handleNetworkSwitch(e.target.value as 'testnet' | 'mainnet')
                  }
                  className="appearance-none bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1.5 pr-8 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="testnet">Testnet</option>
                  <option value="mainnet" disabled>
                    Mainnet
                  </option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Keplr Wallet Connection */}
            {!keplrWallet?.isConnected ? (
              <button
                onClick={connectKeplrWallet}
                disabled={connectingKeplr}
                className="bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded text-sm"
              >
                {connectingKeplr ? 'Connecting...' : 'Connect Keplr Wallet'}
              </button>
            ) : (
              <button
                onClick={() => setShowWalletModal(true)}
                className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 group cursor-pointer"
                title="Click to view wallet details"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-100 font-mono">
                    {keplrWallet.address.slice(0, 10)}...
                    {keplrWallet.address.slice(-6)}
                  </span>
                  <svg className="w-3 h-3 text-blue-600 dark:text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Wallet Details Modal */}
      {showWalletModal && keplrWallet?.isConnected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Wallet Details
              </h2>
              <button
                onClick={() => setShowWalletModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Wallet Address
              </label>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <p className="font-mono text-sm text-gray-700 dark:text-gray-300 break-all flex-1">
                  {keplrWallet.address}
                </p>
                <button
                  onClick={() => copyToClipboard(keplrWallet.address)}
                  className="flex-shrink-0 text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded transition-colors duration-200"
                  title="Copy address"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowWalletModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Close
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
