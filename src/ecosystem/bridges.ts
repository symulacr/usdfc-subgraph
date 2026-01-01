/**
 * V7 Bridge Integration - Axelar Gateway
 * Tracks cross-chain USDFC transfers via Axelar bridge
 */

import { BigInt, BigDecimal, Address, Bytes, log } from "@graphprotocol/graph-ts";
import {
  ContractCall,
  ContractCallApproved,
  ContractCallApprovedWithMint,
  ContractCallExecuted,
  ContractCallWithToken,
  TokenDeployed,
  TokenSent
} from "../../generated/Axelar_Gateway/AxelarGateway";
import {
  BridgeOperation,
  BridgeProfile,
  Account,
  Transaction,
  EcosystemStats
} from "../../generated/schema";

/**
 * Handle cross-chain contract calls via Axelar
 */
export function handleContractCall(event: ContractCall): void {
  log.info("Axelar ContractCall from {} to chain {}", [
    event.params.sender.toHexString(),
    event.params.destinationChain
  ]);

  // Create bridge operation entity
  const operationId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let operation = new BridgeOperation(operationId);

  operation.transaction = event.transaction.hash;
  operation.timestamp = event.block.timestamp;
  operation.blockNumber = event.block.number;
  operation.sender = event.params.sender.toHex();
  operation.bridge = "Axelar";
  operation.sourceChain = "Filecoin";
  operation.destinationChain = event.params.destinationChain;
  operation.destinationAddress = event.params.destinationContractAddress;
  operation.status = "Initiated";
  operation.hash = event.params.payloadHash.toHex();

  operation.save();

  // Update sender's bridge profile
  updateBridgeProfile(event.params.sender, event.block.timestamp);
}

/**
 * Handle contract calls with token transfers
 */
export function handleContractCallWithToken(event: ContractCallWithToken): void {
  log.info("Axelar ContractCallWithToken: {} sending {} {} to chain {}", [
    event.params.sender.toHexString(),
    event.params.amount.toString(),
    event.params.symbol,
    event.params.destinationChain
  ]);

  // Create bridge operation entity
  const operationId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let operation = new BridgeOperation(operationId);

  operation.transaction = event.transaction.hash;
  operation.timestamp = event.block.timestamp;
  operation.blockNumber = event.block.number;
  operation.sender = event.params.sender.toHex();
  operation.bridge = "Axelar";
  operation.sourceChain = "Filecoin";
  operation.destinationChain = event.params.destinationChain;
  operation.destinationAddress = event.params.destinationContractAddress;
  operation.status = "Initiated";
  operation.hash = event.params.payloadHash.toHex();

  // Token details
  operation.tokenSymbol = event.params.symbol;
  operation.amount = event.params.amount;

  operation.save();

  // Update sender's bridge profile
  updateBridgeProfile(event.params.sender, event.block.timestamp);

  // Update ecosystem stats
  updateEcosystemStats(event.params.symbol, event.params.amount, event.block.timestamp);
}

/**
 * Handle token sent events (outgoing bridge transfers)
 */
export function handleTokenSent(event: TokenSent): void {
  log.info("Axelar TokenSent: {} sending {} {} to chain {}", [
    event.params.sender.toHexString(),
    event.params.amount.toString(),
    event.params.symbol,
    event.params.destinationChain
  ]);

  // Create bridge operation entity
  const operationId = event.transaction.hash.concatI32(event.logIndex.toI32());
  let operation = new BridgeOperation(operationId);

  operation.transaction = event.transaction.hash;
  operation.timestamp = event.block.timestamp;
  operation.blockNumber = event.block.number;
  operation.sender = event.params.sender.toHex();
  operation.bridge = "Axelar";
  operation.sourceChain = "Filecoin";
  operation.destinationChain = event.params.destinationChain;
  operation.destinationAddress = event.params.destinationAddress;
  operation.status = "Sent";

  // Token details
  operation.tokenSymbol = event.params.symbol;
  operation.amount = event.params.amount;

  operation.save();

  // Update sender's bridge profile
  updateBridgeProfile(event.params.sender, event.block.timestamp);

  // Update ecosystem stats
  updateEcosystemStats(event.params.symbol, event.params.amount, event.block.timestamp);
}

/**
 * Handle approved contract calls (bridge operation confirmed)
 */
export function handleContractCallApproved(event: ContractCallApproved): void {
  log.info("Axelar ContractCallApproved: command {} from chain {}", [
    event.params.commandId.toHex(),
    event.params.sourceChain
  ]);

  // Try to find existing operation by command ID or create new one
  const operationId = Bytes.fromHexString(event.params.commandId.toHex());
  let operation = BridgeOperation.load(operationId);

  if (operation == null) {
    operation = new BridgeOperation(operationId);
    operation.transaction = event.transaction.hash;
    operation.timestamp = event.block.timestamp;
    operation.blockNumber = event.block.number;
    operation.bridge = "Axelar";
  }

  operation.sourceChain = event.params.sourceChain;
  operation.destinationChain = "Filecoin";
  operation.sender = event.params.sourceAddress;
  operation.destinationAddress = event.params.contractAddress.toHex();
  operation.status = "Approved";
  operation.sourceTxHash = event.params.sourceTxHash.toHex();
  operation.hash = event.params.sourceEventIndex.toHex();

  operation.save();
}

/**
 * Handle executed contract calls (bridge operation completed)
 */
export function handleContractCallExecuted(event: ContractCallExecuted): void {
  log.info("Axelar ContractCallExecuted: command {}", [
    event.params.commandId.toHex()
  ]);

  // Update operation status
  const operationId = Bytes.fromHexString(event.params.commandId.toHex());
  let operation = BridgeOperation.load(operationId);

  if (operation != null) {
    operation.status = "Executed";
    operation.save();
  }
}

/**
 * Update user's bridge profile with latest activity
 */
function updateBridgeProfile(userAddress: Address, timestamp: BigInt): void {
  const profileId = userAddress;
  let profile = BridgeProfile.load(profileId);

  if (profile == null) {
    profile = new BridgeProfile(profileId);
    profile.account = userAddress;
    profile.totalBridgeOperations = BigInt.fromI32(0);
    profile.totalBridgeVolume = BigInt.fromI32(0);
    profile.uniqueChainsInteracted = 0;
    profile.firstBridgeTimestamp = timestamp;
    profile.preferredBridge = "Axelar";
    profile.averageBridgeSize = BigDecimal.fromString("0");
    profile.bridgeFrequency = BigDecimal.fromString("0");
    profile.crossChainComposability = BigDecimal.fromString("0");
  }

  profile.totalBridgeOperations = profile.totalBridgeOperations.plus(BigInt.fromI32(1));
  profile.lastBridgeTimestamp = timestamp;

  profile.save();

  // Note: Account entity creation is handled by the main USDFC token handler
  // We just track bridge profile here
}

/**
 * Update ecosystem statistics
 */
function updateEcosystemStats(symbol: string, amount: BigInt, timestamp: BigInt): void {
  const statsId = "global";
  let stats = EcosystemStats.load(statsId);

  if (stats == null) {
    // EcosystemStats entity will be created by the main USDFC handler
    // Just track bridge volume here
    return;
  }

  // Track bridge volume if it's USDFC
  if (symbol == "USDFC") {
    stats.bridgeVolume = stats.bridgeVolume.plus(amount);
    stats.totalEcosystemVolume = stats.totalEcosystemVolume.plus(amount);
  }

  stats.save();
}
