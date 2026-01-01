/**
 * USDFC v0 - Token Handler (Final MVP with Composable Configuration)
 * Configurable and granular data filtering capabilities
 */

import { BigInt, BigDecimal, log, Bytes } from "@graphprotocol/graph-ts"
import {
  Transfer as TransferEvent,
  Approval as ApprovalEvent,
  Mint as MintEvent,
  Burn as BurnEvent
} from "../../generated/USDFC_V0_Enhanced/USDFC"
import {
  Transaction,
  Account,
  Transfer,
  ProtocolStats
} from "../../generated/schema"

/**
 * Create or get universal Transaction entity
 */
function createTransaction(event: TransferEvent): Transaction {
  let txId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let tx = Transaction.load(txId)
  if (tx == null) {
    tx = new Transaction(txId)
    tx.hash = event.transaction.hash
    tx.blockNumber = event.block.number
    tx.blockTimestamp = event.block.timestamp
    tx.logIndex = BigInt.fromI32(event.logIndex.toI32())
    tx.from = ensureAccount(event.params.from).id
    tx.to = ensureAccount(event.params.to).id
    tx.value = event.params.value
    tx.source = "CONTRACT_EVENT"
    tx.category = "TRANSFER"
    tx.ecosystem = "PROTOCOL_NATIVE"
    tx.composabilityScore = BigDecimal.fromString("0")
    tx.innovationScore = BigDecimal.fromString("0")
    tx.riskScore = BigDecimal.fromString("0")
    tx.gasUsed = null  // Not available in event context
    tx.gasPrice = null  // Not available in event context
    tx.success = true
    tx.save()
  }
  return tx
}

/**
 * Ensure account exists or create new one
 */
function ensureAccount(address: Bytes): Account {
  let account = Account.load(address)
  if (account == null) {
    account = new Account(address)
    // Balance & basic metrics
    account.usdfcBalance = BigInt.fromI32(0)
    account.totalTransactionCount = BigInt.fromI32(0)
    account.totalVolumeIn = BigInt.fromI32(0)
    account.totalVolumeOut = BigInt.fromI32(0)
    account.netVolume = BigInt.fromI32(0)

    // Time tracking
    account.firstSeenBlock = BigInt.fromI32(0)
    account.firstSeenTimestamp = BigInt.fromI32(0)
    account.lastActiveBlock = BigInt.fromI32(0)
    account.lastActiveTimestamp = BigInt.fromI32(0)
    account.daysSinceFirstSeen = BigInt.fromI32(0)
    account.daysSinceLastActive = BigInt.fromI32(0)

    // Activity breakdown by source
    account.contractTransactionCount = BigInt.fromI32(0)
    account.tokenTransferCount = BigInt.fromI32(0)
    account.internalTransactionCount = BigInt.fromI32(0)
    account.systemLogCount = BigInt.fromI32(0)

    // Activity breakdown by category
    account.protocolOperationCount = BigInt.fromI32(0)
    account.dexActivityCount = BigInt.fromI32(0)
    account.bridgeActivityCount = BigInt.fromI32(0)
    account.p2pTransferCount = BigInt.fromI32(0)
    account.defiIntegrationCount = BigInt.fromI32(0)

    // Volume breakdown by ecosystem
    account.protocolVolume = BigInt.fromI32(0)
    account.dexVolume = BigInt.fromI32(0)
    account.bridgeVolume = BigInt.fromI32(0)
    account.p2pVolume = BigInt.fromI32(0)
    account.defiIntegrationVolume = BigInt.fromI32(0)

    // User intelligence & analytics
    account.userType = "RETAIL_USER"  // Default to retail user
    account.activityPatterns = []
    account.riskScore = BigDecimal.fromString("0")
    account.composabilityScore = BigDecimal.fromString("0")
    account.influenceScore = BigDecimal.fromString("0")
    account.retentionScore = BigDecimal.fromString("0")

    account.save()
  }
  return account
}

// ==========================================
// COMPOSABLE CONFIGURATION CONSTANTS
// ==========================================

/**
 * Configurable Transfer Amount Tiers for Granular Analysis
 */
class TransferAmountTiers {
  static DUST_THRESHOLD: BigInt = BigInt.fromString("100000000000000000") // 0.1 USDFC
  static MICRO_THRESHOLD: BigInt = BigInt.fromString("1000000000000000000") // 1 USDFC  
  static SMALL_THRESHOLD: BigInt = BigInt.fromString("100000000000000000000") // 100 USDFC
  static MEDIUM_THRESHOLD: BigInt = BigInt.fromString("1000000000000000000000") // 1000 USDFC (original hardcoded value)
  static LARGE_THRESHOLD: BigInt = BigInt.fromString("10000000000000000000000") // 10000 USDFC
  static WHALE_THRESHOLD: BigInt = BigInt.fromString("100000000000000000000000") // 100000 USDFC
  static INSTITUTIONAL_THRESHOLD: BigInt = BigInt.fromString("1000000000000000000000000") // 1M USDFC
}

/**
 * Configurable Risk Weights for Composable Scoring
 */
class RiskWeights {
  static DUST_RISK: BigDecimal = BigDecimal.fromString("0")      // 0 points (ignore dust)
  static MICRO_RISK: BigDecimal = BigDecimal.fromString("2")     // 2 points
  static SMALL_RISK: BigDecimal = BigDecimal.fromString("5")     // 5 points
  static MEDIUM_RISK: BigDecimal = BigDecimal.fromString("15")   // 15 points (original logic ~20)
  static LARGE_RISK: BigDecimal = BigDecimal.fromString("25")    // 25 points
  static WHALE_RISK: BigDecimal = BigDecimal.fromString("40")    // 40 points  
  static INSTITUTIONAL_RISK: BigDecimal = BigDecimal.fromString("60") // 60 points
  
  static NEW_ACCOUNT_RISK: BigDecimal = BigDecimal.fromString("10")   // 10 points (original)
  static OFF_HOURS_MULTIPLIER: BigDecimal = BigDecimal.fromString("1.2") // 20% increase
}

/**
 * Enhanced Transfer handler with composable configuration
 */
export function handleTransfer(event: TransferEvent): void {
  log.info("Processing USDFC Transfer: {} from {} to {} value {}", [
    event.transaction.hash.toHexString(),
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.params.value.toString()
  ])
  
  // Create universal Transaction entity
  let transaction = createTransaction(event)

  // Create Transfer entity with enhanced configurability
  let transferId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let transfer = new Transfer(transferId)

  // Core V5 compatibility fields
  transfer.timestamp = event.block.timestamp
  transfer.from = ensureAccount(event.params.from).id
  transfer.to = ensureAccount(event.params.to).id
  transfer.value = event.params.value
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash

  // Universal transaction link
  transfer.universalTransaction = transaction.id

  // Enhanced composable classification
  transfer.transferType = getConfigurableTransferType(event.params.from, event.params.to, event.params.value)
  transfer.ecosystemType = "PROTOCOL_NATIVE"
  transfer.composabilityLinks = [] // Empty array for now

  // Composable risk assessment with configurable thresholds
  transfer.riskScore = getComposableRiskScore(
    event.params.from,
    event.params.to,
    event.params.value,
    event.block.timestamp
  )

  // Enhanced metadata for granular filtering
  transfer.rawTransferData = event.transaction.input
  transfer.relatedOperation = null // Skip for MVP - will store tier info in logs instead

  transfer.save()
  
  // Update account balances
  updateAccountBalances(event.params.from, event.params.to, event.params.value)
  
  log.info("USDFC Transfer processed - Tier: {} Risk: {}", [
    getTransferAmountTier(event.params.value),
    transfer.riskScore.toString()
  ])
}

/**
 * Enhanced Mint handler - Simplified  
 */
export function handleMint(event: MintEvent): void {
  log.info("Processing USDFC Mint: {} to {} amount {}", [
    event.transaction.hash.toHexString(),
    event.params.account.toHexString(), 
    event.params.amount.toString()
  ])
  
  // Update account balance
  let account = ensureAccount(event.params.account)
  account.usdfcBalance = account.usdfcBalance.plus(event.params.amount)
  account.save()
  
  log.info("USDFC Mint processed: {} USDFC (Tier: {}) to {}", [
    event.params.amount.toString(),
    getTransferAmountTier(event.params.amount),
    event.params.account.toHexString()
  ])
}

/**
 * Enhanced Burn handler - Simplified
 */
export function handleBurn(event: BurnEvent): void {
  log.info("Processing USDFC Burn: {} from {} amount {}", [
    event.transaction.hash.toHexString(),
    event.params.account.toHexString(),
    event.params.amount.toString()
  ])
  
  // Update account balance
  let account = ensureAccount(event.params.account)
  account.usdfcBalance = account.usdfcBalance.minus(event.params.amount)
  account.save()
  
  log.info("USDFC Burn processed: {} USDFC (Tier: {}) from {}", [
    event.params.amount.toString(),
    getTransferAmountTier(event.params.amount),
    event.params.account.toHexString()
  ])
}

/**
 * Enhanced Approval handler
 */
export function handleApproval(event: ApprovalEvent): void {
  log.info("Processing USDFC Approval: {} owner {} spender {} value {}", [
    event.transaction.hash.toHexString(),
    event.params.owner.toHexString(),
    event.params.spender.toHexString(),
    event.params.value.toString()
  ])
  
  log.info("USDFC Approval processed: {} USDFC (Tier: {}) approved", [
    event.params.value.toString(),
    getTransferAmountTier(event.params.value)
  ])
}

// ==========================================
// COMPOSABLE UTILITY FUNCTIONS
// ==========================================

/**
 * Get configurable transfer amount tier for granular filtering
 */
function getTransferAmountTier(amount: BigInt): string {
  if (amount.lt(TransferAmountTiers.DUST_THRESHOLD)) {
    return "DUST"
  } else if (amount.lt(TransferAmountTiers.MICRO_THRESHOLD)) {
    return "MICRO" 
  } else if (amount.lt(TransferAmountTiers.SMALL_THRESHOLD)) {
    return "SMALL"
  } else if (amount.lt(TransferAmountTiers.MEDIUM_THRESHOLD)) {
    return "MEDIUM"
  } else if (amount.lt(TransferAmountTiers.LARGE_THRESHOLD)) {
    return "LARGE"
  } else if (amount.lt(TransferAmountTiers.WHALE_THRESHOLD)) {
    return "WHALE"
  } else {
    return "INSTITUTIONAL"
  }
}

/**
 * Get configurable transfer type with PROPER DIRECTIONAL LOGIC
 */
function getConfigurableTransferType(from: Bytes, to: Bytes, value: BigInt): string {
  let zeroAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000") as Bytes

  // Mint/burn detection (directional already correct)
  if (from.equals(zeroAddress)) return "MINT_TO_BORROWER"
  if (to.equals(zeroAddress)) return "BURN_FROM_REPAYMENT"

  // Configurable protocol contract addresses (easily updatable)
  let protocolAddresses = getProtocolAddresses()

  if (isProtocolAddress(from, protocolAddresses) || isProtocolAddress(to, protocolAddresses)) {
    return getProtocolOperationType(from, to, protocolAddresses)
  }

  // DEX detection with DIRECTIONAL logic
  if (isKnownDexAddress(from)) {
    // USDFC coming FROM DEX to user = user buying/receiving = SWAP_IN
    return "DEX_SWAP_IN"
  }
  if (isKnownDexAddress(to)) {
    // USDFC going TO DEX from user = user selling/sending = SWAP_OUT
    return "DEX_SWAP_OUT"
  }

  // Bridge detection with DIRECTIONAL logic
  if (isKnownBridgeAddress(from)) {
    // USDFC coming FROM bridge = withdrawal from other chain = WITHDRAWAL
    return "BRIDGE_WITHDRAWAL"
  }
  if (isKnownBridgeAddress(to)) {
    // USDFC going TO bridge = deposit to other chain = DEPOSIT
    return "BRIDGE_DEPOSIT"
  }

  // Default P2P transfer (FIXED: was NORMAL_TRANSFER, now NORMAL)
  return "NORMAL"
}

/**
 * Composable risk score calculation with configurable weights
 */
function getComposableRiskScore(from: Bytes, to: Bytes, value: BigInt, timestamp: BigInt): BigDecimal {
  let riskScore = BigDecimal.fromString("0")
  
  // Amount-based risk using configurable tiers (replaces hardcoded 1000 USDFC)
  riskScore = riskScore.plus(getAmountRiskWeight(value))
  
  // Account behavior risk (configurable)
  let fromAccount = Account.load(from)
  let toAccount = Account.load(to)
  
  if (fromAccount == null || fromAccount.totalTransactionCount.lt(BigInt.fromI32(5))) {
    riskScore = riskScore.plus(RiskWeights.NEW_ACCOUNT_RISK)
  }
  
  if (toAccount == null || toAccount.totalTransactionCount.lt(BigInt.fromI32(5))) {
    riskScore = riskScore.plus(RiskWeights.NEW_ACCOUNT_RISK)
  }
  
  // Time-based risk multiplier (configurable off-hours detection)
  if (isOffHoursTransaction(timestamp)) {
    riskScore = riskScore.times(RiskWeights.OFF_HOURS_MULTIPLIER)
  }
  
  return riskScore
}

/**
 * Get amount-based risk weight using configurable tiers
 */
function getAmountRiskWeight(amount: BigInt): BigDecimal {
  let tier = getTransferAmountTier(amount)
  
  if (tier == "DUST") return RiskWeights.DUST_RISK
  if (tier == "MICRO") return RiskWeights.MICRO_RISK  
  if (tier == "SMALL") return RiskWeights.SMALL_RISK
  if (tier == "MEDIUM") return RiskWeights.MEDIUM_RISK
  if (tier == "LARGE") return RiskWeights.LARGE_RISK
  if (tier == "WHALE") return RiskWeights.WHALE_RISK
  return RiskWeights.INSTITUTIONAL_RISK // INSTITUTIONAL
}

/**
 * Configurable protocol addresses (easily updatable)
 */
function getProtocolAddresses(): Map<string, string> {
  let addresses = new Map<string, string>()
  addresses.set("0x5aB87c2398454125Dd424425e39c8909bBE16022".toLowerCase(), "TROVE_MANAGER")
  addresses.set("0x791Ad78bBc58324089D3E0A8689E7D045B9592b5".toLowerCase(), "STABILITY_POOL") 
  addresses.set("0xc8707b3d426E7D7A0706C48dcd1A4b83bc220dB3".toLowerCase(), "STAKING")
  return addresses
}

/**
 * Check if address is a protocol address
 */
function isProtocolAddress(address: Bytes, protocolAddresses: Map<string, string>): boolean {
  return protocolAddresses.has(address.toHexString().toLowerCase())
}

/**
 * Get protocol operation type
 */
function getProtocolOperationType(from: Bytes, to: Bytes, protocolAddresses: Map<string, string>): string {
  // FIXED: Use Map.has() to check before Map.get() to prevent "Key does not exist" error
  let fromKey = from.toHexString().toLowerCase()
  let toKey = to.toHexString().toLowerCase()

  let fromType = protocolAddresses.has(fromKey) ? protocolAddresses.get(fromKey) : null
  let toType = protocolAddresses.has(toKey) ? protocolAddresses.get(toKey) : null

  // Liquidation (always reward to liquidator)
  if (fromType == "TROVE_MANAGER" || toType == "TROVE_MANAGER") return "LIQUIDATION_REWARD"

  // Stability Pool with DIRECTIONAL logic
  if (fromType == "STABILITY_POOL") {
    // USDFC coming FROM stability pool = withdrawal
    return "STABILITY_WITHDRAWAL"
  }
  if (toType == "STABILITY_POOL") {
    // USDFC going TO stability pool = deposit
    return "STABILITY_DEPOSIT"
  }

  // Staking (direction doesn't matter for staking operations)
  if (fromType == "STAKING" || toType == "STAKING") return "STAKING_OPERATION"

  // Redemption payment (from protocol to redeemer)
  if (fromType || toType) {
    // Any other protocol interaction defaults to NORMAL
    // (Could be refined further based on specific protocol contracts)
    return "NORMAL"
  }

  return "NORMAL"
}

/**
 * Configurable DEX address detection (expandable)
 */
function isKnownDexAddress(address: Bytes): boolean {
  // Configurable list - can be expanded via configuration
  let knownDexes = [
    // Add actual DEX addresses here when discovered
    "0x0000000000000000000000000000000000000001" // Placeholder
  ]
  
  let addressStr = address.toHexString().toLowerCase()
  for (let i = 0; i < knownDexes.length; i++) {
    if (addressStr == knownDexes[i].toLowerCase()) return true
  }
  return false
}

/**
 * Configurable bridge address detection (expandable)
 */
function isKnownBridgeAddress(address: Bytes): boolean {
  // Configurable list - can be expanded via configuration  
  let knownBridges = [
    // Add actual bridge addresses here when discovered
    "0x0000000000000000000000000000000000000002" // Placeholder
  ]
  
  let addressStr = address.toHexString().toLowerCase()
  for (let i = 0; i < knownBridges.length; i++) {
    if (addressStr == knownBridges[i].toLowerCase()) return true
  }
  return false
}

/**
 * Configurable off-hours detection (22:00 - 06:00 UTC)
 */
function isOffHoursTransaction(timestamp: BigInt): boolean {
  let hour = (timestamp.toI32() % 86400) / 3600 // Get hour of day
  return hour >= 22 || hour <= 6
}

/**
 * Update account balances with enhanced tracking
 */
function updateAccountBalances(from: Bytes, to: Bytes, value: BigInt): void {
  let zeroAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000") as Bytes
  
  // Update sender balance (if not mint)
  if (!from.equals(zeroAddress)) {
    let fromAccount = ensureAccount(from)
    fromAccount.usdfcBalance = fromAccount.usdfcBalance.minus(value)
    fromAccount.save()
  }
  
  // Update receiver balance (if not burn)
  if (!to.equals(zeroAddress)) {
    let toAccount = ensureAccount(to)
    toAccount.usdfcBalance = toAccount.usdfcBalance.plus(value)
    toAccount.save()
  }
}
