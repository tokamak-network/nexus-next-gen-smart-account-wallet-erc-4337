# Nexus Frontend

## Setup

```bash
cd frontend
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env.local` and update values:

- `NEXT_PUBLIC_RPC_URL` (Base Sepolia RPC)
- `NEXT_PUBLIC_ENTRYPOINT` (EntryPoint v0.7; defaults to Base Sepolia address)
- `NEXT_PUBLIC_BUNDLER_RPC_URL` (Bundler RPC URL)

## Web3Auth

Web3Auth integration is stubbed. Use an injected wallet (e.g. MetaMask) for now.
