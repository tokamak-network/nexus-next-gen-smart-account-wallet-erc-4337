// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {NexusAccount} from "../src/NexusAccount.sol";

contract Receiver {
    uint256 public value;

    function setValue(uint256 newValue) external payable {
        value = newValue;
    }
}

contract NexusAccountTest is Test {
    NexusAccount private account;
    uint256 private ownerKey;
    address private owner;

    receive() external payable {}

    function setUp() public {
        ownerKey = 0xA11CE;
        owner = vm.addr(ownerKey);
        account = new NexusAccount(IEntryPoint(address(this)));
        account.initialize(owner);
    }

    function testInitializeOnlyOnce() public {
        vm.expectRevert("account: already initialized");
        account.initialize(owner);
    }

    function testTransferOwnership() public {
        address newOwner = address(0xBEEF);
        vm.prank(owner);
        account.transferOwnership(newOwner);
        assertEq(account.owner(), newOwner);
    }

    function testValidateUserOpValidSignature() public {
        bytes32 userOpHash = keccak256("userOp");
        bytes memory signature = _sign(userOpHash, ownerKey);
        PackedUserOperation memory userOp = _userOp(signature);

        uint256 validation = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validation, 0);
    }

    function testValidateUserOpInvalidSignature() public {
        bytes32 userOpHash = keccak256("userOp");
        bytes memory signature = _sign(userOpHash, 0xB0B);
        PackedUserOperation memory userOp = _userOp(signature);

        uint256 validation = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validation, 1);
    }

    function testValidateUserOpMissingFundsTransfers() public {
        bytes32 userOpHash = keccak256("userOp");
        bytes memory signature = _sign(userOpHash, ownerKey);
        PackedUserOperation memory userOp = _userOp(signature);

        uint256 missingFunds = 1 ether;
        vm.deal(address(account), 2 ether);
        address entryPoint = address(account.entryPoint());
        vm.deal(entryPoint, 0);

        vm.prank(entryPoint);
        account.validateUserOp(userOp, userOpHash, missingFunds);
        assertEq(entryPoint.balance, missingFunds);
    }

    function testExecuteByOwner() public {
        Receiver receiver = new Receiver();
        vm.deal(address(account), 1 ether);

        bytes memory data = abi.encodeCall(receiver.setValue, (123));
        vm.prank(owner);
        account.execute(address(receiver), 1 ether, data);

        assertEq(receiver.value(), 123);
        assertEq(address(receiver).balance, 1 ether);
    }

    function testExecuteByEntryPoint() public {
        Receiver receiver = new Receiver();
        vm.deal(address(account), 1 ether);

        bytes memory data = abi.encodeCall(receiver.setValue, (7));
        account.execute(address(receiver), 1 ether, data);

        assertEq(receiver.value(), 7);
    }

    function testExecuteRevertsForUnauthorized() public {
        Receiver receiver = new Receiver();
        bytes memory data = abi.encodeCall(receiver.setValue, (1));

        vm.prank(address(0xCAFE));
        vm.expectRevert("account: not owner or entrypoint");
        account.execute(address(receiver), 0, data);
    }

    function _userOp(bytes memory signature) private pure returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: address(0),
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: signature
        });
    }

    function _sign(bytes32 hash, uint256 key) private returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, hash);
        return abi.encodePacked(r, s, v);
    }
}
