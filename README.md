# Nillion API Portal

A Next.js application for managing Nillion API key subscriptions, built with TypeScript.

## Overview

The Nillion API Portal helps developers manage their Nillion services:

- **Create and manage API keys** for Nillion services
- **Subscribe to NILDB** (Nillion Private Storage) for secure data storage
- **Subscribe to NILAI** (Nillion Private LLMs) for private AI inference
- **Track multiple applications** across testnet and mainnet
- **Manage subscription renewals** with expiration tracking

## Key Features

- **Wallet Integration**: Connect with Keplr wallet for authentication and subscription payments
- **Multi-Network**: Switch between testnet and mainnet environments
- **Subscription Management**: Track renewals and service status
- **Secure Key Handling**: Show/hide private keys one time with copy and download functionality
- **App Tracking**: Import and monitor existing applications by public key

## Features

### 🔐 Wallet Integration

- Keplr wallet connectivity
- Wallet-specific app isolation and data persistence
- Network switching with automatic Keplr synchronization

### 🏗️ Application Management

- **Create New Apps**: Generate cryptographic keypairs and subscribe to services in one step
- **Track Existing Apps**: Import and monitor apps created elsewhere
- **Multi-Service Support**: Choose between NILDB and NILAI subscriptions
- **Network Awareness**: Track which network (testnet/mainnet) each app operates on

### 📊 Subscription Dashboard

- Real-time subscription status monitoring
- Automatic renewal date tracking
- Service-specific management (NILDB vs NILAI)
- One-click renewals when eligible
- Detailed expiration and renewal information

### 🔑 Secure Key Management

- Private keys displayed with show/hide functionality one time at subscription
- Copy-to-clipboard for all credentials
- Downloadable backup files with complete app data
- localStorage isolation per wallet address

### 🌐 Network Support

- **Testnet**: Development and testing environment
- **Mainnet**: Production-ready network (when available)
- Automatic network detection and switching
- Service availability varies by network

## Technology Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with dark mode support
- **Blockchain**: Cosmos SDK integration via Keplr wallet
- **Cryptography**: Nillion NUC TypeScript library
- **State Management**: React Context API
- **Authentication**: Wallet-based (no traditional login required)

## Getting Started

### Prerequisites

- Node.js 18+
- Keplr wallet browser extension
- NIL tokens for subscription payments (get from [testnet faucet](https://docs.nillion.com/community/guides/testnet-faucet))

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd nuc-demo
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. **Connect Wallet**: Click "Connect Keplr Wallet" in the navigation
2. **Create App**: Use "Create App & Subscribe" to generate new credentials
3. **Choose Service**: Select NILDB (storage) or NILAI (LLMs) for your subscription
4. **Manage Apps**: View subscription status, renew services, or track existing apps
5. **Switch Networks**: Use the network toggle to work with testnet or mainnet

## Service Descriptions

### NILDB (Nillion Private Storage)

- Store data with privacy guarantees
- Encrypted end-to-end storage
- Suitable for confidential documents and datasets

### NILAI (Nillion Private LLMs)

- Run AI inference on private data
- Input and output data remains encrypted
- Ideal for sensitive AI applications

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api-keys/          # Main dashboard page
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── NetworkProvider.tsx   # Network switching logic
│   ├── WalletProvider.tsx    # Keplr wallet integration
│   └── ...
└── types/                 # TypeScript definitions
```

## Contributing

This project demonstrates the Nillion NUC TypeScript library. For issues or feature requests, refer to the Nillion documentation and community channels.

## Learn More

- [Nillion Documentation](https://docs.nillion.com)
- [Nillion Quickstart Guide](https://docs.nillion.com/build/quickstart)
- [Testnet Faucet](https://docs.nillion.com/community/guides/testnet-faucet)
