export const entryPointAbi = [
  {
    type: "function",
    name: "getNonce",
    stateMutability: "view",
    inputs: [
      { name: "sender", type: "address" },
      { name: "key", type: "uint192" }
    ],
    outputs: [{ name: "nonce", type: "uint256" }]
  }
] as const;
