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

## Environment variables (what/where/why)

### Smart contract deployment (shell environment)
Set these in your shell before running the deploy script:

- `PRIVATE_KEY`: **Deployer EOA** private key used by Foundry to broadcast deployments.
- `VERIFYING_SIGNER`: **Off‑chain signer** for the verifying paymaster. This address signs paymaster approvals (paymasterAndData). It is *not* your deployer; it is the key your gas‑sponsorship service will use.
- `ENTRYPOINT`: ERC‑4337 **EntryPoint contract** address. Default for Base Sepolia v0.7 is:
  `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`.

Why this EntryPoint address? It is the official v0.7 EntryPoint deployed on Base Sepolia. If you deploy your own EntryPoint or use another chain, override this value.

### Frontend runtime config (`frontend/.env.local`)
Create `frontend/.env.local` with:

- `NEXT_PUBLIC_RPC_URL`: **Read‑only JSON‑RPC** for chain data (balances, reads). Used by viem `publicClient`.
- `NEXT_PUBLIC_BUNDLER_RPC_URL`: **Bundler RPC** endpoint for submitting UserOperations (ERC‑4337). This is required for `Send UserOp`.
- `NEXT_PUBLIC_ENTRYPOINT`: EntryPoint address used by the frontend to build UserOps (same as above).

**RPC vs Bundler:**
- `NEXT_PUBLIC_RPC_URL` = normal JSON‑RPC (eth_call, eth_getBalance, etc.).
- `NEXT_PUBLIC_BUNDLER_RPC_URL` = ERC‑4337 bundler endpoint (eth_sendUserOperation, etc.).

## How to use the app (feature-by-feature)

### A) Account deployment
1. Connect wallet.
2. Paste your deployed **Factory Address** (address of `NexusAccountFactory`).
3. Enter a `salt` (any number). The factory uses CREATE2 so the account address is deterministic.
4. Click **Compute Address** to preview the account.
5. Click **Deploy Account** to deploy via factory.

### B) Execute a UserOperation (Send UserOp)
**What it does:** creates a UserOperation that calls `NexusAccount.execute()` and submits it to the bundler.

1. **Destination**  target contract to call.
2. **Value (ETH)**  optional ETH to send.
3. **Calldata**  encoded function call.
4. Click **Send UserOp** (submitted to the bundler via `NEXT_PUBLIC_BUNDLER_RPC_URL`).

UserOps are different from normal transactions: they are signed by the smart account owner and executed by EntryPoint after bundler validation.

### C) Session keys
**What it does:** lets the owner grant a temporary key limited by time, gas, and target contracts.

1. Add a session key address (EOA that will be allowed to call `execute`).
2. Set `validUntil` (unix timestamp; 0 means no expiry).
3. Set `gasLimit` (0 means no limit).
4. Optionally provide allowed target contracts.
5. Click **Add Session Key**.
6. Click **Remove Session Key** to revoke.

### D) Guardians
**What it does:** guardians are trusted addresses that can help recover the account.

- **Who can be a guardian?** Any EOA address you trust.
- **Who can set guardians?** The **owner** only.
- **How many?** Up to 3. Recovery requires **2of3**.

Steps:
1. Add guardian addresses (up to 3).
2. Remove guardian addresses if needed (cannot go below recovery threshold).

### E) Recovery
**What it does:** transfers account ownership after a timelock if 2 guardians approve.

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
