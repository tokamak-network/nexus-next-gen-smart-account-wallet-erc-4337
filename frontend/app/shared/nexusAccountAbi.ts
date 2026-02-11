export const nexusAccountAbi = [
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dest", type: "address" },
      { name: "value", type: "uint256" },
      { name: "func", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "addSessionKey",
    stateMutability: "nonpayable",
    inputs: [
      { name: "sessionKey", type: "address" },
      { name: "validUntil", type: "uint48" },
      { name: "gasLimit", type: "uint256" },
      { name: "targetContracts", type: "address[]" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "removeSessionKey",
    stateMutability: "nonpayable",
    inputs: [{ name: "sessionKey", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "addGuardian",
    stateMutability: "nonpayable",
    inputs: [{ name: "guardian", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "removeGuardian",
    stateMutability: "nonpayable",
    inputs: [{ name: "guardian", type: "address" }],
    outputs: []
  },
  {
    type: "function",
    name: "initiateRecovery",
    stateMutability: "nonpayable",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [{ name: "recoveryId", type: "bytes32" }]
  },
  {
    type: "function",
    name: "confirmRecovery",
    stateMutability: "nonpayable",
    inputs: [{ name: "recoveryId", type: "bytes32" }],
    outputs: []
  },
  {
    type: "function",
    name: "executeRecovery",
    stateMutability: "nonpayable",
    inputs: [{ name: "recoveryId", type: "bytes32" }],
    outputs: []
  }
] as const;
