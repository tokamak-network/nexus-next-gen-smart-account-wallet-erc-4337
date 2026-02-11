"use client";

import { useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  getContract,
  http,
  parseEther
} from "viem";
import { baseSepolia } from "viem/chains";
import { createSmartAccountClient } from "permissionless";
import { toSmartAccount } from "permissionless/accounts";
import { entryPointABI } from "./shared/entryPointAbi";
import { nexusAccountAbi } from "./shared/nexusAccountAbi";
import { nexusAccountFactoryAbi } from "./shared/nexusAccountFactoryAbi";

const DEFAULT_ENTRYPOINT = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

type SessionKeyInput = {
  key: string;
  validUntil: string;
  gasLimit: string;
  targets: string;
};

type GuardianInput = {
  guardian: string;
};

export default function HomePage() {
  const [status, setStatus] = useState<string>("");
  const [ownerAddress, setOwnerAddress] = useState<string>("");
  const [factoryAddress, setFactoryAddress] = useState<string>("");
  const [accountAddress, setAccountAddress] = useState<string>("");
  const [salt, setSalt] = useState<string>("0");
  const [dest, setDest] = useState<string>("");
  const [value, setValue] = useState<string>("0");
  const [callData, setCallData] = useState<string>("0x");
  const [sessionKeyInput, setSessionKeyInput] = useState<SessionKeyInput>({
    key: "",
    validUntil: "",
    gasLimit: "",
    targets: ""
  });
  const [guardianInput, setGuardianInput] = useState<GuardianInput>({ guardian: "" });
  const [recoveryOwner, setRecoveryOwner] = useState<string>("");
  const [recoveryId, setRecoveryId] = useState<string>("");

  const entryPoint = useMemo(() => {
    return (process.env.NEXT_PUBLIC_ENTRYPOINT || DEFAULT_ENTRYPOINT) as `0x${string}`;
  }, []);

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";
  const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL || "";

  const publicClient = useMemo(() => {
    return createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl)
    });
  }, [rpcUrl]);

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("No injected wallet found. Please install a wallet or use Web3Auth later.");
      return;
    }
    const client = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });
    const [address] = await client.requestAddresses();
    setOwnerAddress(address);
    setStatus(`Connected wallet ${address}`);
  }

  async function computeAccountAddress() {
    if (!factoryAddress) {
      setStatus("Factory address required.");
      return;
    }
    if (!ownerAddress) {
      setStatus("Owner address required.");
      return;
    }

    const factory = getContract({
      address: factoryAddress as `0x${string}`,
      abi: nexusAccountFactoryAbi,
      client: publicClient
    });

    const predicted = await factory.read.getAddress([
      ownerAddress as `0x${string}`,
      BigInt(salt || "0")
    ]);
    setAccountAddress(predicted);
    setStatus(`Predicted account address: ${predicted}`);
  }

  async function deployAccount() {
    if (!window.ethereum) {
      setStatus("Injected wallet required for deploy.");
      return;
    }
    if (!factoryAddress || !ownerAddress) {
      setStatus("Factory and owner required.");
      return;
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    const txHash = await walletClient.writeContract({
      address: factoryAddress as `0x${string}`,
      abi: nexusAccountFactoryAbi,
      functionName: "createAccount",
      args: [ownerAddress as `0x${string}`, BigInt(salt || "0")],
      account: ownerAddress as `0x${string}`
    });

    setStatus(`Deploy tx sent: ${txHash}`);
  }

  async function sendExecute() {
    if (!window.ethereum) {
      setStatus("Injected wallet required for execute.");
      return;
    }
    if (!accountAddress) {
      setStatus("Account address required.");
      return;
    }
    if (!factoryAddress) {
      setStatus("Factory address required for auto-deploy.");
      return;
    }
    if (!bundlerUrl) {
      setStatus("Bundler RPC URL required.");
      return;
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    const executeCallData = encodeFunctionData({
      abi: nexusAccountAbi,
      functionName: "execute",
      args: [dest as `0x${string}`, parseEther(value || "0"), callData as `0x${string}`]
    });

    const initCode = encodeFunctionData({
      abi: nexusAccountFactoryAbi,
      functionName: "createAccount",
      args: [ownerAddress as `0x${string}`, BigInt(salt || "0")]
    });

    const smartAccount = await toSmartAccount({
      address: accountAddress as `0x${string}`,
      chain: baseSepolia,
      entryPoint,
      getNonce: async () => {
        return publicClient.readContract({
          address: entryPoint,
          abi: entryPointABI,
          functionName: "getNonce",
          args: [accountAddress as `0x${string}`, 0n]
        });
      },
      encodeCallData: async () => executeCallData,
      signUserOperation: async (userOpHash) => {
        return walletClient.signMessage({
          account: ownerAddress as `0x${string}`,
          message: { raw: userOpHash }
        });
      },
      getFactory: async () => factoryAddress as `0x${string}`,
      getFactoryData: async () => initCode
    });

    const client = createSmartAccountClient({
      account: smartAccount,
      chain: baseSepolia,
      bundlerTransport: http(bundlerUrl)
    });

    const userOpHash = await client.sendUserOperation({
      callData: executeCallData
    });

    setStatus(`UserOp sent: ${userOpHash}`);
  }

  async function addSessionKey() {
    if (!window.ethereum) {
      setStatus("Injected wallet required for session key.");
      return;
    }
    if (!accountAddress) {
      setStatus("Account address required.");
      return;
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    const targets = sessionKeyInput.targets
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean) as `0x${string}`[];

    const txHash = await walletClient.writeContract({
      address: accountAddress as `0x${string}`,
      abi: nexusAccountAbi,
      functionName: "addSessionKey",
      args: [
        sessionKeyInput.key as `0x${string}`,
        sessionKeyInput.validUntil ? BigInt(sessionKeyInput.validUntil) : BigInt(0),
        sessionKeyInput.gasLimit ? BigInt(sessionKeyInput.gasLimit) : BigInt(0),
        targets
      ],
      account: ownerAddress as `0x${string}`
    });

    setStatus(`Session key added: ${txHash}`);
  }

  async function removeSessionKey() {
    if (!window.ethereum) {
      setStatus("Injected wallet required for session key.");
      return;
    }
    if (!accountAddress) {
      setStatus("Account address required.");
      return;
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    const txHash = await walletClient.writeContract({
      address: accountAddress as `0x${string}`,
      abi: nexusAccountAbi,
      functionName: "removeSessionKey",
      args: [sessionKeyInput.key as `0x${string}`],
      account: ownerAddress as `0x${string}`
    });

    setStatus(`Session key removed: ${txHash}`);
  }

  async function addGuardian() {
    if (!window.ethereum) {
      setStatus("Injected wallet required for guardians.");
      return;
    }
    if (!accountAddress) {
      setStatus("Account address required.");
      return;
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    const txHash = await walletClient.writeContract({
      address: accountAddress as `0x${string}`,
      abi: nexusAccountAbi,
      functionName: "addGuardian",
      args: [guardianInput.guardian as `0x${string}`],
      account: ownerAddress as `0x${string}`
    });

    setStatus(`Guardian added: ${txHash}`);
  }

  async function removeGuardian() {
    if (!window.ethereum) {
      setStatus("Injected wallet required for guardians.");
      return;
    }
    if (!accountAddress) {
      setStatus("Account address required.");
      return;
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    const txHash = await walletClient.writeContract({
      address: accountAddress as `0x${string}`,
      abi: nexusAccountAbi,
      functionName: "removeGuardian",
      args: [guardianInput.guardian as `0x${string}`],
      account: ownerAddress as `0x${string}`
    });

    setStatus(`Guardian removed: ${txHash}`);
  }

  async function initiateRecovery() {
    if (!window.ethereum) {
      setStatus("Injected wallet required for recovery.");
      return;
    }
    if (!accountAddress) {
      setStatus("Account address required.");
      return;
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    const txHash = await walletClient.writeContract({
      address: accountAddress as `0x${string}`,
      abi: nexusAccountAbi,
      functionName: "initiateRecovery",
      args: [recoveryOwner as `0x${string}`],
      account: ownerAddress as `0x${string}`
    });

    setStatus(`Recovery initiated: ${txHash}`);
  }

  async function confirmRecovery() {
    if (!window.ethereum) {
      setStatus("Injected wallet required for recovery.");
      return;
    }
    if (!accountAddress) {
      setStatus("Account address required.");
      return;
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    const txHash = await walletClient.writeContract({
      address: accountAddress as `0x${string}`,
      abi: nexusAccountAbi,
      functionName: "confirmRecovery",
      args: [recoveryId as `0x${string}`],
      account: ownerAddress as `0x${string}`
    });

    setStatus(`Recovery confirmed: ${txHash}`);
  }

  async function executeRecovery() {
    if (!window.ethereum) {
      setStatus("Injected wallet required for recovery.");
      return;
    }
    if (!accountAddress) {
      setStatus("Account address required.");
      return;
    }

    const walletClient = createWalletClient({
      chain: baseSepolia,
      transport: custom(window.ethereum)
    });

    const txHash = await walletClient.writeContract({
      address: accountAddress as `0x${string}`,
      abi: nexusAccountAbi,
      functionName: "executeRecovery",
      args: [recoveryId as `0x${string}`],
      account: ownerAddress as `0x${string}`
    });

    setStatus(`Recovery executed: ${txHash}`);
  }

  const isReady = Boolean(ownerAddress);

  return (
    <main className="page">
      <div className="container">
        <header className="hero">
          <div className="hero-content">
            <p className="eyebrow">Nexus Smart Account</p>
            <h1>Operate your smart account with confidence.</h1>
            <p className="subtitle">
              Manage deployments, execute calls, session keys, and recovery from a single dashboard.
            </p>
            <div className="chip">
              EntryPoint <span>{entryPoint}</span>
            </div>
          </div>
          <div className="hero-panel">
            <button className="button primary" onClick={connectWallet}>
              Connect Wallet (stub)
            </button>
            <div className="status">
              <span>Status</span>
              <strong>{status || "Idle"}</strong>
            </div>
          </div>
        </header>

        <div className="grid">
          <section className="card">
            <div className="card-header">
              <div>
                <h2>Account Deployment</h2>
                <p>Compute or deploy your Nexus account deterministically.</p>
              </div>
            </div>
            <div className="fields">
              <label className="field">
                <span>Factory Address</span>
                <input
                  className="input"
                  value={factoryAddress}
                  onChange={(event) => setFactoryAddress(event.target.value)}
                  placeholder="0x..."
                />
              </label>
              <label className="field">
                <span>Salt</span>
                <input className="input" value={salt} onChange={(event) => setSalt(event.target.value)} />
              </label>
            </div>
            <div className="row">
              <button className="button" onClick={computeAccountAddress} disabled={!isReady}>
                Compute Address
              </button>
              <button className="button primary" onClick={deployAccount} disabled={!isReady}>
                Deploy Account
              </button>
            </div>
            <div className="meta">
              <span>Account Address</span>
              <strong>{accountAddress || "—"}</strong>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2>Execute Call</h2>
                <p>Send a UserOperation through the bundler.</p>
              </div>
            </div>
            <div className="fields">
              <label className="field">
                <span>Destination</span>
                <input
                  className="input"
                  value={dest}
                  onChange={(event) => setDest(event.target.value)}
                  placeholder="0x..."
                />
              </label>
              <label className="field">
                <span>Value (ETH)</span>
                <input className="input" value={value} onChange={(event) => setValue(event.target.value)} />
              </label>
              <label className="field">
                <span>Calldata</span>
                <textarea
                  className="input textarea"
                  value={callData}
                  onChange={(event) => setCallData(event.target.value)}
                />
              </label>
            </div>
            <button className="button primary" onClick={sendExecute} disabled={!isReady}>
              Send UserOp
            </button>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2>Session Keys</h2>
                <p>Grant temporary permissions to a dedicated key.</p>
              </div>
            </div>
            <div className="fields">
              <label className="field">
                <span>Session Key</span>
                <input
                  className="input"
                  value={sessionKeyInput.key}
                  onChange={(event) =>
                    setSessionKeyInput((prev) => ({
                      ...prev,
                      key: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Valid Until (unix)</span>
                <input
                  className="input"
                  value={sessionKeyInput.validUntil}
                  onChange={(event) =>
                    setSessionKeyInput((prev) => ({
                      ...prev,
                      validUntil: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Gas Limit</span>
                <input
                  className="input"
                  value={sessionKeyInput.gasLimit}
                  onChange={(event) =>
                    setSessionKeyInput((prev) => ({
                      ...prev,
                      gasLimit: event.target.value
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Target Contracts (comma separated)</span>
                <input
                  className="input"
                  value={sessionKeyInput.targets}
                  onChange={(event) =>
                    setSessionKeyInput((prev) => ({
                      ...prev,
                      targets: event.target.value
                    }))
                  }
                />
              </label>
            </div>
            <div className="row">
              <button className="button" onClick={addSessionKey} disabled={!isReady}>
                Add Session Key
              </button>
              <button className="button ghost" onClick={removeSessionKey} disabled={!isReady}>
                Remove Session Key
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2>Guardians</h2>
                <p>Add or remove trusted guardians.</p>
              </div>
            </div>
            <div className="fields">
              <label className="field">
                <span>Guardian Address</span>
                <input
                  className="input"
                  value={guardianInput.guardian}
                  onChange={(event) => setGuardianInput({ guardian: event.target.value })}
                />
              </label>
            </div>
            <div className="row">
              <button className="button" onClick={addGuardian} disabled={!isReady}>
                Add Guardian
              </button>
              <button className="button ghost" onClick={removeGuardian} disabled={!isReady}>
                Remove Guardian
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2>Recovery</h2>
                <p>Initiate and execute recovery after timelock.</p>
              </div>
            </div>
            <div className="fields">
              <label className="field">
                <span>New Owner</span>
                <input
                  className="input"
                  value={recoveryOwner}
                  onChange={(event) => setRecoveryOwner(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Recovery ID</span>
                <input
                  className="input"
                  value={recoveryId}
                  onChange={(event) => setRecoveryId(event.target.value)}
                />
              </label>
            </div>
            <div className="row">
              <button className="button" onClick={initiateRecovery} disabled={!isReady}>
                Initiate
              </button>
              <button className="button" onClick={confirmRecovery} disabled={!isReady}>
                Confirm
              </button>
              <button className="button ghost" onClick={executeRecovery} disabled={!isReady}>
                Execute
              </button>
            </div>
          </section>
        </div>
      </div>

      <style jsx global>{`
        :root {
          color-scheme: dark;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: "Inter", system-ui, -apple-system, sans-serif;
          background: radial-gradient(circle at top, #1b2440 0%, #0b1020 50%, #070b14 100%);
          color: #e8eefb;
        }

        .page {
          min-height: 100vh;
          padding: 48px 16px 80px;
        }

        .container {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .hero {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: center;
          justify-content: space-between;
          background: rgba(12, 18, 34, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
        }

        .hero-content {
          max-width: 540px;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 12px;
          color: #9fb3ff;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0 0 12px;
          font-size: clamp(28px, 4vw, 40px);
        }

        .subtitle {
          margin: 0 0 16px;
          color: #cbd5f5;
          line-height: 1.6;
        }

        .chip {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(76, 104, 216, 0.2);
          color: #e7ecff;
          font-size: 12px;
        }

        .chip span {
          font-family: "SFMono-Regular", ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .hero-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 240px;
        }

        .status {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(12, 18, 34, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 13px;
        }

        .status strong {
          font-weight: 600;
          color: #ffffff;
        }

        .grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        }

        .card {
          background: rgba(12, 18, 34, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 18px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
        }

        .card-header h2 {
          margin: 0 0 6px;
          font-size: 20px;
        }

        .card-header p {
          margin: 0;
          color: #9fb3ff;
          font-size: 13px;
        }

        .fields {
          display: grid;
          gap: 12px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          color: #cbd5f5;
        }

        .input {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(8, 12, 22, 0.8);
          color: #f8faff;
          font-size: 14px;
        }

        .input:focus {
          outline: none;
          border-color: #5b7bff;
          box-shadow: 0 0 0 3px rgba(91, 123, 255, 0.25);
        }

        .textarea {
          min-height: 80px;
          resize: vertical;
        }

        .row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .button {
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.1);
          color: #e7ecff;
          cursor: pointer;
          font-size: 14px;
          transition: transform 0.15s ease, background 0.2s ease;
        }

        .button:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.18);
        }

        .button.primary {
          background: linear-gradient(135deg, #5b7bff, #7f5bff);
          color: #fff;
        }

        .button.ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
          color: #a8b8e8;
        }

        .meta strong {
          color: #ffffff;
          word-break: break-all;
        }
      `}</style>
    </main>
  );
}
