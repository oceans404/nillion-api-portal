'use client';

import { useState, useEffect } from 'react';
import { Keypair, NilauthClient, KeplrPayerBuilder } from '@nillion/nuc';
import { useWallet } from '../../components/WalletProvider';
import { useNetwork } from '../../components/NetworkProvider';

// Types
interface SubscriptionDetails {
  expiresAt?: Date | string;
  renewableAt?: Date | string;
}

interface AppSubscription {
  status: 'active' | 'inactive' | 'unknown';
  details?: SubscriptionDetails;
}

interface AppIdentity {
  name?: string;
  publicKey: string;
  did: string;
  network: 'testnet' | 'mainnet';
  subscriptions: {
    nildb: AppSubscription;
    nilai: AppSubscription;
  };
}

interface NewAppData {
  name: string;
  privateKey: string; // Only used temporarily for display in modal
  publicKey: string;
  did: string; // Only used temporarily for display in modal
  network: 'testnet' | 'mainnet';
}

interface StoredAppData {
  name: string;
  publicKey: string;
  network: 'testnet' | 'mainnet';
}

// Helper function to ensure date is a Date object
const ensureDate = (date: Date | string): Date => {
  return typeof date === 'string' ? new Date(date) : date;
};

// Helper function to format dates in a user-friendly way
const formatFriendlyDate = (date: Date | string): string => {
  const dateObj = ensureDate(date);
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Subscription expired ${Math.abs(diffDays)} days ago`;
  } else if (diffDays === 0) {
    return 'Subscription expires today';
  } else if (diffDays === 1) {
    return 'Subscription expires tomorrow';
  } else if (diffDays < 30) {
    return `Subscription expires in ${diffDays} days`;
  } else {
    const months = Math.floor(diffDays / 30);
    const remainingDays = diffDays % 30;
    if (months === 1 && remainingDays === 0) {
      return 'Subscription expires in 1 month';
    } else if (remainingDays === 0) {
      return `Subscription expires in ${months} months`;
    } else {
      return `Subscription expires in ~${months} months`;
    }
  }
};

const formatShortDate = (date: Date | string): string => {
  const dateObj = ensureDate(date);
  return dateObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      dateObj.getFullYear() !== new Date().getFullYear()
        ? 'numeric'
        : undefined,
  });
};

// Check if a subscription can be renewed (active and renewable date has passed)
const canRenewSubscription = (subscription: AppSubscription): boolean => {
  if (subscription.status !== 'active' || !subscription.details?.renewableAt) {
    return false;
  }

  const renewableDate = ensureDate(subscription.details.renewableAt);
  const now = new Date();

  return now >= renewableDate;
};

export default function ApiKeysPage() {
  const { keplrWallet } = useWallet();
  const { network, networkConfig } = useNetwork();
  const [apps, setApps] = useState<AppIdentity[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showAddExistingModal, setShowAddExistingModal] =
    useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<'nildb' | 'nilai'>(
    'nildb'
  );
  const [appName, setAppName] = useState<string>('');
  const [existingAppName, setExistingAppName] = useState<string>('');
  const [existingPublicKey, setExistingPublicKey] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [addingExisting, setAddingExisting] = useState<boolean>(false);
  const [newAppData, setNewAppData] = useState<NewAppData | null>(null);
  const [subscribingApps, setSubscribingApps] = useState<Set<string>>(
    new Set()
  );
  const [renewingApps, setRenewingApps] = useState<Set<string>>(new Set());
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [showStopTrackingModal, setShowStopTrackingModal] =
    useState<boolean>(false);
  const [appToStopTracking, setAppToStopTracking] =
    useState<AppIdentity | null>(null);

  // Load main app data from localStorage when wallet connects
  useEffect(() => {
    if (keplrWallet?.address) {
      const walletKey = `nillion-main-app-${keplrWallet.address}`;
      const savedMainApp = localStorage.getItem(walletKey);
      if (savedMainApp) {
        try {
          const parsedMainApp: StoredAppData = JSON.parse(savedMainApp);
          // Add network field if it doesn't exist (for backward compatibility)
          if (!parsedMainApp.network) {
            parsedMainApp.network = 'testnet'; // Default to testnet for existing apps
          }
          // Don't load into newAppData - we only show newAppData for temporary display after creation
          setNewAppData(null);
        } catch (error) {
          console.error('Failed to load main app from localStorage:', error);
        }
      }
    }
  }, [keplrWallet?.address]);

  // Save only public key, name, and network to localStorage when app is created
  const saveMainAppData = (appData: NewAppData) => {
    if (keplrWallet?.address) {
      const walletKey = `nillion-main-app-${keplrWallet.address}`;
      const storedData: StoredAppData = {
        name: appData.name,
        publicKey: appData.publicKey,
        network: appData.network,
      };
      localStorage.setItem(walletKey, JSON.stringify(storedData));
    }
  };

  // Load apps from localStorage when wallet connects
  useEffect(() => {
    if (keplrWallet?.address) {
      const walletKey = `nillion-apps-${keplrWallet.address}`;
      const savedApps = localStorage.getItem(walletKey);
      if (savedApps) {
        try {
          const parsedApps = JSON.parse(savedApps);
          const migratedApps = parsedApps.map((app: unknown, index: number) => {
            const appData = app as Partial<AppIdentity>;
            const migrateSubscription = (sub: unknown) => {
              if (typeof sub === 'string') {
                return { status: sub as 'active' | 'inactive' | 'unknown' };
              } else if (sub && typeof sub === 'object') {
                const subObj = sub as Record<string, unknown>;
                const details = subObj.details as
                  | Record<string, unknown>
                  | undefined;
                return {
                  status: (subObj.status as string) || 'unknown',
                  details: details
                    ? {
                        expiresAt: details.expiresAt
                          ? new Date(details.expiresAt as string)
                          : undefined,
                        renewableAt: details.renewableAt
                          ? new Date(details.renewableAt as string)
                          : undefined,
                      }
                    : undefined,
                };
              }
              return { status: 'unknown' as const };
            };

            return {
              ...appData,
              name: appData.name || `App ${parsedApps.length - index}`,
              network:
                (appData as AppIdentity & { network?: string }).network ||
                'testnet', // Default to testnet for existing apps
              subscriptions: {
                nildb: migrateSubscription(appData.subscriptions?.nildb),
                nilai: migrateSubscription(appData.subscriptions?.nilai),
              },
            } as AppIdentity;
          });
          setApps(migratedApps);
          // Don't write back to localStorage during loading - this could cause data loss
        } catch (error) {
          console.error('Failed to load apps from localStorage:', error);
          setApps([]);
        }
      } else {
        setApps([]);
      }
    } else {
      setApps([]);
    }
  }, [keplrWallet?.address]);

  // Auto-load subscription details for all apps when wallet connects and apps are loaded
  useEffect(() => {
    const loadAllSubscriptionDetails = async () => {
      if (!keplrWallet?.isConnected || apps.length === 0 || loadingDetails)
        return;

      // Only load details for apps that need subscription status checked AND match current network
      const appsNeedingDetails = apps.filter(
        (app) =>
          app.network === network && // Only check apps on current network
          (app.subscriptions.nildb.status === 'unknown' ||
            app.subscriptions.nilai.status === 'unknown' ||
            (app.subscriptions.nildb.status === 'active' &&
              !app.subscriptions.nildb.details) ||
            (app.subscriptions.nilai.status === 'active' &&
              !app.subscriptions.nilai.details))
      );

      if (appsNeedingDetails.length === 0) return;

      setLoadingDetails(true);

      try {
        const payer = await new KeplrPayerBuilder()
          .chainId(networkConfig.chainId)
          .rpcEndpoint(networkConfig.rpcEndpoint)
          .build();

        const nilauthClient = await NilauthClient.from(
          networkConfig.nilauthEndpoint,
          payer
        );

        // Check subscription details for all apps in parallel
        const subscriptionChecks = appsNeedingDetails.map(async (app) => {
          try {
            const [nildbStatus, nilaiStatus] = await Promise.all([
              nilauthClient.subscriptionStatus(app.publicKey, 'nildb'),
              nilauthClient.subscriptionStatus(app.publicKey, 'nilai'),
            ]);

            return {
              publicKey: app.publicKey,
              subscriptions: {
                nildb: {
                  status: nildbStatus.subscribed
                    ? ('active' as const)
                    : ('inactive' as const),
                  details:
                    nildbStatus.subscribed && nildbStatus.details
                      ? {
                          expiresAt: new Date(
                            nildbStatus.details.expiresAt.epochMilliseconds
                          ),
                          renewableAt: new Date(
                            nildbStatus.details.renewableAt.epochMilliseconds
                          ),
                        }
                      : undefined,
                },
                nilai: {
                  status: nilaiStatus.subscribed
                    ? ('active' as const)
                    : ('inactive' as const),
                  details:
                    nilaiStatus.subscribed && nilaiStatus.details
                      ? {
                          expiresAt: new Date(
                            nilaiStatus.details.expiresAt.epochMilliseconds
                          ),
                          renewableAt: new Date(
                            nilaiStatus.details.renewableAt.epochMilliseconds
                          ),
                        }
                      : undefined,
                },
              },
            };
          } catch (error) {
            console.error(
              `Failed to check subscription status for app "${app.name}":`,
              error
            );
            return null;
          }
        });

        const results = await Promise.all(subscriptionChecks);

        // Update apps with subscription details
        setApps((prevApps) =>
          prevApps.map((app) => {
            const result = results.find((r) => r?.publicKey === app.publicKey);
            if (result) {
              return {
                ...app,
                subscriptions: result.subscriptions,
              };
            }
            return app;
          })
        );
      } catch (error) {
        console.error('Failed to load subscription details:', error);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadAllSubscriptionDetails();
  }, [
    apps,
    keplrWallet?.isConnected,
    loadingDetails,
    network,
    networkConfig.chainId,
    networkConfig.nilauthEndpoint,
    networkConfig.rpcEndpoint,
  ]);

  const createNewApp = async () => {
    if (!keplrWallet?.isConnected) {
      alert('Please connect your Keplr wallet first');
      return;
    }

    if (!appName.trim()) {
      alert('Please enter an app name');
      return;
    }

    if (
      apps.some(
        (app) =>
          app.name && app.name.toLowerCase() === appName.trim().toLowerCase()
      )
    ) {
      alert(
        'An app with this name already exists. Please choose a different name.'
      );
      return;
    }

    setCreating(true);
    setNewAppData(null);

    try {
      const keypair = Keypair.generate();
      const identity = {
        name: appName.trim(),
        privateKey: keypair.privateKey('hex'),
        publicKey: keypair.publicKey('hex'),
        did: keypair.toDidString(),
        network: network,
      };

      const payer = await new KeplrPayerBuilder()
        .chainId(networkConfig.chainId)
        .rpcEndpoint(networkConfig.rpcEndpoint)
        .build();

      const nilauthClient = await NilauthClient.from(
        networkConfig.nilauthEndpoint,
        payer
      );

      await nilauthClient.payAndValidate(
        keypair.publicKey('hex'),
        selectedService
      );

      console.log(
        `Successfully created app and subscribed to ${selectedService.toUpperCase()}!`
      );

      // Get subscription details for the newly subscribed service
      let subscriptionDetails = undefined;
      try {
        const statusResponse = await nilauthClient.subscriptionStatus(
          keypair.publicKey('hex'),
          selectedService
        );
        if (statusResponse.subscribed && statusResponse.details) {
          subscriptionDetails = {
            expiresAt: new Date(
              statusResponse.details.expiresAt.epochMilliseconds
            ),
            renewableAt: new Date(
              statusResponse.details.renewableAt.epochMilliseconds
            ),
          };
        }
      } catch (error) {
        console.log('Could not fetch subscription details:', error);
      }

      setNewAppData(identity);
      saveMainAppData(identity); // Save only public key, name, and network

      const newApp: AppIdentity = {
        name: identity.name,
        publicKey: identity.publicKey,
        did: identity.did,
        network: network, // Track which network this app was created on
        subscriptions: {
          nildb: {
            status: selectedService === 'nildb' ? 'active' : 'inactive',
            details:
              selectedService === 'nildb' ? subscriptionDetails : undefined,
          },
          nilai: {
            status: selectedService === 'nilai' ? 'active' : 'inactive',
            details:
              selectedService === 'nilai' ? subscriptionDetails : undefined,
          },
        },
      };

      const updatedApps = [newApp, ...apps];
      setApps(updatedApps);

      // Save to localStorage
      if (keplrWallet?.address) {
        const walletKey = `nillion-apps-${keplrWallet.address}`;
        localStorage.setItem(walletKey, JSON.stringify(updatedApps));
      }

      setShowModal(false);
      setAppName('');
    } catch (error) {
      console.error(
        `Failed to create app with ${selectedService} subscription:`,
        error
      );
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (
        errorMessage.includes('rejected') ||
        errorMessage.includes('denied')
      ) {
        alert('Transaction was cancelled or rejected in Keplr wallet');
      } else if (errorMessage.includes('insufficient')) {
        alert('Insufficient funds in your wallet to complete the subscription');
      } else {
        alert(`Failed to create app: ${errorMessage}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const downloadAppData = () => {
    if (!newAppData) return;

    const content = `Nillion App Identity
App Name: ${newAppData.name}
Network: ${newAppData.network.toUpperCase()}
Created: ${new Date().toISOString()}

Private Key:
${newAppData.privateKey}

Public Key:
${newAppData.publicKey}

DID (Decentralized Identifier):
${newAppData.did}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nillion-app-${newAppData.name.replace(
      /[^a-zA-Z0-9]/g,
      '_'
    )}-${newAppData.network}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const closeNewAppModal = () => {
    setNewAppData(null);
    // Don't clear localStorage - we want to keep the main app data (name, publicKey, network)
  };

  const handleStopTrackingApp = (app: AppIdentity) => {
    setAppToStopTracking(app);
    setShowStopTrackingModal(true);
  };

  const confirmStopTracking = () => {
    if (appToStopTracking && keplrWallet?.address) {
      // Remove from apps state and update localStorage
      setApps((prev) => {
        const updatedApps = prev.filter(
          (app) => app.publicKey !== appToStopTracking.publicKey
        );

        // Update localStorage with the filtered apps
        const walletKey = `nillion-apps-${keplrWallet.address}`;
        localStorage.setItem(walletKey, JSON.stringify(updatedApps));

        return updatedApps;
      });

      // Close modal and reset state
      setShowStopTrackingModal(false);
      setAppToStopTracking(null);
    }
  };

  const cancelStopTracking = () => {
    setShowStopTrackingModal(false);
    setAppToStopTracking(null);
  };

  const addExistingApp = async () => {
    if (!existingAppName.trim()) {
      alert('Please enter an app name');
      return;
    }

    if (!existingPublicKey.trim()) {
      alert('Please enter a public key');
      return;
    }

    // Validate public key format (basic hex validation)
    if (!/^[0-9a-fA-F]{66}$/.test(existingPublicKey.trim())) {
      alert('Please enter a valid public key (66 character hex string)');
      return;
    }

    // Check if app with this name already exists
    if (
      apps.some(
        (app) =>
          app.name &&
          app.name.toLowerCase() === existingAppName.trim().toLowerCase()
      )
    ) {
      alert(
        'An app with this name already exists. Please choose a different name.'
      );
      return;
    }

    // Check if app with this public key already exists
    if (apps.some((app) => app.publicKey === existingPublicKey.trim())) {
      alert('An app with this public key already exists.');
      return;
    }

    setAddingExisting(true);

    try {
      const publicKey = existingPublicKey.trim();
      const name = existingAppName.trim();

      console.log(
        `Adding existing app "${name}" with public key: ${publicKey}`
      );

      // Create app with unknown subscription status - will be checked by the UI later
      const newApp: AppIdentity = {
        name,
        publicKey,
        did: `Unknown DID for ${name}`, // Placeholder DID
        network: network, // Track which network this app was added on
        subscriptions: {
          nildb: {
            status: 'unknown' as const,
            details: undefined,
          },
          nilai: {
            status: 'unknown' as const,
            details: undefined,
          },
        },
      };

      const updatedApps = [newApp, ...apps];
      setApps(updatedApps);

      // Save to localStorage
      if (keplrWallet?.address) {
        const walletKey = `nillion-apps-${keplrWallet.address}`;
        localStorage.setItem(walletKey, JSON.stringify(updatedApps));
      }

      setShowAddExistingModal(false);
      setExistingAppName('');
      setExistingPublicKey('');

      console.log(`Successfully added existing app "${name}"`);
    } catch (error) {
      console.error(`Failed to add existing app:`, error);
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(`Failed to add existing app: ${errorMessage}`);
    } finally {
      setAddingExisting(false);
    }
  };

  const subscribeToServiceForApp = async (
    app: AppIdentity,
    service: 'nildb' | 'nilai'
  ) => {
    if (!keplrWallet?.isConnected) {
      alert('Please ensure Keplr wallet is connected');
      return;
    }

    const subscriptionKey = `${app.publicKey}-${service}`;
    setSubscribingApps((prev) => new Set(prev.add(subscriptionKey)));

    try {
      console.log(
        `Subscribing app "${app.name}" to ${service.toUpperCase()}...`
      );

      const payer = await new KeplrPayerBuilder()
        .chainId(networkConfig.chainId)
        .rpcEndpoint(networkConfig.rpcEndpoint)
        .build();

      const nilauthClient = await NilauthClient.from(
        networkConfig.nilauthEndpoint,
        payer
      );

      // Get subscription cost
      const cost = await nilauthClient.subscriptionCost(service);
      console.log(`${service.toUpperCase()} subscription cost:`, cost);

      // Execute payment and validation
      await nilauthClient.payAndValidate(app.publicKey, service);

      console.log(
        `Successfully subscribed app "${app.name}" to ${service.toUpperCase()}!`
      );

      // Get subscription details for the newly subscribed service
      let subscriptionDetails = undefined;
      try {
        const statusResponse = await nilauthClient.subscriptionStatus(
          app.publicKey,
          service
        );
        if (statusResponse.subscribed && statusResponse.details) {
          subscriptionDetails = {
            expiresAt: new Date(
              statusResponse.details.expiresAt.epochMilliseconds
            ),
            renewableAt: new Date(
              statusResponse.details.renewableAt.epochMilliseconds
            ),
          };
        }
      } catch (error) {
        console.log('Could not fetch subscription details:', error);
      }

      // Update the app's subscription status with details
      setApps((prev) =>
        prev.map((prevApp) =>
          prevApp.publicKey === app.publicKey
            ? {
                ...prevApp,
                subscriptions: {
                  ...prevApp.subscriptions,
                  [service]: {
                    status: 'active' as const,
                    details: subscriptionDetails,
                  },
                },
              }
            : prevApp
        )
      );
    } catch (error) {
      console.error(
        `Failed to subscribe app "${app.name}" to ${service}:`,
        error
      );

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (
        errorMessage.includes('rejected') ||
        errorMessage.includes('denied')
      ) {
        alert('Transaction was cancelled or rejected in Keplr wallet');
      } else if (errorMessage.includes('insufficient')) {
        alert('Insufficient funds in your wallet to complete the subscription');
      } else {
        alert(
          `Failed to subscribe to ${service.toUpperCase()}: ${errorMessage}`
        );
      }
    } finally {
      setSubscribingApps((prev) => {
        const newSet = new Set(prev);
        newSet.delete(subscriptionKey);
        return newSet;
      });
    }
  };

  const renewSubscriptionForApp = async (
    app: AppIdentity,
    service: 'nildb' | 'nilai'
  ) => {
    if (!keplrWallet?.isConnected) {
      alert('Please ensure Keplr wallet is connected');
      return;
    }

    const renewalKey = `${app.publicKey}-${service}-renew`;
    setRenewingApps((prev) => new Set(prev.add(renewalKey)));

    try {
      console.log(
        `Renewing ${service.toUpperCase()} subscription for app "${
          app.name
        }"...`
      );

      const payer = await new KeplrPayerBuilder()
        .chainId(networkConfig.chainId)
        .rpcEndpoint(networkConfig.rpcEndpoint)
        .build();

      const nilauthClient = await NilauthClient.from(
        networkConfig.nilauthEndpoint,
        payer
      );

      // Get subscription cost
      const cost = await nilauthClient.subscriptionCost(service);
      console.log(`${service.toUpperCase()} renewal cost:`, cost);

      // Execute payment and validation for renewal
      await nilauthClient.payAndValidate(app.publicKey, service);

      console.log(
        `Successfully renewed ${service.toUpperCase()} subscription for app "${
          app.name
        }"!`
      );

      // Get updated subscription details
      let subscriptionDetails = undefined;
      try {
        const statusResponse = await nilauthClient.subscriptionStatus(
          app.publicKey,
          service
        );
        if (statusResponse.subscribed && statusResponse.details) {
          subscriptionDetails = {
            expiresAt: new Date(
              statusResponse.details.expiresAt.epochMilliseconds
            ),
            renewableAt: new Date(
              statusResponse.details.renewableAt.epochMilliseconds
            ),
          };
        }
      } catch (error) {
        console.log('Could not fetch updated subscription details:', error);
      }

      // Update the app's subscription status with new details
      setApps((prev) =>
        prev.map((prevApp) =>
          prevApp.publicKey === app.publicKey
            ? {
                ...prevApp,
                subscriptions: {
                  ...prevApp.subscriptions,
                  [service]: {
                    status: 'active' as const,
                    details: subscriptionDetails,
                  },
                },
              }
            : prevApp
        )
      );
    } catch (error) {
      console.error(
        `Failed to renew ${service} subscription for app "${app.name}":`,
        error
      );

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      if (
        errorMessage.includes('rejected') ||
        errorMessage.includes('denied')
      ) {
        alert('Transaction was cancelled or rejected in Keplr wallet');
      } else if (errorMessage.includes('insufficient')) {
        alert('Insufficient funds in your wallet to complete the renewal');
      } else {
        alert(`Failed to renew ${service.toUpperCase()}: ${errorMessage}`);
      }
    } finally {
      setRenewingApps((prev) => {
        const newSet = new Set(prev);
        newSet.delete(renewalKey);
        return newSet;
      });
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-slate-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Your Apps Header - Always shown */}
        <div className="space-y-6">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Your Apps
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {keplrWallet?.isConnected
                      ? `${apps.length} ${
                          apps.length === 1 ? 'app' : 'apps'
                        } with Nillion API key subscriptions`
                      : 'Connect your wallet to view and manage your apps'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowModal(true)}
                  disabled={!keplrWallet?.isConnected}
                  className={`inline-flex items-center gap-2 font-medium py-2 px-4 rounded-lg shadow-sm transition-all duration-200 ${
                    keplrWallet?.isConnected
                      ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>Create App & Subscribe</span>
                </button>
                <button
                  onClick={() => setShowAddExistingModal(true)}
                  disabled={!keplrWallet?.isConnected}
                  className={`inline-flex items-center gap-2 font-medium py-2 px-4 rounded-lg shadow-sm transition-all duration-200 ${
                    keplrWallet?.isConnected
                      ? 'bg-gray-600 hover:bg-gray-700 text-white hover:shadow-md'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>Track Existing App</span>
                </button>
                {loadingDetails && (
                  <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>Loading details...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!keplrWallet?.isConnected ? (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Connect Your Wallet
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Your apps are tied to your wallet address. Use the
                    &quot;Connect Keplr&quot; button in the top navigation to
                    connect your Keplr wallet and start creating apps.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {apps.length === 0 ? (
                <div className="text-center py-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700">
                  <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    No apps with API key subscriptions yet
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    Create your first app to get a Nillion API key subscription
                    to build with Nillion Storage and Nillion Private LLMs.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {apps.map((app) => (
                    <div
                      key={app.publicKey}
                      className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="mb-6">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-gray-900 dark:text-white text-xl">
                            {app.name || 'Unnamed App'}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                app.network === 'mainnet'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              }`}
                            >
                              {app.network === 'mainnet'
                                ? 'Mainnet'
                                : 'Testnet'}
                            </span>
                            <button
                              onClick={() => handleStopTrackingApp(app)}
                              className="ml-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors duration-200"
                              title="Stop tracking this app"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            App ID (Public Key)
                          </label>
                          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                            <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all flex-1">
                              {app.publicKey}
                            </p>
                            <button
                              onClick={() => copyToClipboard(app.publicKey)}
                              className="flex-shrink-0 text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors duration-200"
                              title="Copy public key"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* NILDB Subscription */}
                        <div
                          className={`p-4 rounded-xl border-2 transition-colors duration-200 ${
                            app.subscriptions.nildb.status === 'active'
                              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-700'
                              : 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  app.subscriptions.nildb.status === 'active'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-400 text-white'
                                }`}
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                                  />
                                </svg>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  NILDB
                                </h4>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    app.subscriptions.nildb.status === 'active'
                                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                  }`}
                                >
                                  {app.subscriptions.nildb.status === 'active'
                                    ? 'Active'
                                    : 'Inactive'}
                                </span>
                              </div>
                            </div>
                            {app.subscriptions.nildb.status === 'inactive' && (
                              <button
                                onClick={() =>
                                  subscribeToServiceForApp(app, 'nildb')
                                }
                                disabled={subscribingApps.has(
                                  `${app.publicKey}-nildb`
                                )}
                                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  subscribingApps.has(`${app.publicKey}-nildb`)
                                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md transform hover:-translate-y-0.5'
                                }`}
                              >
                                {subscribingApps.has(
                                  `${app.publicKey}-nildb`
                                ) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                                    Subscribing...
                                  </>
                                ) : (
                                  'Subscribe'
                                )}
                              </button>
                            )}
                            {canRenewSubscription(app.subscriptions.nildb) && (
                              <button
                                onClick={() =>
                                  renewSubscriptionForApp(app, 'nildb')
                                }
                                disabled={renewingApps.has(
                                  `${app.publicKey}-nildb-renew`
                                )}
                                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  renewingApps.has(
                                    `${app.publicKey}-nildb-renew`
                                  )
                                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md transform hover:-translate-y-0.5'
                                }`}
                              >
                                {renewingApps.has(
                                  `${app.publicKey}-nildb-renew`
                                ) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                                    Renewing...
                                  </>
                                ) : (
                                  'Renew'
                                )}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            Nillion Private Storage
                          </p>
                          {app.subscriptions.nildb.status === 'active' &&
                            app.subscriptions.nildb.details && (
                              <div className="space-y-1">
                                {app.subscriptions.nildb.details.expiresAt && (
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    {formatFriendlyDate(
                                      app.subscriptions.nildb.details.expiresAt
                                    )}
                                  </p>
                                )}
                                {app.subscriptions.nildb.details
                                  .renewableAt && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    Renewable{' '}
                                    {formatShortDate(
                                      app.subscriptions.nildb.details
                                        .renewableAt
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                        </div>

                        {/* NILAI Subscription */}
                        <div
                          className={`p-4 rounded-xl border-2 transition-colors duration-200 ${
                            app.subscriptions.nilai.status === 'active'
                              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-700'
                              : 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  app.subscriptions.nilai.status === 'active'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-400 text-white'
                                }`}
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  NILAI
                                </h4>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    app.subscriptions.nilai.status === 'active'
                                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                  }`}
                                >
                                  {app.subscriptions.nilai.status === 'active'
                                    ? 'Active'
                                    : 'Inactive'}
                                </span>
                              </div>
                            </div>
                            {app.subscriptions.nilai.status === 'inactive' && (
                              <button
                                onClick={() =>
                                  subscribeToServiceForApp(app, 'nilai')
                                }
                                disabled={subscribingApps.has(
                                  `${app.publicKey}-nilai`
                                )}
                                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  subscribingApps.has(`${app.publicKey}-nilai`)
                                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md transform hover:-translate-y-0.5'
                                }`}
                              >
                                {subscribingApps.has(
                                  `${app.publicKey}-nilai`
                                ) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                                    Subscribing...
                                  </>
                                ) : (
                                  'Subscribe'
                                )}
                              </button>
                            )}
                            {canRenewSubscription(app.subscriptions.nilai) && (
                              <button
                                onClick={() =>
                                  renewSubscriptionForApp(app, 'nilai')
                                }
                                disabled={renewingApps.has(
                                  `${app.publicKey}-nilai-renew`
                                )}
                                className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  renewingApps.has(
                                    `${app.publicKey}-nilai-renew`
                                  )
                                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-md transform hover:-translate-y-0.5'
                                }`}
                              >
                                {renewingApps.has(
                                  `${app.publicKey}-nilai-renew`
                                ) ? (
                                  <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                                    Renewing...
                                  </>
                                ) : (
                                  'Renew'
                                )}
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                            Nillion Private LLMs
                          </p>
                          {app.subscriptions.nilai.status === 'active' &&
                            app.subscriptions.nilai.details && (
                              <div className="space-y-1">
                                {app.subscriptions.nilai.details.expiresAt && (
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    {formatFriendlyDate(
                                      app.subscriptions.nilai.details.expiresAt
                                    )}
                                  </p>
                                )}
                                {app.subscriptions.nilai.details
                                  .renewableAt && (
                                  <p className="text-xs text-blue-600 dark:text-blue-400">
                                    Renewable{' '}
                                    {formatShortDate(
                                      app.subscriptions.nilai.details
                                        .renewableAt
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Create App & Subscribe
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  App Name
                </label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="Enter a name for your app"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={creating}
                />
              </div>

              <div className="space-y-3 mb-6">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="service"
                    value="nildb"
                    checked={selectedService === 'nildb'}
                    onChange={(e) =>
                      setSelectedService(e.target.value as 'nildb' | 'nilai')
                    }
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      NILDB
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Nillion Private Storage
                    </div>
                  </div>
                </label>

                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                  <input
                    type="radio"
                    name="service"
                    value="nilai"
                    checked={selectedService === 'nilai'}
                    onChange={(e) =>
                      setSelectedService(e.target.value as 'nildb' | 'nilai')
                    }
                    className="mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      NILAI
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Nillion Private LLMs
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setAppName('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={createNewApp}
                  disabled={creating || !appName.trim()}
                  className="flex-1 bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded"
                >
                  {creating ? 'Creating...' : 'Create & Subscribe'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddExistingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Add Existing App
              </h2>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  App Name
                </label>
                <input
                  type="text"
                  value={existingAppName}
                  onChange={(e) => setExistingAppName(e.target.value)}
                  placeholder="Enter a name for your app"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={addingExisting}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Public Key
                </label>
                <textarea
                  value={existingPublicKey}
                  onChange={(e) => setExistingPublicKey(e.target.value)}
                  placeholder="Enter the 66-character public key"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                  rows={3}
                  disabled={addingExisting}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Public key should be a 66-character hexadecimal string
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAddExistingModal(false);
                    setExistingAppName('');
                    setExistingPublicKey('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                  disabled={addingExisting}
                >
                  Cancel
                </button>
                <button
                  onClick={addExistingApp}
                  disabled={
                    addingExisting ||
                    !existingAppName.trim() ||
                    !existingPublicKey.trim()
                  }
                  className="flex-1 bg-blue-500 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded"
                >
                  {addingExisting ? 'Adding...' : 'Add App'}
                </button>
              </div>
            </div>
          </div>
        )}

        {newAppData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  &quot;{newAppData.name}&quot; app created successfully!
                </h2>
                <button
                  onClick={closeNewAppModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-blue-800 dark:text-blue-200">
                  ✅ Successfully created the &quot;
                  <strong>{newAppData.name}</strong>&quot; app credentials on{' '}
                  <strong>{newAppData.network.toUpperCase()}</strong> and
                  subscribed to <strong>{selectedService.toUpperCase()}</strong>
                </p>
              </div>

              <p className="text-red-600 dark:text-red-400 mb-4 text-sm font-semibold">
                ⚠️ Copy or download these credentials now - the Nillion API Key
                (private key) for this app will not be saved or ever shown again
              </p>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-gray-900 dark:text-white">
                      Nillion DID
                    </label>
                    <button
                      onClick={() => copyToClipboard(newAppData.did)}
                      className="text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                    {newAppData.did}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-gray-900 dark:text-white">
                      App ID (Public Key)
                    </label>
                    <button
                      onClick={() => copyToClipboard(newAppData.publicKey)}
                      className="text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                    {newAppData.publicKey}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold text-gray-900 dark:text-white">
                      Nillion API Key (Private Key)
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                      >
                        {showPrivateKey ? 'Hide' : 'Show'}
                      </button>
                      <button
                        onClick={() => copyToClipboard(newAppData.privateKey)}
                        className="text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                    {showPrivateKey ? (
                      newAppData.privateKey
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 select-none">
                        {'•'.repeat(66)}{' '}
                        {/* 66 bullet points for 66-char key */}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={downloadAppData}
                  className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Download All (.txt)
                </button>
                <button
                  onClick={closeNewAppModal}
                  className="flex-1 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stop Tracking Confirmation Modal */}
        {showStopTrackingModal && appToStopTracking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Stop Tracking App
                </h2>
                <button
                  onClick={cancelStopTracking}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Are you sure you want to stop tracking this app?
                </p>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {appToStopTracking.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {appToStopTracking.publicKey.slice(0, 20)}...
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  This will remove the app from your dashboard. You can track it
                  again later using &quot;Track Existing App&quot;.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={cancelStopTracking}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStopTracking}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Stop Tracking
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
