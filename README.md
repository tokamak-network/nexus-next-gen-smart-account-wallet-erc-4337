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
- [ ] ECDSA Validation Logic (Phase 1)
- [ ] Gasless Transaction Sponsorship (Phase 2)
- [ ] Social Recovery Module (Phase 3)
- [ ] Session Keys & Permission Management (Phase 2)
- [ ] Multi-call / Transaction Batching (Phase 4)
- [ ] Web3Auth Integration (Phase 4)
- [ ] Pimlico Bundler & Paymaster Integration (Phase 2)

## 🚧 Development Status & Roadmap

### Phase 1: Core Smart Account (Current)
- [ ] NexusAccount.sol - ERC-4337 compliant smart account
- [ ] NexusAccountFactory.sol - CREATE2 factory with address pre-computation
- [ ] EntryPoint integration
- [ ] Foundry test suite

### Phase 2: Paymaster & Session Keys
- [ ] VerifyingPaymaster.sol - Gas sponsorship with admin signatures
- [ ] Session key management system
- [ ] Paymaster deposit management

### Phase 3: Social Recovery
- [ ] Guardian management with multi-sig
- [ ] 24-hour timelock recovery system
- [ ] Recovery confirmation flow

### Phase 4: Full-Stack Integration
- [ ] Next.js frontend with Web3Auth
- [ ] Permissionless.js SmartAccountClient integration
- [ ] Transaction builder UI
- [ ] Guardian management UI

### Phase 5: Testing & Deployment
- [ ] Comprehensive test coverage
- [ ] Base Sepolia deployment
- [ ] Documentation & user guides