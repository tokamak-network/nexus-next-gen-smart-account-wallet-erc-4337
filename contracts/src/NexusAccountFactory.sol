// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {NexusAccount} from "./NexusAccount.sol";

contract NexusAccountFactory {
    IEntryPoint public immutable entryPoint;

    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
    }

    function createAccount(address owner, uint256 salt) external returns (address account) {
        bytes32 finalSalt = _getSalt(owner, salt);
        bytes memory bytecode = _getBytecode();
        account = Create2.computeAddress(finalSalt, keccak256(bytecode));
        if (account.code.length > 0) {
            return account;
        }
        account = Create2.deploy(0, finalSalt, bytecode);
        NexusAccount(payable(account)).initialize(owner);
    }

    function getAddress(address owner, uint256 salt) external view returns (address) {
        bytes32 finalSalt = _getSalt(owner, salt);
        return Create2.computeAddress(finalSalt, keccak256(_getBytecode()));
    }

    function _getSalt(address owner, uint256 salt) internal pure returns (bytes32) {
        return keccak256(abi.encode(owner, salt));
    }

    function _getBytecode() internal view returns (bytes memory) {
        return abi.encodePacked(type(NexusAccount).creationCode, abi.encode(entryPoint));
    }
}
