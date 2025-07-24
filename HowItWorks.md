# How the Nillion API Portal Works

[Nillion API Portal](https://nillion-api-portal.vercel.app/) is a web app that helps you manage API key subscriptions using the [`@nillion/nuc`](https://github.com/NillionNetwork/nuc-ts) TypeScript library. Here's what you can do with it:

- Create API Keys for accessing Nillion services
- Subscribe to Nillion Storage (nilDB) or Nillion Private LLMs (nilAI)
- Manage and renew your subscriptions

<img width="1236" height="857" alt="Screenshot 2025-07-24 at 9 26 26 AM" src="https://github.com/user-attachments/assets/412865df-9c78-4d08-abc1-fa5142bdfbfc" />

## How It All Works

### 1. Wallet Connection

First things first - no usernames or passwords here! Your Nillion wallet address is all you need. Just connect your Keplr wallet and you're good to go:

```typescript
// WalletProvider.tsx
const connectWallet = async () => {
  await window.keplr.enable(chainId);
  const key = await window.keplr.getKey(chainId);
  setWalletAddress(key.bech32Address);
};
```

This way, everything you do is cryptographically signed and can be verified on nilChain.

### 2. Creating a Payer Instance

Once connected, the app creates a `Payer` instance using the nuc-ts library's `KeplrPayerBuilder`:

```typescript
const payer = await new KeplrPayerBuilder()
  .chainId(networkConfig.chainId)
  .rpcEndpoint(networkConfig.rpcEndpoint)
  .build();
```

The Payer handles blockchain interactions, including:

- Signing transactions with the Keplr browser extension
- Broadcasting payments to nilChain
- Managing gas fees

### 3. Initializing the Nilauth Client

With the payer ready, the app instantiates the `NilauthClient`:

```typescript
const nilauthClient = await NilauthClient.from(
  networkConfig.nilauthEndpoint,
  payer
);
```

This client is the gateway to nilAuth, Nillion's authentication service, handling subscription management and validation.

### 4. App Creation Flow

When a user creates a new app, here's what happens under the hood:

#### a. Keypair Generation

```typescript
const keypair = Keypair.generate();
const publicKey = keypair.publicKey;
const privateKey = keypair.privateKey;
```

The nuc-ts library generates a secp256k1 elliptic curve keypair. The private key will become the app's Nillion API Key once service subscription is complete.

#### b. DID Creation

Each app gets a Nillion Decentralized Identifier (DID):

```typescript
const did = `did:nillion:${publicKey}`;
```

#### c. Subscription Purchase

The app subscribes to the chosen service:

```typescript
const result = await nilauthClient.payAndValidate(
  keypair,
  service // Either 'nildb' or 'nilai'
);
```

This single call:

- Creates a blockchain transaction
- Deducts the subscription cost from the wallet
- Registers the app's public key with the service
- Returns a transaction hash for verification

Developers can see their app credentials and download their API Key (private key), which can be used to build with their chosen Nillion service.

<img width="928" height="726" alt="Screenshot 2025-07-24 at 9 26 03 AM" src="https://github.com/user-attachments/assets/679b3487-9460-4930-9c67-de54a506d10d" />

### 5. Subscription Status Checking

The Portal continuously monitors subscription status for all apps:

```typescript
const checkSubscription = async (publicKey: string) => {
  const status = await nilauthClient.subscriptionStatus(publicKey, service);

  return {
    isActive: status.state === 'active',
    expiresAt: status.expiresAt,
    canRenew: isWithinRenewalWindow(status.expiresAt),
  };
};
```

This helps developers keep track of Nillion service subscriptions.

### 5. Subscription Renewal

The portal makes it easy to renew expiring subscriptions. When a subscription is within its renewal window (typically the last 30 days before expiration), users can extend it directly from the UI:

```typescript
const renewSubscription = async (app: App) => {
  // Renew the subscription
  const result = await nilauthClient.payAndValidate(app.publicKey, app.service);

  // Update local status
  await checkSubscriptionStatus(app.publicKey);
};
```

The renewal process:

- Checks if the subscription is within the renewal window
- Executes a new payment transaction
- Extends the subscription period
- Updates the UI to reflect the new expiration date

### 8. Service Integration Pattern

Once subscribed, apps can interact with Nillion services using their API key. Check out the [Nillion Quickstart docs](https://docs.nillion.com/build/quickstart) to start building with Nillion Storage or Nillion Private LLMs.

## Conclusion

This writeup demonstrates how the Nillion API Portal leverages the [`@nillion/nuc`](https://github.com/NillionNetwork/nuc-ts) library to handle wallet connections, keypair generation, and subscription management. All the core functionality - from creating payers to managing subscriptions - is available in the public nuc-ts library.

This means you could theoretically build your own version of the Nillion Portal if you wanted to, since all the necessary functions are exposed in the library. The nuc-ts package provides everything you need: wallet integration, cryptographic operations, and nilAuth client interactions.

The Nillion API Portal is simply one implementation showing how these building blocks can come together to create a seamless developer experience for managing Nillion service subscriptions.

## Resources

- **nuc-ts Library**: [GitHub Repository](https://github.com/NillionNetwork/nuc-ts)
- **NPM Package**: [`@nillion/nuc`](https://www.npmjs.com/package/@nillion/nuc)
- **Documentation**: Check the GitHub repository for detailed API documentation and examples
