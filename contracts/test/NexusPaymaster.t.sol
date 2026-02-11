// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {PackedUserOperation} from "account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import {EntryPoint} from "account-abstraction/contracts/core/EntryPoint.sol";
import {NexusVerifyingPaymaster} from "../src/NexusVerifyingPaymaster.sol";

contract NexusPaymasterTest is Test {
    NexusVerifyingPaymaster private paymaster;
    EntryPoint private entryPoint;
    uint256 private signerKey;
    address private signer;

    function setUp() public {
        signerKey = 0xA11CE;
        signer = vm.addr(signerKey);
        entryPoint = new EntryPoint();
        paymaster = new NexusVerifyingPaymaster(IEntryPoint(address(entryPoint)), signer);
    }

    function testValidatePaymasterSignature() public {
        PackedUserOperation memory userOp = _userOp();
        (uint48 validUntil, uint48 validAfter) = (uint48(block.timestamp + 1 days), uint48(block.timestamp));

        bytes memory sig = _signPaymaster(userOp, validUntil, validAfter, signerKey);
        userOp.paymasterAndData = _packPaymasterAndData(validUntil, validAfter, sig);

        vm.prank(address(entryPoint));
        (bytes memory context, uint256 validation) = paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0);
        assertEq(context.length, 0);
        assertEq(uint256(uint160(validation)), 0);
    }

    function testValidatePaymasterSignatureFailure() public {
        PackedUserOperation memory userOp = _userOp();
        (uint48 validUntil, uint48 validAfter) = (uint48(block.timestamp + 1 days), uint48(block.timestamp));

        bytes memory sig = _signPaymaster(userOp, validUntil, validAfter, 0xB0B);
        userOp.paymasterAndData = _packPaymasterAndData(validUntil, validAfter, sig);

        vm.prank(address(entryPoint));
        (, uint256 validation) = paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0);
        assertEq(uint256(uint160(validation)), 1);
    }

    function testParsePaymasterAndData() public {
        PackedUserOperation memory userOp = _userOp();
        (uint48 validUntil, uint48 validAfter) = (uint48(123), uint48(456));

        bytes memory sig = _signPaymaster(userOp, validUntil, validAfter, signerKey);
        bytes memory paymasterAndData = _packPaymasterAndData(validUntil, validAfter, sig);

        (uint48 parsedUntil, uint48 parsedAfter, bytes memory parsedSig) = paymaster.parsePaymasterAndData(
            paymasterAndData
        );
        assertEq(parsedUntil, validUntil);
        assertEq(parsedAfter, validAfter);
        assertEq(parsedSig, sig);
    }

    function _signPaymaster(
        PackedUserOperation memory userOp,
        uint48 validUntil,
        uint48 validAfter,
        uint256 key
    ) private view returns (bytes memory) {
        userOp.paymasterAndData = _packPaymasterAndData(validUntil, validAfter, "");
        bytes32 hash = paymaster.getHash(userOp, validUntil, validAfter);
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(hash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _packPaymasterAndData(
        uint48 validUntil,
        uint48 validAfter,
        bytes memory signature
    ) private view returns (bytes memory) {
        return abi.encodePacked(
            address(paymaster),
            uint128(0),
            uint128(0),
            abi.encode(validUntil, validAfter),
            signature
        );
    }

    function _userOp() private pure returns (PackedUserOperation memory) {
        return PackedUserOperation({
            sender: address(0xBEEF),
            nonce: 0,
            initCode: "",
            callData: "",
            accountGasLimits: bytes32(0),
            preVerificationGas: 0,
            gasFees: bytes32(0),
            paymasterAndData: "",
            signature: ""
        });
    }
}
