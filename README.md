# Nexus: Next-Gen Smart Account Wallet (ERC-4337)

Nexus is a production-grade Smart Contract Wallet built on the **ERC-4337** standard. It abstracts away the complexities of the Ethereum network, providing a Web2-like experience without compromising on self-custody.

## 🚀 The Problem & The Solution

### The Friction (EOA Limitations)
* **Private Key Anxiety:** One lost seed phrase = permanent loss of funds.
* **Gas Barriers:** New users must buy ETH on an exchange before they can even use a dApp.
* **UX Bottlenecks:** Every single action (Approve, Swap, Mint) requires a separate signature and gas fee.

### The Solution (Account Abstraction)
Nexus transforms the user account into a **programmable smart contract**, enabling:
* **Gasless Onboarding:** Use a **Paymaster** to sponsor gas fees for your users.
* **Social Recovery:** Restore access via trusted "Guardians" instead of seed phrases.
* **Atomic Batching:** Bundle multiple transactions (e.g., Approve + Swap) into a single click.
* **Session Keys:** Grant temporary permissions for specific dApps (perfect for gaming).

## 🛠 Tech Stack
* **Smart Contracts:** Solidity, Foundry (Testing & Deployment)
* **AA Infrastructure:** Pimlico (Bundler & Paymaster), Permissionless.js
* **Frontend:** Next.js, Tailwind CSS, Viem
* **Auth:** Web3Auth (Social Login to Smart Account)

## 🏗 Architecture
The wallet follows the official ERC-4337 flow:
1. **UserOperation:** High-level intent signed by the user.
2. **Bundler:** Validates and packages UserOps into a single entry-point transaction.
3. **EntryPoint:** The singleton security gatekeeper that triggers the wallet's logic.
4. **Paymaster:** Optionally sponsors gas or allows gas payment in ERC-20 tokens.

## 📋 Features Implemented
- [x] ECDSA Validation Logic
- [x] Gasless Transaction Sponsorship
- [x] Social Recovery Module
- [x] Multi-call / Transaction Batching