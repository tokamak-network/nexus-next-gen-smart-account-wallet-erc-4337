// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";

import {IEntryPoint} from "account-abstraction/contracts/interfaces/IEntryPoint.sol";
import {NexusAccountFactory} from "../contracts/src/NexusAccountFactory.sol";
import {NexusVerifyingPaymaster} from "../contracts/src/NexusVerifyingPaymaster.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address entryPoint = vm.envOr("ENTRYPOINT", address(0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789));
        address verifyingSigner = vm.envAddress("VERIFYING_SIGNER");

        vm.startBroadcast(deployerKey);
        NexusAccountFactory factory = new NexusAccountFactory(IEntryPoint(entryPoint));
        NexusVerifyingPaymaster paymaster = new NexusVerifyingPaymaster(IEntryPoint(entryPoint), verifyingSigner);
        vm.stopBroadcast();

        factory;
        paymaster;
    }
}
