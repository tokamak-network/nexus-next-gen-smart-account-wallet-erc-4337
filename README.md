# Nexus: Next-Gen Smart Account Wallet (ERC-4337)

Nexus is an ERC-4337 smart account wallet with deterministic deployment, gas sponsorship via a verifying paymaster, session keys, and social recovery. The repo includes Solidity contracts (Foundry) and a Next.js frontend that submits UserOperations through a bundler.

## What this application can do

- **Deterministic account deployment** via `NexusAccountFactory` (CREATE2)
- **ERC-4337 user op validation** with owner signatures
- **Verifying paymaster** for gas sponsorship (off‑chain signer model)
- **Session keys** with validity window, gas limit, and target allowlist
- **Social recovery** (2‑of‑3 guardians, 24h timelock)
- **Frontend dashboard** to deploy accounts, send UserOps, manage session keys, guardians, and recovery

## Tech stack

- **Smart contracts**: Solidity + Foundry
- **AA tooling**: account‑abstraction v0.7, Permissionless.js 0.2.31
- **Frontend**: Next.js 15, React 19, viem

## Repo structure

- `contracts/src/` — smart contracts
- `contracts/test/` — Foundry tests
- `script/` — deployment scripts
- `frontend/` — Next.js app

## Prerequisites

- Node.js 20+
- Foundry (forge)
- A Base Sepolia wallet with test ETH
- A bundler RPC (e.g., Pimlico)

## Quickstart

### 1) Install dependencies

```bash
# smart contracts
forge install

# frontend
cd frontend
npm install
```

### 2) Run tests

```bash
forge test
```

### 3) Deploy contracts (Base Sepolia)

Set env vars:

```bash
export PRIVATE_KEY=...
export VERIFYING_SIGNER=...
export ENTRYPOINT=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
```

Run the deploy script:

```bash
forge script script/Deploy.s.sol --rpc-url base-sepolia --broadcast --verify -vvvv
```

### 4) Run the frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org
NEXT_PUBLIC_ENTRYPOINT=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
NEXT_PUBLIC_BUNDLER_RPC_URL=<your bundler URL>
```

Start the app:

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

## How to use the app (feature-by-feature)

### A) Account deployment
1. Connect wallet.
2. Paste your deployed **Factory Address**.
3. Enter a `salt` (any number).
4. Click **Compute Address** to preview the account.
5. Click **Deploy Account** to deploy via factory.

### B) Execute a UserOperation
1. Enter destination address, ETH value, and calldata.
2. Click **Send UserOp**.
3. The app uses Permissionless.js to submit a UserOperation to your bundler.

### C) Session keys
1. Add a session key address.
2. Set `validUntil` (unix timestamp; 0 means no expiry).
3. Set `gasLimit` (0 means no limit).
4. Optionally provide allowed target contracts.
5. Click **Add Session Key**.
6. Click **Remove Session Key** to revoke.

### D) Guardians
1. Add guardian addresses (up to 3).
2. Remove guardian addresses if needed (cannot go below recovery threshold).

### E) Recovery
1. Enter a **New Owner** address.
2. A guardian initiates recovery (creates `recoveryId`).
3. Another guardian confirms the recovery.
4. After 24 hours, execute recovery with the `recoveryId`.

## Testing coverage

All core features are covered by Foundry tests:

- Account validation & execution
- Session key validation & restrictions
- Social recovery flow
- Verifying paymaster signature validation

Run:

```bash
forge test
```

## Notes / current limitations

- **Web3Auth is stubbed** in the frontend (uses injected wallets like MetaMask).
- The frontend uses **no paymaster** for UserOps by default (bundler only).
- Upgrade Next.js if you want to address the CVE warning from `next@15.1.3`.

## EntryPoint

Base Sepolia v0.7 EntryPoint:

```
0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
```
