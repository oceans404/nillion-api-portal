'use client';

import React, { createContext, useContext, useState } from 'react';

// Keplr wallet types
interface KeplrWallet {
  address: string;
  isConnected: boolean;
}

// Extend Window interface for Keplr
declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getOfflineSigner: (chainId: string) => unknown;
      getKey: (chainId: string) => Promise<{
        address: Uint8Array;
        bech32Address: string;
        name: string;
      }>;
      experimentalSuggestChain: (config: unknown) => Promise<void>;
    };
  }
}

interface WalletContextType {
  keplrWallet: KeplrWallet | null;
  connectingKeplr: boolean;
  connectKeplrWallet: () => Promise<void>;
  disconnectKeplrWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const NILLION_CHAIN_CONFIG = {
  chainId: 'nillion-chain-testnet-1',
  chainName: 'Nillion Testnet',
  rpc: 'http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz',
  rest: 'http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz',
  bip44: {
    coinType: 118,
  },
  bech32Config: {
    bech32PrefixAccAddr: 'nillion',
    bech32PrefixAccPub: 'nillionpub',
    bech32PrefixValAddr: 'nillionvaloper',
    bech32PrefixValPub: 'nillionvaloperpub',
    bech32PrefixConsAddr: 'nillionvalcons',
    bech32PrefixConsPub: 'nillionvalconspub',
  },
  currencies: [
    {
      coinDenom: 'NIL',
      coinMinimalDenom: 'unil',
      coinDecimals: 6,
    },
  ],
  feeCurrencies: [
    {
      coinDenom: 'NIL',
      coinMinimalDenom: 'unil',
      coinDecimals: 6,
    },
  ],
  stakeCurrency: {
    coinDenom: 'NIL',
    coinMinimalDenom: 'unil',
    coinDecimals: 6,
  },
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [keplrWallet, setKeplrWallet] = useState<KeplrWallet | null>(null);
  const [connectingKeplr, setConnectingKeplr] = useState<boolean>(false);

  const connectKeplrWallet = async () => {
    if (!window.keplr) {
      alert('Please install Keplr wallet extension');
      return;
    }

    setConnectingKeplr(true);

    try {
      // Try to add the chain to Keplr first
      try {
        await window.keplr.experimentalSuggestChain(NILLION_CHAIN_CONFIG);
      } catch (error) {
        console.log('Chain already exists or user rejected adding chain:', error);
      }

      // Enable the chain
      await window.keplr.enable(NILLION_CHAIN_CONFIG.chainId);

      // Get account info
      const key = await window.keplr.getKey(NILLION_CHAIN_CONFIG.chainId);

      setKeplrWallet({
        address: key.bech32Address,
        isConnected: true,
      });

      console.log('Keplr wallet connected:', key.bech32Address);
    } catch (error) {
      console.error('Failed to connect Keplr wallet:', error);
      alert('Failed to connect Keplr wallet. Please make sure it is installed and unlocked.');
    } finally {
      setConnectingKeplr(false);
    }
  };

  const disconnectKeplrWallet = () => {
    setKeplrWallet(null);
  };

  return (
    <WalletContext.Provider
      value={{
        keplrWallet,
        connectingKeplr,
        connectKeplrWallet,
        disconnectKeplrWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}