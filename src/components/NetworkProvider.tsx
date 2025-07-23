'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Network = 'testnet' | 'mainnet';

interface NetworkConfig {
  chainId: string;
  chainName: string;
  rpcEndpoint: string;
  nilauthEndpoint: string;
  bech32Prefix: string;
}

const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  testnet: {
    chainId: 'nillion-chain-testnet-1',
    chainName: 'Nillion Testnet',
    rpcEndpoint: 'http://rpc.testnet.nilchain-rpc-proxy.nilogy.xyz',
    nilauthEndpoint: 'https://nilauth.sandbox.app-cluster.sandbox.nilogy.xyz',
    bech32Prefix: 'nillion',
  },
  mainnet: {
    chainId: 'nillion-1',
    chainName: 'Nillion Mainnet',
    rpcEndpoint: 'https://nilchain-rpc-proxy.nillion.network',
    nilauthEndpoint: 'https://nilauth.nillion.network',
    bech32Prefix: 'nillion',
  },
};

interface NetworkContextType {
  network: Network;
  networkConfig: NetworkConfig;
  switchNetwork: (network: Network) => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetwork] = useState<Network>('testnet');

  // Load network preference from localStorage
  useEffect(() => {
    const savedNetwork = localStorage.getItem('nillion-network') as Network;
    // For now, force testnet since mainnet endpoints are not working
    if (savedNetwork === 'testnet') {
      setNetwork('testnet');
    } else {
      setNetwork('testnet');
      localStorage.setItem('nillion-network', 'testnet');
    }
  }, []);

  // Save network preference to localStorage
  useEffect(() => {
    localStorage.setItem('nillion-network', network);
  }, [network]);

  const switchNetwork = async (newNetwork: Network) => {
    // For now, prevent switching to mainnet since endpoints are not working
    if (newNetwork === 'mainnet') {
      console.warn('Mainnet is not available yet');
      return;
    }
    
    const newConfig = NETWORK_CONFIGS[newNetwork];
    
    // Try to switch Keplr to the new network
    if (typeof window !== 'undefined' && window.keplr) {
      try {
        // First try to switch to the network
        await window.keplr.enable(newConfig.chainId);
      } catch {
        // If the network doesn't exist in Keplr, suggest adding it
        try {
          await window.keplr.experimentalSuggestChain({
            chainId: newConfig.chainId,
            chainName: newConfig.chainName,
            rpc: newConfig.rpcEndpoint,
            rest: newConfig.rpcEndpoint,
            bip44: {
              coinType: 118,
            },
            bech32Config: {
              bech32PrefixAccAddr: newConfig.bech32Prefix,
              bech32PrefixAccPub: `${newConfig.bech32Prefix}pub`,
              bech32PrefixValAddr: `${newConfig.bech32Prefix}valoper`,
              bech32PrefixValPub: `${newConfig.bech32Prefix}valoperpub`,
              bech32PrefixConsAddr: `${newConfig.bech32Prefix}valcons`,
              bech32PrefixConsPub: `${newConfig.bech32Prefix}valconspub`,
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
          });
          
          // After suggesting the chain, try to enable it
          await window.keplr.enable(newConfig.chainId);
        } catch (suggestError) {
          console.error('Failed to suggest or enable chain:', suggestError);
          // Continue with network switch even if Keplr fails
        }
      }
    }
    
    // Update our internal network state
    setNetwork(newNetwork);
  };

  const networkConfig = NETWORK_CONFIGS[network];

  return (
    <NetworkContext.Provider value={{ network, networkConfig, switchNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}