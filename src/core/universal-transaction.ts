/**
 * USDFC v0 - Universal Transaction Handler
 * Core system for processing all USDFC ecosystem transactions
 * Combines V5 protocol events + Blockscout ecosystem data
 */

import { BigInt, BigDecimal, Bytes, ethereum, log } from "@graphprotocol/graph-ts"
import {
  Transaction,
  Account,
  ProtocolStats,
  EcosystemStats,
  DailyEcosystemStats,
  ProtocolContext,
  EcosystemContext
} from "../../generated/schema"

// Transaction source classification
export const TRANSACTION_SOURCE_CONTRACT_EVENT = "CONTRACT_EVENT"
export const TRANSACTION_SOURCE_TOKEN_TRANSFER = "TOKEN_TRANSFER"  
export const TRANSACTION_SOURCE_INTERNAL_CALL = "INTERNAL_CALL"
export const TRANSACTION_SOURCE_SYSTEM_LOG = "SYSTEM_LOG"

// Transaction category classification
export const TRANSACTION_CATEGORY_MINT = "MINT"
export const TRANSACTION_CATEGORY_BURN = "BURN"
export const TRANSACTION_CATEGORY_TRANSFER = "TRANSFER"
export const TRANSACTION_CATEGORY_APPROVAL = "APPROVAL"
export const TRANSACTION_CATEGORY_DEX_SWAP = "DEX_SWAP"
export const TRANSACTION_CATEGORY_DEX_LIQUIDITY = "DEX_LIQUIDITY"
export const TRANSACTION_CATEGORY_BRIDGE_TRANSFER = "BRIDGE_TRANSFER"
export const TRANSACTION_CATEGORY_P2P_TRANSFER = "P2P_TRANSFER"

// Ecosystem type classification  
export const ECOSYSTEM_TYPE_PROTOCOL_NATIVE = "PROTOCOL_NATIVE"
export const ECOSYSTEM_TYPE_DEX_ECOSYSTEM = "DEX_ECOSYSTEM"
export const ECOSYSTEM_TYPE_BRIDGE_ECOSYSTEM = "BRIDGE_ECOSYSTEM"
export const ECOSYSTEM_TYPE_DEFI_ECOSYSTEM = "DEFI_ECOSYSTEM"
export const ECOSYSTEM_TYPE_P2P_ECOSYSTEM = "P2P_ECOSYSTEM"

/**
 * Create or update universal transaction record
 * Central hub for all USDFC ecosystem activity
 */
export function createUniversalTransaction(
  hash: Bytes,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  from: Bytes,
  to: Bytes,
  value: BigInt,
  source: string,
  category: string,
  ecosystem: string,
  logIndex: BigInt | null = null,
  gasUsed: BigInt | null = null,
  gasPrice: BigInt | null = null,
  success: boolean = true,
  errorMessage: string | null = null
): Transaction {
  
  // Create unique transaction ID
  let txId = hash
  if (logIndex !== null) {
    txId = hash.concatI32(logIndex.toI32())
  }
  
  let transaction = Transaction.load(txId)
  if (transaction == null) {
    transaction = new Transaction(txId)
    
    // Universal identifiers
    transaction.hash = hash
    transaction.blockNumber = blockNumber
    transaction.blockTimestamp = blockTimestamp
    transaction.logIndex = logIndex
    
    // Universal parties - ensure accounts exist
    transaction.from = ensureAccount(from).id
    transaction.to = ensureAccount(to).id
    transaction.value = value
    
    // Classification
    transaction.source = source
    transaction.category = category
    transaction.ecosystem = ecosystem
    
    // Transaction metadata
    transaction.gasUsed = gasUsed
    transaction.gasPrice = gasPrice
    transaction.success = success
    transaction.errorMessage = errorMessage
    
    // Initialize analytics scores
    transaction.composabilityScore = BigDecimal.fromString("0")
    transaction.innovationScore = BigDecimal.fromString("0")
    transaction.riskScore = BigDecimal.fromString("0")
    
    // Save transaction
    transaction.save()
    
    log.info("Universal transaction created: {} from {} to {} value {}", [
      hash.toHexString(),
      from.toHexString(),
      to.toHexString(),
      value.toString()
    ])
  }
  
  // Update account intelligence
  updateAccountActivity(from, to, value, category, ecosystem, blockTimestamp)
  
  // Update ecosystem statistics
  updateEcosystemStats(category, ecosystem, value, blockTimestamp)
  
  return transaction
}

/**
 * Ensure account exists with enhanced intelligence
 */
export function ensureAccount(address: Bytes): Account {
  let account = Account.load(address)
  if (account == null) {
    account = new Account(address)
    
    // Initialize balance and metrics
    account.usdfcBalance = BigInt.fromI32(0)
    account.totalTransactionCount = BigInt.fromI32(0)
    account.totalVolumeIn = BigInt.fromI32(0)
    account.totalVolumeOut = BigInt.fromI32(0)
    account.netVolume = BigInt.fromI32(0)
    
    // Initialize time tracking
    let currentBlock = getCurrentBlock()
    let currentTimestamp = getCurrentTimestamp()
    account.firstSeenBlock = currentBlock
    account.firstSeenTimestamp = currentTimestamp
    account.lastActiveBlock = currentBlock
    account.lastActiveTimestamp = currentTimestamp
    account.daysSinceFirstSeen = BigInt.fromI32(0)
    account.daysSinceLastActive = BigInt.fromI32(0)
    
    // Initialize activity breakdown by source
    account.contractTransactionCount = BigInt.fromI32(0)
    account.tokenTransferCount = BigInt.fromI32(0)
    account.internalTransactionCount = BigInt.fromI32(0)
    account.systemLogCount = BigInt.fromI32(0)
    
    // Initialize activity breakdown by category
    account.protocolOperationCount = BigInt.fromI32(0)
    account.dexActivityCount = BigInt.fromI32(0)
    account.bridgeActivityCount = BigInt.fromI32(0)
    account.p2pTransferCount = BigInt.fromI32(0)
    account.defiIntegrationCount = BigInt.fromI32(0)
    
    // Initialize volume breakdown by ecosystem
    account.protocolVolume = BigInt.fromI32(0)
    account.dexVolume = BigInt.fromI32(0)
    account.bridgeVolume = BigInt.fromI32(0)
    account.p2pVolume = BigInt.fromI32(0)
    account.defiIntegrationVolume = BigInt.fromI32(0)
    
    // Initialize user intelligence
    account.userType = "RETAIL_USER" // Default classification
    account.riskScore = BigDecimal.fromString("50") // Neutral risk
    account.composabilityScore = BigDecimal.fromString("0")
    account.influenceScore = BigDecimal.fromString("0")
    account.retentionScore = BigDecimal.fromString("50") // Neutral retention
    
    account.save()
    
    log.info("New account created: {}", [address.toHexString()])
  }
  
  return account
}

/**
 * Update account activity with enhanced intelligence
 */
export function updateAccountActivity(
  from: Bytes,
  to: Bytes,
  value: BigInt,
  category: string,
  ecosystem: string,
  timestamp: BigInt
): void {
  
  // Update sender account
  let fromAccount = ensureAccount(from)
  fromAccount.totalTransactionCount = fromAccount.totalTransactionCount.plus(BigInt.fromI32(1))
  fromAccount.totalVolumeOut = fromAccount.totalVolumeOut.plus(value)
  fromAccount.lastActiveBlock = getCurrentBlock()
  fromAccount.lastActiveTimestamp = timestamp
  
  // Update activity by source and category
  updateActivityCounters(fromAccount, category, ecosystem, value)
  
  // Update user classification and scores
  updateUserIntelligence(fromAccount, category, ecosystem, value)
  
  fromAccount.save()
  
  // Update receiver account  
  let toAccount = ensureAccount(to)
  toAccount.totalTransactionCount = toAccount.totalTransactionCount.plus(BigInt.fromI32(1))
  toAccount.totalVolumeIn = toAccount.totalVolumeIn.plus(value)
  toAccount.lastActiveBlock = getCurrentBlock()
  toAccount.lastActiveTimestamp = timestamp
  
  // Update activity by source and category
  updateActivityCounters(toAccount, category, ecosystem, value)
  
  // Update user classification and scores
  updateUserIntelligence(toAccount, category, ecosystem, value)
  
  toAccount.save()
}

/**
 * Update activity counters by category and ecosystem
 */
function updateActivityCounters(account: Account, category: string, ecosystem: string, value: BigInt): void {
  // Update by ecosystem type
  if (ecosystem == ECOSYSTEM_TYPE_PROTOCOL_NATIVE) {
    account.protocolOperationCount = account.protocolOperationCount.plus(BigInt.fromI32(1))
    account.protocolVolume = account.protocolVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_DEX_ECOSYSTEM) {
    account.dexActivityCount = account.dexActivityCount.plus(BigInt.fromI32(1))
    account.dexVolume = account.dexVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_BRIDGE_ECOSYSTEM) {
    account.bridgeActivityCount = account.bridgeActivityCount.plus(BigInt.fromI32(1))
    account.bridgeVolume = account.bridgeVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_P2P_ECOSYSTEM) {
    account.p2pTransferCount = account.p2pTransferCount.plus(BigInt.fromI32(1))
    account.p2pVolume = account.p2pVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_DEFI_ECOSYSTEM) {
    account.defiIntegrationCount = account.defiIntegrationCount.plus(BigInt.fromI32(1))
    account.defiIntegrationVolume = account.defiIntegrationVolume.plus(value)
  }
  
  // Update net volume
  account.netVolume = account.totalVolumeIn.minus(account.totalVolumeOut)
}

/**
 * Update user intelligence and classification
 */
function updateUserIntelligence(account: Account, category: string, ecosystem: string, value: BigInt): void {
  // Update user type based on activity patterns
  let totalActivity = account.totalTransactionCount
  let dexRatio = BigDecimal.fromString("0")
  let protocolRatio = BigDecimal.fromString("0")
  
  if (totalActivity.gt(BigInt.fromI32(0))) {
    dexRatio = account.dexActivityCount.toBigDecimal().div(totalActivity.toBigDecimal())
    protocolRatio = account.protocolOperationCount.toBigDecimal().div(totalActivity.toBigDecimal())
  }
  
  // Classify user type based on activity patterns
  if (dexRatio.gt(BigDecimal.fromString("0.6"))) {
    account.userType = "DEX_TRADER"
  } else if (protocolRatio.gt(BigDecimal.fromString("0.8"))) {
    account.userType = "PROTOCOL_NATIVE"
  } else if (totalActivity.gt(BigInt.fromI32(100))) {
    account.userType = "POWER_USER"
  } else if (account.bridgeActivityCount.gt(BigInt.fromI32(5))) {
    account.userType = "BRIDGE_USER"
  } else if (account.defiIntegrationCount.gt(BigInt.fromI32(10))) {
    account.userType = "DEFI_USER"
  }
  
  // Update composability score based on ecosystem diversity
  let ecosystemCount = 0
  if (account.protocolOperationCount.gt(BigInt.fromI32(0))) ecosystemCount++
  if (account.dexActivityCount.gt(BigInt.fromI32(0))) ecosystemCount++
  if (account.bridgeActivityCount.gt(BigInt.fromI32(0))) ecosystemCount++
  if (account.p2pTransferCount.gt(BigInt.fromI32(0))) ecosystemCount++
  if (account.defiIntegrationCount.gt(BigInt.fromI32(0))) ecosystemCount++
  
  account.composabilityScore = BigDecimal.fromString(ecosystemCount.toString()).times(BigDecimal.fromString("20"))
  
  // Update influence score based on volume and activity
  let volumeScore = account.totalVolumeIn.plus(account.totalVolumeOut).toBigDecimal().div(BigDecimal.fromString("1000000000000000000")) // Normalize to USDFC
  let activityScore = totalActivity.toBigDecimal()
  account.influenceScore = volumeScore.plus(activityScore).div(BigDecimal.fromString("100")) // Normalize to 0-100
  
  if (account.influenceScore.gt(BigDecimal.fromString("100"))) {
    account.influenceScore = BigDecimal.fromString("100")
  }
}

/**
 * Update ecosystem statistics
 */
export function updateEcosystemStats(category: string, ecosystem: string, value: BigInt, timestamp: BigInt): void {
  // Update global ecosystem stats
  let stats = EcosystemStats.load("global")
  if (stats == null) {
    stats = new EcosystemStats("global")
    initializeEcosystemStats(stats)
  }
  
  // Update ecosystem volume by type
  if (ecosystem == ECOSYSTEM_TYPE_DEX_ECOSYSTEM) {
    stats.dexTradingVolume = stats.dexTradingVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_BRIDGE_ECOSYSTEM) {
    stats.bridgeVolume = stats.bridgeVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_P2P_ECOSYSTEM) {
    stats.p2pVolume = stats.p2pVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_DEFI_ECOSYSTEM) {
    stats.defiIntegrationVolume = stats.defiIntegrationVolume.plus(value)
  }
  
  stats.totalEcosystemVolume = stats.dexTradingVolume
    .plus(stats.bridgeVolume)
    .plus(stats.p2pVolume)
    .plus(stats.defiIntegrationVolume)
  
  stats.lastUpdateBlock = getCurrentBlock()
  stats.lastUpdateTimestamp = timestamp
  
  stats.save()
  
  // Update daily stats
  updateDailyEcosystemStats(category, ecosystem, value, timestamp)
}

/**
 * Initialize ecosystem stats with default values
 */
function initializeEcosystemStats(stats: EcosystemStats): void {
  // V5 preserved metrics
  stats.totalSupply = BigInt.fromI32(0)
  stats.totalDebt = BigInt.fromI32(0)
  stats.activeTroveCount = BigInt.fromI32(0)
  stats.holderCount = BigInt.fromI32(0)
  
  // Enhanced protocol metrics
  stats.averageCollateralRatio = BigDecimal.fromString("0")
  stats.medianCollateralRatio = BigDecimal.fromString("0")
  stats.protocolHealth = BigDecimal.fromString("100")
  stats.liquidationRisk = BigDecimal.fromString("0")
  
  // Ecosystem metrics
  stats.ecosystemUserCount = BigInt.fromI32(0)
  stats.dexTradingVolume = BigInt.fromI32(0)
  stats.bridgeVolume = BigInt.fromI32(0)
  stats.p2pVolume = BigInt.fromI32(0)
  stats.defiIntegrationVolume = BigInt.fromI32(0)
  stats.totalEcosystemVolume = BigInt.fromI32(0)
  
  // Activity metrics
  stats.dailyActiveUsers = BigInt.fromI32(0)
  stats.weeklyActiveUsers = BigInt.fromI32(0)
  stats.monthlyActiveUsers = BigInt.fromI32(0)
  stats.userRetentionRate = BigDecimal.fromString("0")
  stats.userAcquisitionRate = BigDecimal.fromString("0")
  
  // Composability metrics
  stats.protocolIntegrations = BigInt.fromI32(0)
  stats.crossProtocolOperations = BigInt.fromI32(0)
  stats.composabilityScore = BigDecimal.fromString("0")
  stats.innovationIndex = BigDecimal.fromString("0")
  
  // Predictive metrics
  stats.predictedGrowth = BigDecimal.fromString("0")
  stats.ecosystemHealthScore = BigDecimal.fromString("100")
}

/**
 * Update daily ecosystem statistics
 */
function updateDailyEcosystemStats(category: string, ecosystem: string, value: BigInt, timestamp: BigInt): void {
  let dayId = getDayId(timestamp)
  let stats = DailyEcosystemStats.load(dayId)
  
  if (stats == null) {
    stats = new DailyEcosystemStats(dayId)
    stats.date = getDayString(timestamp)
    stats.timestamp = getDayStartTimestamp(timestamp)
    
    // Initialize all counters
    initializeDailyStats(stats)
  }
  
  // Update by ecosystem type
  if (ecosystem == ECOSYSTEM_TYPE_DEX_ECOSYSTEM) {
    stats.dexTradeCount = stats.dexTradeCount.plus(BigInt.fromI32(1))
    stats.dexTradeVolume = stats.dexTradeVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_BRIDGE_ECOSYSTEM) {
    stats.bridgeOperationCount = stats.bridgeOperationCount.plus(BigInt.fromI32(1))
    stats.bridgeVolume = stats.bridgeVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_P2P_ECOSYSTEM) {
    stats.p2pTransferCount = stats.p2pTransferCount.plus(BigInt.fromI32(1))
    stats.p2pTransferVolume = stats.p2pTransferVolume.plus(value)
  } else if (ecosystem == ECOSYSTEM_TYPE_PROTOCOL_NATIVE) {
    stats.protocolTransferCount = stats.protocolTransferCount.plus(BigInt.fromI32(1))
    stats.protocolTransferVolume = stats.protocolTransferVolume.plus(value)
  }
  
  // Update totals
  stats.totalEcosystemTransactionCount = stats.protocolTransferCount
    .plus(stats.dexTradeCount)
    .plus(stats.bridgeOperationCount)
    .plus(stats.p2pTransferCount)
  
  stats.totalEcosystemVolume = stats.protocolTransferVolume
    .plus(stats.dexTradeVolume)
    .plus(stats.bridgeVolume)
    .plus(stats.p2pTransferVolume)
  
  // Calculate average transaction size
  if (stats.totalEcosystemTransactionCount.gt(BigInt.fromI32(0))) {
    stats.averageTransactionSize = stats.totalEcosystemVolume.toBigDecimal()
      .div(stats.totalEcosystemTransactionCount.toBigDecimal())
  }
  
  stats.save()
}

/**
 * Initialize daily stats with zero values
 */
function initializeDailyStats(stats: DailyEcosystemStats): void {
  // V5 preserved metrics
  stats.protocolTransferCount = BigInt.fromI32(0)
  stats.protocolTransferVolume = BigInt.fromI32(0)
  stats.protocolActiveUsers = BigInt.fromI32(0)
  
  // Ecosystem metrics
  stats.dexTradeCount = BigInt.fromI32(0)
  stats.dexTradeVolume = BigInt.fromI32(0)
  stats.dexActiveUsers = BigInt.fromI32(0)
  stats.bridgeOperationCount = BigInt.fromI32(0)
  stats.bridgeVolume = BigInt.fromI32(0)
  stats.bridgeActiveUsers = BigInt.fromI32(0)
  stats.p2pTransferCount = BigInt.fromI32(0)
  stats.p2pTransferVolume = BigInt.fromI32(0)
  stats.p2pActiveUsers = BigInt.fromI32(0)
  
  // Combined metrics
  stats.totalEcosystemTransactionCount = BigInt.fromI32(0)
  stats.totalEcosystemVolume = BigInt.fromI32(0)
  stats.totalActiveUsers = BigInt.fromI32(0)
  stats.newUsers = BigInt.fromI32(0)
  stats.returningUsers = BigInt.fromI32(0)
  
  // Advanced metrics
  stats.averageTransactionSize = BigDecimal.fromString("0")
  stats.medianTransactionSize = BigInt.fromI32(0)
  stats.uniqueTransactionTypes = BigInt.fromI32(0)
  stats.composabilityScore = BigDecimal.fromString("0")
  
  // Growth metrics
  stats.userGrowthRate = BigDecimal.fromString("0")
  stats.volumeGrowthRate = BigDecimal.fromString("0")
  stats.activityGrowthRate = BigDecimal.fromString("0")
}

// Utility functions
function getCurrentBlock(): BigInt {
  // This would be implemented to get current block from context
  return BigInt.fromI32(0) // Placeholder
}

function getCurrentTimestamp(): BigInt {
  // This would be implemented to get current timestamp from context
  return BigInt.fromI32(0) // Placeholder
}

function getDayId(timestamp: BigInt): string {
  let day = timestamp.toI32() / 86400
  return day.toString()
}

function getDayString(timestamp: BigInt): string {
  // Convert timestamp to YYYY-MM-DD format
  let day = timestamp.toI32() / 86400
  return day.toString() // Simplified - would need proper date formatting
}

function getDayStartTimestamp(timestamp: BigInt): BigInt {
  let day = timestamp.toI32() / 86400
  return BigInt.fromI32(day * 86400)
}
