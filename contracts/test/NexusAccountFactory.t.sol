// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";

import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {NexusAccount} from "../src/NexusAccount.sol";
import {NexusAccountFactory} from "../src/NexusAccountFactory.sol";

contract NexusAccountFactoryTest is Test {
    NexusAccountFactory private factory;

    function setUp() public {
        factory = new NexusAccountFactory(IEntryPoint(address(this)));
    }

    function testCreateAccountAndGetAddressMatch() public {
        address owner = address(0x1234);
        uint256 salt = 42;

        address expected = factory.getAddress(owner, salt);
        address deployed = factory.createAccount(owner, salt);

        assertEq(deployed, expected);
        assertGt(deployed.code.length, 0);
        assertEq(NexusAccount(payable(deployed)).owner(), owner);
    }

    function testCreateAccountIdempotent() public {
        address owner = address(0xBEEF);
        uint256 salt = 99;

        address first = factory.createAccount(owner, salt);
        address second = factory.createAccount(owner, salt);

        assertEq(first, second);
    }
}
