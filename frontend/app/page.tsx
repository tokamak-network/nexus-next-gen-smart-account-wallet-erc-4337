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
    <main style={{ padding: "32px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Nexus Smart Account Dashboard</h1>
      <p style={{ marginTop: 0 }}>
        EntryPoint: <code>{entryPoint}</code>
      </p>

      <section style={{ border: "1px solid #eee", padding: 16, marginBottom: 16 }}>
        <h2>Connection</h2>
        <button onClick={connectWallet}>Connect Wallet (stub)</button>
        <p>Status: {status || "Idle"}</p>
      </section>

      <section style={{ border: "1px solid #eee", padding: 16, marginBottom: 16 }}>
        <h2>Account Deployment</h2>
        <label>
          Factory Address
          <input
            style={{ display: "block", width: "100%" }}
            value={factoryAddress}
            onChange={(event) => setFactoryAddress(event.target.value)}
            placeholder="0x..."
          />
        </label>
        <label>
          Salt
          <input
            style={{ display: "block", width: "100%" }}
            value={salt}
            onChange={(event) => setSalt(event.target.value)}
          />
        </label>
        <div style={{ marginTop: 12 }}>
          <button onClick={computeAccountAddress} disabled={!isReady}>
            Compute Address
          </button>
          <button onClick={deployAccount} disabled={!isReady} style={{ marginLeft: 8 }}>
            Deploy Account
          </button>
        </div>
        <p>Account Address: {accountAddress || "—"}</p>
      </section>

      <section style={{ border: "1px solid #eee", padding: 16, marginBottom: 16 }}>
        <h2>Execute Call</h2>
        <label>
          Destination
          <input
            style={{ display: "block", width: "100%" }}
            value={dest}
            onChange={(event) => setDest(event.target.value)}
            placeholder="0x..."
          />
        </label>
        <label>
          Value (ETH)
          <input
            style={{ display: "block", width: "100%" }}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <label>
          Calldata
          <input
            style={{ display: "block", width: "100%" }}
            value={callData}
            onChange={(event) => setCallData(event.target.value)}
          />
        </label>
        <button onClick={sendExecute} disabled={!isReady} style={{ marginTop: 8 }}>
          Execute
        </button>
      </section>

      <section style={{ border: "1px solid #eee", padding: 16, marginBottom: 16 }}>
        <h2>Session Keys</h2>
        <label>
          Session Key
          <input
            style={{ display: "block", width: "100%" }}
            value={sessionKeyInput.key}
            onChange={(event) =>
              setSessionKeyInput((prev) => ({
                ...prev,
                key: event.target.value
              }))
            }
          />
        </label>
        <label>
          Valid Until (unix timestamp)
          <input
            style={{ display: "block", width: "100%" }}
            value={sessionKeyInput.validUntil}
            onChange={(event) =>
              setSessionKeyInput((prev) => ({
                ...prev,
                validUntil: event.target.value
              }))
            }
          />
        </label>
        <label>
          Gas Limit
          <input
            style={{ display: "block", width: "100%" }}
            value={sessionKeyInput.gasLimit}
            onChange={(event) =>
              setSessionKeyInput((prev) => ({
                ...prev,
                gasLimit: event.target.value
              }))
            }
          />
        </label>
        <label>
          Target Contracts (comma separated)
          <input
            style={{ display: "block", width: "100%" }}
            value={sessionKeyInput.targets}
            onChange={(event) =>
              setSessionKeyInput((prev) => ({
                ...prev,
                targets: event.target.value
              }))
            }
          />
        </label>
        <div style={{ marginTop: 12 }}>
          <button onClick={addSessionKey} disabled={!isReady}>
            Add Session Key
          </button>
          <button onClick={removeSessionKey} disabled={!isReady} style={{ marginLeft: 8 }}>
            Remove Session Key
          </button>
        </div>
      </section>

      <section style={{ border: "1px solid #eee", padding: 16, marginBottom: 16 }}>
        <h2>Guardians</h2>
        <label>
          Guardian Address
          <input
            style={{ display: "block", width: "100%" }}
            value={guardianInput.guardian}
            onChange={(event) => setGuardianInput({ guardian: event.target.value })}
          />
        </label>
        <div style={{ marginTop: 12 }}>
          <button onClick={addGuardian} disabled={!isReady}>
            Add Guardian
          </button>
          <button onClick={removeGuardian} disabled={!isReady} style={{ marginLeft: 8 }}>
            Remove Guardian
          </button>
        </div>
      </section>

      <section style={{ border: "1px solid #eee", padding: 16 }}>
        <h2>Recovery</h2>
        <label>
          New Owner
          <input
            style={{ display: "block", width: "100%" }}
            value={recoveryOwner}
            onChange={(event) => setRecoveryOwner(event.target.value)}
          />
        </label>
        <label>
          Recovery ID
          <input
            style={{ display: "block", width: "100%" }}
            value={recoveryId}
            onChange={(event) => setRecoveryId(event.target.value)}
          />
        </label>
        <div style={{ marginTop: 12 }}>
          <button onClick={initiateRecovery} disabled={!isReady}>
            Initiate
          </button>
          <button onClick={confirmRecovery} disabled={!isReady} style={{ marginLeft: 8 }}>
            Confirm
          </button>
          <button onClick={executeRecovery} disabled={!isReady} style={{ marginLeft: 8 }}>
            Execute
          </button>
        </div>
      </section>
    </main>
  );
}
