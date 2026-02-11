// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IAccount} from "account-abstraction/contracts/interfaces/IAccount.sol";
import {IAccountExecute} from "account-abstraction/contracts/interfaces/IAccountExecute.sol";
import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";

contract NexusAccount is IAccount, IAccountExecute, ReentrancyGuard {
    address public owner;
    IEntryPoint public immutable entryPoint;
    bool public initialized;

    modifier onlyOwner() {
        require(msg.sender == owner, "account: not owner");
        _;
    }

    modifier onlyEntryPointOrOwner() {
        require(msg.sender == owner || msg.sender == address(entryPoint), "account: not owner or entrypoint");
        _;
    }

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
    }

    receive() external payable {}

    function initialize(address _owner) external {
        require(!initialized, "account: already initialized");
        initialized = true;
        owner = _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        require(msg.sender == address(entryPoint), "account: not entrypoint");
        address signer = ECDSA.recover(userOpHash, userOp.signature);
        validationData = signer == owner ? 0 : 1;

        if (missingAccountFunds > 0) {
            (bool success, ) = payable(msg.sender).call{value: missingAccountFunds}("");
            success;
        }
    }

    function execute(address dest, uint256 value, bytes calldata func) external nonReentrant onlyEntryPointOrOwner {
        _call(dest, value, func);
    }

    function executeUserOp(PackedUserOperation calldata userOp, bytes32) external override {
        require(msg.sender == address(entryPoint), "account: not entrypoint");
        bytes calldata innerCall = userOp.callData[4:];
        (address dest, uint256 value, bytes memory func) = abi.decode(innerCall, (address, uint256, bytes));
        _call(dest, value, func);
    }

    function _call(address dest, uint256 value, bytes memory func) internal {
        (bool success, bytes memory result) = dest.call{value: value}(func);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
}
