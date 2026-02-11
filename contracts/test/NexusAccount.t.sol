// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
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
    Receiver private receiver;
    uint256 private ownerKey;
    address private owner;

    receive() external payable {}

    function setUp() public {
        ownerKey = 0xA11CE;
        owner = vm.addr(ownerKey);
        account = new NexusAccount(IEntryPoint(address(this)));
        account.initialize(owner);
        receiver = new Receiver();
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
        PackedUserOperation memory userOp = _userOp(signature, "", bytes32(0));

        uint256 validation = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validation, 0);
    }

    function testValidateUserOpInvalidSignature() public {
        bytes32 userOpHash = keccak256("userOp");
        bytes memory signature = _sign(userOpHash, 0xB0B);
        PackedUserOperation memory userOp = _userOp(signature, "", bytes32(0));

        uint256 validation = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validation, 1);
    }

    function testValidateUserOpMissingFundsTransfers() public {
        bytes32 userOpHash = keccak256("userOp");
        bytes memory signature = _sign(userOpHash, ownerKey);
        PackedUserOperation memory userOp = _userOp(signature, "", bytes32(0));

        uint256 missingFunds = 1 ether;
        vm.deal(address(account), 2 ether);
        address entryPoint = address(account.entryPoint());
        vm.deal(entryPoint, 0);

        vm.prank(entryPoint);
        account.validateUserOp(userOp, userOpHash, missingFunds);
        assertEq(entryPoint.balance, missingFunds);
    }

    function testExecuteByOwner() public {
        vm.deal(address(account), 1 ether);

        bytes memory data = abi.encodeCall(receiver.setValue, (123));
        vm.prank(owner);
        account.execute(address(receiver), 1 ether, data);

        assertEq(receiver.value(), 123);
        assertEq(address(receiver).balance, 1 ether);
    }

    function testExecuteByEntryPoint() public {
        vm.deal(address(account), 1 ether);

        bytes memory data = abi.encodeCall(receiver.setValue, (7));
        account.execute(address(receiver), 1 ether, data);

        assertEq(receiver.value(), 7);
    }

    function testExecuteBySessionKey() public {
        uint256 sessionKey = 0xB0B1;
        address session = vm.addr(sessionKey);
        address[] memory targets = new address[](1);
        targets[0] = address(receiver);

        vm.prank(owner);
        account.addSessionKey(session, 0, 0, targets);

        bytes memory data = abi.encodeCall(receiver.setValue, (55));
        vm.prank(session);
        account.execute(address(receiver), 0, data);

        assertEq(receiver.value(), 55);
    }

    function testExecuteRevertsForUnauthorized() public {
        bytes memory data = abi.encodeCall(receiver.setValue, (1));

        vm.prank(address(0xCAFE));
        vm.expectRevert("account: session key inactive");
        account.execute(address(receiver), 0, data);
    }

    function testValidateUserOpSessionKey() public {
        uint256 sessionKey = 0xB0B1;
        address session = vm.addr(sessionKey);
        address[] memory targets = new address[](1);
        targets[0] = address(receiver);

        vm.prank(owner);
        account.addSessionKey(session, 0, 200_000, targets);

        bytes memory data = abi.encodeCall(receiver.setValue, (9));
        bytes memory callData = abi.encodeWithSelector(account.execute.selector, address(receiver), 0, data);
        bytes32 accountGasLimits = _packAccountGasLimits(0, 150_000);
        bytes32 userOpHash = keccak256("session");

        PackedUserOperation memory userOp = _userOp(_sign(userOpHash, sessionKey), callData, accountGasLimits);
        uint256 validation = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validation, 0);
    }

    function testValidateUserOpSessionKeyWrongTarget() public {
        uint256 sessionKey = 0xB0B1;
        address session = vm.addr(sessionKey);
        address[] memory targets = new address[](1);
        targets[0] = address(receiver);

        vm.prank(owner);
        account.addSessionKey(session, 0, 200_000, targets);

        bytes memory data = abi.encodeCall(receiver.setValue, (9));
        bytes memory callData = abi.encodeWithSelector(account.execute.selector, address(0xDEAD), 0, data);
        bytes32 accountGasLimits = _packAccountGasLimits(0, 150_000);
        bytes32 userOpHash = keccak256("session");

        PackedUserOperation memory userOp = _userOp(_sign(userOpHash, sessionKey), callData, accountGasLimits);
        uint256 validation = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validation, 1);
    }

    function testValidateUserOpSessionKeyGasLimit() public {
        uint256 sessionKey = 0xB0B1;
        address session = vm.addr(sessionKey);
        address[] memory targets = new address[](1);
        targets[0] = address(receiver);

        vm.prank(owner);
        account.addSessionKey(session, 0, 1000, targets);

        bytes memory data = abi.encodeCall(receiver.setValue, (9));
        bytes memory callData = abi.encodeWithSelector(account.execute.selector, address(receiver), 0, data);
        bytes32 accountGasLimits = _packAccountGasLimits(0, 2000);
        bytes32 userOpHash = keccak256("session");

        PackedUserOperation memory userOp = _userOp(_sign(userOpHash, sessionKey), callData, accountGasLimits);
        uint256 validation = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validation, 1);
    }

    function testRemoveSessionKey() public {
        uint256 sessionKey = 0xB0B1;
        address session = vm.addr(sessionKey);

        vm.prank(owner);
        account.addSessionKey(session, 0, 0, new address[](0));

        vm.prank(owner);
        account.removeSessionKey(session);

        bytes32 userOpHash = keccak256("session");
        PackedUserOperation memory userOp = _userOp(_sign(userOpHash, sessionKey), "", bytes32(0));
        uint256 validation = account.validateUserOp(userOp, userOpHash, 0);
        assertEq(validation, 1);
    }

    function testRecoveryFlow() public {
        address guardian1 = address(0x1111);
        address guardian2 = address(0x2222);
        address guardian3 = address(0x3333);

        vm.startPrank(owner);
        account.addGuardian(guardian1);
        account.addGuardian(guardian2);
        account.addGuardian(guardian3);
        vm.stopPrank();

        address newOwner = address(0xBEEF);
        vm.prank(guardian1);
        bytes32 recoveryId = account.initiateRecovery(newOwner);

        vm.prank(guardian2);
        account.confirmRecovery(recoveryId);

        vm.expectRevert("account: recovery timelock");
        account.executeRecovery(recoveryId);

        vm.warp(block.timestamp + 1 days);
        account.executeRecovery(recoveryId);

        assertEq(account.owner(), newOwner);
    }

    function testRecoveryRequiresThreeGuardians() public {
        vm.startPrank(owner);
        account.addGuardian(address(0x1111));
        account.addGuardian(address(0x2222));
        vm.stopPrank();

        vm.prank(address(0x1111));
        vm.expectRevert("account: insufficient guardians");
        account.initiateRecovery(address(0xBEEF));
    }

    function testRemoveGuardianBelowThreshold() public {
        vm.startPrank(owner);
        account.addGuardian(address(0x1111));
        account.addGuardian(address(0x2222));
        vm.stopPrank();

        vm.prank(owner);
        vm.expectRevert("account: guardian below threshold");
        account.removeGuardian(address(0x1111));
    }

    function _userOp(
        bytes memory signature,
        bytes memory callData,
        bytes32 accountGasLimits
    ) private pure returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: address(0),
            nonce: 0,
            initCode: "",
            callData: callData,
            accountGasLimits: accountGasLimits,
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: signature
        });
    }

    function _sign(bytes32 hash, uint256 key) private returns (bytes memory) {
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(hash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _packAccountGasLimits(uint128 verificationGasLimit, uint128 callGasLimit) private pure returns (bytes32) {
        return bytes32((uint256(verificationGasLimit) << 128) | uint256(callGasLimit));
    }
}
