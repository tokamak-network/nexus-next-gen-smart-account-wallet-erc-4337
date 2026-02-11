// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IAccount} from "account-abstraction/contracts/interfaces/IAccount.sol";
import {IAccountExecute} from "account-abstraction/contracts/interfaces/IAccountExecute.sol";

/**
 * @title INexusAccount
 * @notice Interface for the Nexus Smart Account
 * @dev Extends ERC-4337 IAccount interface with additional Nexus-specific functionality
 */
interface INexusAccount is IAccount, IAccountExecute {
    /**
     * @notice Emitted when the owner of the account is updated
     * @param oldOwner The previous owner address
     * @param newOwner The new owner address
     */
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    /**
     * @notice Emitted when a session key is added
     * @param sessionKey The session key address that was added
     * @param validUntil Timestamp until which the session key is valid
     * @param gasLimit Maximum gas the session key can use per transaction
     * @param targetContracts Array of contracts the session key can interact with
     */
    event SessionKeyAdded(
        address indexed sessionKey,
        uint48 validUntil,
        uint256 gasLimit,
        address[] targetContracts
    );

    /**
     * @notice Emitted when a session key is removed
     * @param sessionKey The session key address that was removed
     */
    event SessionKeyRemoved(address indexed sessionKey);

    /**
     * @notice Emitted when a guardian is added
     * @param guardian The guardian address that was added
     */
    event GuardianAdded(address indexed guardian);

    /**
     * @notice Emitted when a guardian is removed
     * @param guardian The guardian address that was removed
     */
    event GuardianRemoved(address indexed guardian);

    /**
     * @notice Emitted when recovery is initiated
     * @param recoveryId Unique identifier for the recovery process
     * @param newOwner The proposed new owner address
     * @param initiator The address that initiated the recovery
     * @param executeAfter Timestamp after which recovery can be executed
     */
    event RecoveryInitiated(
        bytes32 indexed recoveryId,
        address indexed newOwner,
        address indexed initiator,
        uint256 executeAfter
    );

    /**
     * @notice Emitted when recovery is confirmed by a guardian
     * @param recoveryId Unique identifier for the recovery process
     * @param guardian The guardian that confirmed
     */
    event RecoveryConfirmed(bytes32 indexed recoveryId, address indexed guardian);

    /**
     * @notice Emitted when recovery is executed
     * @param recoveryId Unique identifier for the recovery process
     * @param newOwner The new owner address after recovery
     */
    event RecoveryExecuted(bytes32 indexed recoveryId, address indexed newOwner);

    /**
     * @notice Initialize the smart account with an owner
     * @dev This function should be called by the factory during deployment
     * @param owner The initial owner of the account
     */
    function initialize(address owner) external;

    /**
     * @notice Get the current owner of the account
     * @return The address of the current owner
     */
    function owner() external view returns (address);

    /**
     * @notice Transfer ownership to a new address
     * @dev Can only be called by the current owner
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external;

    /**
     * @notice Execute a transaction from the account
     * @dev Can only be called by the owner or an authorized session key
     * @param dest Destination address to call
     * @param value ETH value to send with the call
     * @param func Data payload for the call
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external;

    /**
     * @notice Add a session key with specific permissions
     * @dev Can only be called by the owner
     * @param sessionKey Address of the session key to add
     * @param validUntil Timestamp until which the session key is valid
     * @param gasLimit Maximum gas the session key can use per transaction
     * @param targetContracts Array of contracts the session key can interact with
     */
    function addSessionKey(
        address sessionKey,
        uint48 validUntil,
        uint256 gasLimit,
        address[] calldata targetContracts
    ) external;

    /**
     * @notice Remove a session key
     * @dev Can only be called by the owner
     * @param sessionKey Address of the session key to remove
     */
    function removeSessionKey(address sessionKey) external;

    /**
     * @notice Check if an address is a valid session key
     * @param sessionKey Address to check
     * @return True if the address is a valid session key
     */
    function isValidSessionKey(address sessionKey) external view returns (bool);

    /**
     * @notice Add a guardian for social recovery
     * @dev Can only be called by the owner
     * @param guardian Address of the guardian to add
     */
    function addGuardian(address guardian) external;

    /**
     * @notice Remove a guardian
     * @dev Can only be called by the owner
     * @param guardian Address of the guardian to remove
     */
    function removeGuardian(address guardian) external;

    /**
     * @notice Check if an address is a guardian
     * @param guardian Address to check
     * @return True if the address is a guardian
     */
    function isGuardian(address guardian) external view returns (bool);

    /**
     * @notice Get the number of guardians
     * @return The total number of guardians
     */
    function guardianCount() external view returns (uint256);

    /**
     * @notice Get the recovery threshold (minimum guardians required for recovery)
     * @return The recovery threshold
     */
    function recoveryThreshold() external view returns (uint256);

    /**
     * @notice Initiate a social recovery process
     * @dev Can be called by any guardian
     * @param newOwner The proposed new owner address
     * @return recoveryId Unique identifier for this recovery process
     */
    function initiateRecovery(address newOwner) external returns (bytes32);

    /**
     * @notice Confirm a recovery process
     * @dev Can only be called by a guardian
     * @param recoveryId Unique identifier for the recovery process
     */
    function confirmRecovery(bytes32 recoveryId) external;

    /**
     * @notice Execute a recovery after the timelock period
     * @dev Can be called by anyone after timelock has passed
     * @param recoveryId Unique identifier for the recovery process
     */
    function executeRecovery(bytes32 recoveryId) external;
}