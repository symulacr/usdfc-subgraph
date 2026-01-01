/**
 * USDFC v0 - Helper Functions
 * Common utility functions used across all handlers
 */

import { BigInt, BigDecimal, Bytes, log } from "@graphprotocol/graph-ts"
import {
  ZERO_BI,
  ONE_BI,
  ZERO_BD,
  ONE_BD,
  DECIMAL_PRECISION,
  DECIMAL_PRECISION_BD,
  SECONDS_PER_DAY,
  MAX_RISK_SCORE,
  MIN_RISK_SCORE,
  ZERO_ADDRESS_BYTES
} from "./constants"

// ===========================================
// ADDRESS & BYTES UTILITIES
// ===========================================

/**
 * Check if address is zero address
 */
export function isZeroAddress(address: Bytes): boolean {
  return address.equals(ZERO_ADDRESS_BYTES)
}

/**
 * Convert address to lowercase hex string
 */
export function addressToString(address: Bytes): string {
  return address.toHexString().toLowerCase()
}

/**
 * Create unique ID from multiple components
 */
export function createId(components: string[]): string {
  return components.join("-")
}

/**
 * Create unique ID from hash and log index
 */
export function createTransactionId(hash: Bytes, logIndex: BigInt | null = null): Bytes {
  if (logIndex !== null) {
    return hash.concatI32(logIndex.toI32())
  }
  return hash
}

// ===========================================
// MATHEMATICAL UTILITIES  
// ===========================================

/**
 * Convert wei to USDFC (18 decimals)
 */
export function weiToUSDFC(wei: BigInt): BigDecimal {
  return wei.toBigDecimal().div(DECIMAL_PRECISION_BD)
}

/**
 * Convert USDFC to wei (18 decimals)
 */
export function usdfcToWei(usdfc: BigDecimal): BigInt {
  return BigInt.fromString(usdfc.times(DECIMAL_PRECISION_BD).toString().split('.')[0])
}

/**
 * Calculate percentage (returns value between 0-100)
 */
export function calculatePercentage(numerator: BigInt, denominator: BigInt): BigDecimal {
  if (denominator.equals(ZERO_BI)) {
    return ZERO_BD
  }
  return numerator.toBigDecimal()
    .div(denominator.toBigDecimal())
    .times(BigDecimal.fromString("100"))
}

/**
 * Calculate collateral ratio (collateral / debt * 100)
 */
export function calculateCollateralRatio(collateral: BigInt, debt: BigInt): BigDecimal {
  if (debt.equals(ZERO_BI)) {
    return BigDecimal.fromString("99999") // Infinite ratio (no debt)
  }
  return collateral.toBigDecimal()
    .div(debt.toBigDecimal())
    .times(BigDecimal.fromString("100"))
}

/**
 * Safe division - returns 0 if denominator is 0
 */
export function safeDivision(numerator: BigInt, denominator: BigInt): BigDecimal {
  if (denominator.equals(ZERO_BI)) {
    return ZERO_BD
  }
  return numerator.toBigDecimal().div(denominator.toBigDecimal())
}

/**
 * Safe division for BigDecimal
 */
export function safeDivisionBD(numerator: BigDecimal, denominator: BigDecimal): BigDecimal {
  if (denominator.equals(ZERO_BD)) {
    return ZERO_BD
  }
  return numerator.div(denominator)
}

/**
 * Clamp value between min and max
 */
export function clamp(value: BigDecimal, min: BigDecimal, max: BigDecimal): BigDecimal {
  if (value.lt(min)) return min
  if (value.gt(max)) return max
  return value
}

/**
 * Calculate compound score (weighted average)
 */
export function calculateWeightedScore(values: BigDecimal[], weights: BigDecimal[]): BigDecimal {
  if (values.length != weights.length || values.length == 0) {
    return ZERO_BD
  }
  
  let totalWeightedValue = ZERO_BD
  let totalWeight = ZERO_BD
  
  for (let i = 0; i < values.length; i++) {
    totalWeightedValue = totalWeightedValue.plus(values[i].times(weights[i]))
    totalWeight = totalWeight.plus(weights[i])
  }
  
  return safeDivisionBD(totalWeightedValue, totalWeight)
}

// ===========================================
// TIME UTILITIES
// ===========================================

/**
 * Get day ID from timestamp (for daily aggregations)
 */
export function getDayId(timestamp: BigInt): string {
  let day = timestamp.div(SECONDS_PER_DAY)
  return day.toString()
}

/**
 * Get day string in YYYY-MM-DD format
 */
export function getDayString(timestamp: BigInt): string {
  let day = timestamp.div(SECONDS_PER_DAY).toI32()
  // Simple day calculation - could be enhanced with proper date formatting
  let epochDays = day
  let year = 1970 + Math.floor(epochDays / 365.25) as i32
  let dayOfYear = epochDays % 365.25
  let month = Math.floor(dayOfYear / 30.44) as i32 + 1
  let dayOfMonth = Math.floor(dayOfYear % 30.44) as i32 + 1
  
  return year.toString() + "-" + 
         (month < 10 ? "0" : "") + month.toString() + "-" +
         (dayOfMonth < 10 ? "0" : "") + dayOfMonth.toString()
}

/**
 * Get start of day timestamp
 */
export function getDayStartTimestamp(timestamp: BigInt): BigInt {
  return timestamp.div(SECONDS_PER_DAY).times(SECONDS_PER_DAY)
}

/**
 * Calculate days between timestamps
 */
export function daysBetween(start: BigInt, end: BigInt): BigInt {
  if (end.lt(start)) return ZERO_BI
  return end.minus(start).div(SECONDS_PER_DAY)
}

// ===========================================
// RISK & SCORING UTILITIES
// ===========================================

/**
 * Normalize risk score to 0-100 range
 */
export function normalizeRiskScore(score: BigDecimal): BigDecimal {
  return clamp(score, MIN_RISK_SCORE, MAX_RISK_SCORE)
}

/**
 * Calculate volume-based risk score
 */
export function calculateVolumeRisk(volume: BigInt): BigDecimal {
  let largeThreshold = BigInt.fromString("1000000000000000000000") // 1000 USDFC
  let whaleThreshold = BigInt.fromString("100000000000000000000000") // 100k USDFC
  
  if (volume.gt(whaleThreshold)) {
    return BigDecimal.fromString("80") // High risk for whale transactions
  } else if (volume.gt(largeThreshold)) {
    return BigDecimal.fromString("40") // Medium risk for large transactions
  }
  return BigDecimal.fromString("10") // Low risk for normal transactions
}

/**
 * Calculate activity-based risk score  
 */
export function calculateActivityRisk(activityCount: BigInt, accountAge: BigInt): BigDecimal {
  if (accountAge.equals(ZERO_BI)) return BigDecimal.fromString("50") // New account default
  
  let activityRate = safeDivision(activityCount, accountAge.div(SECONDS_PER_DAY))
  
  if (activityRate.gt(BigDecimal.fromString("10"))) {
    return BigDecimal.fromString("60") // High frequency might be risky
  } else if (activityRate.gt(BigDecimal.fromString("1"))) {
    return BigDecimal.fromString("30") // Regular activity is lower risk
  }
  return BigDecimal.fromString("20") // Low activity is lowest risk
}

// ===========================================
// USER CLASSIFICATION UTILITIES
// ===========================================

/**
 * Classify user type based on activity patterns
 */
export function classifyUserType(
  totalActivity: BigInt,
  protocolActivity: BigInt, 
  dexActivity: BigInt,
  bridgeActivity: BigInt,
  defiActivity: BigInt,
  totalVolume: BigInt
): string {
  if (totalActivity.equals(ZERO_BI)) return "RETAIL_USER"
  
  // Calculate activity ratios
  let dexRatio = safeDivision(dexActivity, totalActivity)
  let protocolRatio = safeDivision(protocolActivity, totalActivity)
  let bridgeRatio = safeDivision(bridgeActivity, totalActivity)
  let defiRatio = safeDivision(defiActivity, totalActivity)
  
  // High volume institutional check
  let institutionalThreshold = BigInt.fromString("1000000000000000000000000") // 1M USDFC
  if (totalVolume.gt(institutionalThreshold)) {
    return "INSTITUTIONAL_USER"
  }
  
  // Activity-based classification
  if (dexRatio.gt(BigDecimal.fromString("0.6"))) {
    return "DEX_TRADER"
  } else if (bridgeRatio.gt(BigDecimal.fromString("0.4"))) {
    return "BRIDGE_USER"
  } else if (defiRatio.gt(BigDecimal.fromString("0.5"))) {
    return "DEFI_USER"
  } else if (protocolRatio.gt(BigDecimal.fromString("0.8"))) {
    return "PROTOCOL_NATIVE"
  } else if (totalActivity.gt(BigInt.fromI32(100))) {
    return "POWER_USER"
  }
  
  return "RETAIL_USER" // Default classification
}

/**
 * Calculate composability score based on ecosystem diversity
 */
export function calculateComposabilityScore(
  protocolActivity: BigInt,
  dexActivity: BigInt, 
  bridgeActivity: BigInt,
  p2pActivity: BigInt,
  defiActivity: BigInt
): BigDecimal {
  let ecosystemCount = 0
  
  if (protocolActivity.gt(ZERO_BI)) ecosystemCount++
  if (dexActivity.gt(ZERO_BI)) ecosystemCount++
  if (bridgeActivity.gt(ZERO_BI)) ecosystemCount++  
  if (p2pActivity.gt(ZERO_BI)) ecosystemCount++
  if (defiActivity.gt(ZERO_BI)) ecosystemCount++
  
  return BigDecimal.fromString(ecosystemCount.toString()).times(BigDecimal.fromString("20"))
}

/**
 * Calculate influence score based on volume and activity
 */
export function calculateInfluenceScore(totalVolume: BigInt, totalActivity: BigInt): BigDecimal {
  let volumeScore = weiToUSDFC(totalVolume).div(BigDecimal.fromString("1000")) // Normalize per 1000 USDFC
  let activityScore = totalActivity.toBigDecimal().div(BigDecimal.fromString("10")) // Normalize per 10 transactions
  
  let rawScore = volumeScore.plus(activityScore)
  return clamp(rawScore, ZERO_BD, BigDecimal.fromString("100"))
}

// ===========================================
// VALIDATION UTILITIES
// ===========================================

/**
 * Validate transfer parameters
 */
export function validateTransfer(from: Bytes, to: Bytes, value: BigInt): boolean {
  // Basic validation
  if (value.lt(ZERO_BI)) {
    log.warning("Invalid transfer: negative value {}", [value.toString()])
    return false
  }
  
  // Can't transfer to self (unless it's a protocol operation)
  if (from.equals(to) && !isZeroAddress(from)) {
    log.warning("Invalid transfer: self-transfer from {} to {}", [
      from.toHexString(), 
      to.toHexString()
    ])
    return false
  }
  
  return true
}

/**
 * Validate BigInt is not negative
 */
export function validateNonNegative(value: BigInt, fieldName: string): boolean {
  if (value.lt(ZERO_BI)) {
    log.warning("Invalid {}: negative value {}", [fieldName, value.toString()])
    return false
  }
  return true
}

/**
 * Validate percentage is between 0-100
 */
export function validatePercentage(value: BigDecimal, fieldName: string): boolean {
  if (value.lt(ZERO_BD) || value.gt(BigDecimal.fromString("100"))) {
    log.warning("Invalid {}: percentage out of range {}", [fieldName, value.toString()])
    return false
  }
  return true
}

// ===========================================
// LOGGING UTILITIES
// ===========================================

/**
 * Log transaction processing start
 */
export function logTransactionStart(
  category: string, 
  hash: Bytes, 
  from: Bytes, 
  to: Bytes, 
  value: BigInt
): void {
  log.info("Processing {} transaction: {} from {} to {} value {}", [
    category,
    hash.toHexString(),
    from.toHexString(),
    to.toHexString(),
    value.toString()
  ])
}

/**
 * Log transaction processing completion  
 */
export function logTransactionComplete(category: string, id: string): void {
  log.info("{} transaction processed successfully: {}", [category, id])
}

/**
 * Log entity creation
 */
export function logEntityCreated(entityType: string, id: string): void {
  log.info("Created new {}: {}", [entityType, id])
}

/**
 * Log entity update
 */
export function logEntityUpdated(entityType: string, id: string): void {
  log.info("Updated {}: {}", [entityType, id])
}

/**
 * Log error with context
 */
export function logError(operation: string, error: string, context: string[] = []): void {
  let contextStr = context.length > 0 ? " Context: " + context.join(", ") : ""
  log.error("Error in {}: {}{}", [operation, error, contextStr])
}

// ===========================================
// ECOSYSTEM CLASSIFICATION UTILITIES
// ===========================================

/**
 * Classify ecosystem type based on addresses and patterns
 */
export function classifyEcosystemType(from: Bytes, to: Bytes, value: BigInt): string {
  // Zero address operations (mint/burn)
  if (isZeroAddress(from) || isZeroAddress(to)) {
    return "PROTOCOL_NATIVE"
  }
  
  // Large institutional transfers
  if (value.gt(BigInt.fromString("1000000000000000000000000"))) { // 1M USDFC
    return "INSTITUTIONAL_ECOSYSTEM"
  }
  
  // Default classification - can be enhanced with known address detection
  return "P2P_ECOSYSTEM"
}

/**
 * Detect if transaction involves known DEX addresses
 */
export function isDEXTransaction(from: Bytes, to: Bytes): boolean {
  // This would be enhanced with actual DEX router addresses
  // For now, basic heuristic based on contract interaction patterns
  return false // Placeholder
}

/**
 * Detect if transaction involves known bridge addresses  
 */
export function isBridgeTransaction(from: Bytes, to: Bytes): boolean {
  // This would be enhanced with actual bridge contract addresses
  return false // Placeholder
}

/**
 * Format BigDecimal to string with specified decimal places
 */
export function formatBigDecimal(value: BigDecimal, decimals: i32 = 2): string {
  let multiplier = BigDecimal.fromString((10 ** decimals).toString())
  let scaled = value.times(multiplier)
  let rounded = BigInt.fromString(scaled.toString().split('.')[0])
  let result = rounded.toBigDecimal().div(multiplier)
  return result.toString()
}
