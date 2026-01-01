/**
 * USDFC v0 - Configurable Risk Assessment & Analytics
 * Composable thresholds and filters for granular data analysis
 */

import { BigInt, BigDecimal } from "@graphprotocol/graph-ts"

// ==========================================
// COMPOSABLE RISK THRESHOLDS
// ==========================================

/**
 * Transfer Amount Risk Tiers - Composable Configuration
 */
export class TransferAmountTiers {
  // Micro transactions (< 1 USDFC)
  static MICRO_THRESHOLD: BigInt = BigInt.fromString("1000000000000000000") // 1 USDFC
  
  // Small transactions (1-100 USDFC)
  static SMALL_THRESHOLD: BigInt = BigInt.fromString("100000000000000000000") // 100 USDFC
  
  // Medium transactions (100-1000 USDFC)  
  static MEDIUM_THRESHOLD: BigInt = BigInt.fromString("1000000000000000000000") // 1000 USDFC
  
  // Large transactions (1000-10000 USDFC)
  static LARGE_THRESHOLD: BigInt = BigInt.fromString("10000000000000000000000") // 10000 USDFC
  
  // Whale transactions (10000+ USDFC)
  static WHALE_THRESHOLD: BigInt = BigInt.fromString("100000000000000000000000") // 100000 USDFC
  
  // Institutional transactions (1M+ USDFC)
  static INSTITUTIONAL_THRESHOLD: BigInt = BigInt.fromString("1000000000000000000000000") // 1M USDFC
}

/**
 * Risk Score Weights - Configurable & Composable
 */
export class RiskWeights {
  // Amount-based risk weights
  static MICRO_RISK_WEIGHT: BigDecimal = BigDecimal.fromString("1")     // 1 point
  static SMALL_RISK_WEIGHT: BigDecimal = BigDecimal.fromString("5")     // 5 points
  static MEDIUM_RISK_WEIGHT: BigDecimal = BigDecimal.fromString("15")   // 15 points
  static LARGE_RISK_WEIGHT: BigDecimal = BigDecimal.fromString("25")    // 25 points
  static WHALE_RISK_WEIGHT: BigDecimal = BigDecimal.fromString("40")    // 40 points
  static INSTITUTIONAL_RISK_WEIGHT: BigDecimal = BigDecimal.fromString("60") // 60 points
  
  // Account behavior risk weights
  static NEW_ACCOUNT_RISK: BigDecimal = BigDecimal.fromString("10")     // 10 points
  static LOW_ACTIVITY_RISK: BigDecimal = BigDecimal.fromString("8")     // 8 points
  static HIGH_VELOCITY_RISK: BigDecimal = BigDecimal.fromString("15")   // 15 points
  static CROSS_PROTOCOL_RISK: BigDecimal = BigDecimal.fromString("5")   // 5 points
  
  // Time-based risk weights
  static OFF_HOURS_RISK: BigDecimal = BigDecimal.fromString("5")        // 5 points
  static WEEKEND_RISK: BigDecimal = BigDecimal.fromString("3")          // 3 points
  static HOLIDAY_RISK: BigDecimal = BigDecimal.fromString("7")          // 7 points
}

/**
 * Activity Thresholds - Configurable User Classification
 */
export class ActivityThresholds {
  // Transaction count thresholds
  static INACTIVE_THRESHOLD: BigInt = BigInt.fromI32(0)       // 0 transactions
  static NEW_USER_THRESHOLD: BigInt = BigInt.fromI32(5)       // < 5 transactions
  static CASUAL_USER_THRESHOLD: BigInt = BigInt.fromI32(25)   // 5-25 transactions  
  static ACTIVE_USER_THRESHOLD: BigInt = BigInt.fromI32(100)  // 25-100 transactions
  static POWER_USER_THRESHOLD: BigInt = BigInt.fromI32(500)   // 100-500 transactions
  static WHALE_USER_THRESHOLD: BigInt = BigInt.fromI32(1000)  // 500+ transactions
  
  // Volume thresholds
  static SMALL_VOLUME_THRESHOLD: BigInt = BigInt.fromString("1000000000000000000000")    // 1K USDFC
  static MEDIUM_VOLUME_THRESHOLD: BigInt = BigInt.fromString("10000000000000000000000")   // 10K USDFC  
  static LARGE_VOLUME_THRESHOLD: BigInt = BigInt.fromString("100000000000000000000000")   // 100K USDFC
  static WHALE_VOLUME_THRESHOLD: BigInt = BigInt.fromString("1000000000000000000000000")  // 1M USDFC
}

// ==========================================
// COMPOSABLE FILTER CONFIGURATIONS
// ==========================================

/**
 * Transfer Type Classifications - Granular & Composable
 */
export class TransferTypes {
  // Protocol native operations
  static MINT_TO_BORROWER: string = "MINT_TO_BORROWER"
  static BURN_FROM_REPAYMENT: string = "BURN_FROM_REPAYMENT"
  static LIQUIDATION_REWARD: string = "LIQUIDATION_REWARD"
  static STABILITY_OPERATION: string = "STABILITY_OPERATION"
  static STAKING_OPERATION: string = "STAKING_OPERATION"
  
  // Ecosystem operations
  static NORMAL_TRANSFER: string = "NORMAL"
  static DEX_TRADE: string = "DEX_TRADE"
  static BRIDGE_TRANSFER: string = "BRIDGE_TRANSFER"
  static P2P_TRANSFER: string = "P2P_TRANSFER"
  static DEFI_INTEGRATION: string = "DEFI_INTEGRATION"
  
  // Advanced classifications
  static ARBITRAGE: string = "ARBITRAGE"
  static FLASH_LOAN: string = "FLASH_LOAN"
  static MEV_OPERATION: string = "MEV_OPERATION"
  static BATCH_TRANSFER: string = "BATCH_TRANSFER"
}

/**
 * Ecosystem Type Classifications
 */
export class EcosystemTypes {
  static PROTOCOL_NATIVE: string = "PROTOCOL_NATIVE"
  static DEX_ECOSYSTEM: string = "DEX_ECOSYSTEM"  
  static BRIDGE_ECOSYSTEM: string = "BRIDGE_ECOSYSTEM"
  static DEFI_ECOSYSTEM: string = "DEFI_ECOSYSTEM"
  static P2P_ECOSYSTEM: string = "P2P_ECOSYSTEM"
  static UNKNOWN_ECOSYSTEM: string = "UNKNOWN_ECOSYSTEM"
}

/**
 * Time-based Analysis Periods
 */
export class TimePeriods {
  static HOUR_IN_SECONDS: i32 = 3600
  static DAY_IN_SECONDS: i32 = 86400
  static WEEK_IN_SECONDS: i32 = 604800
  static MONTH_IN_SECONDS: i32 = 2628000
  static QUARTER_IN_SECONDS: i32 = 7884000
  static YEAR_IN_SECONDS: i32 = 31536000
}

// ==========================================
// COMPOSABLE UTILITY FUNCTIONS  
// ==========================================

/**
 * Get transfer amount tier classification
 */
export function getTransferAmountTier(amount: BigInt): string {
  if (amount.lt(TransferAmountTiers.MICRO_THRESHOLD)) {
    return "DUST"
  } else if (amount.lt(TransferAmountTiers.SMALL_THRESHOLD)) {
    return "MICRO"
  } else if (amount.lt(TransferAmountTiers.MEDIUM_THRESHOLD)) {
    return "SMALL"
  } else if (amount.lt(TransferAmountTiers.LARGE_THRESHOLD)) {
    return "MEDIUM"
  } else if (amount.lt(TransferAmountTiers.WHALE_THRESHOLD)) {
    return "LARGE"
  } else if (amount.lt(TransferAmountTiers.INSTITUTIONAL_THRESHOLD)) {
    return "WHALE"
  } else {
    return "INSTITUTIONAL"
  }
}

/**
 * Get user activity classification
 */
export function getUserActivityTier(transactionCount: BigInt, totalVolume: BigInt): string {
  if (transactionCount.le(ActivityThresholds.INACTIVE_THRESHOLD)) {
    return "INACTIVE"
  } else if (transactionCount.le(ActivityThresholds.NEW_USER_THRESHOLD)) {
    return "NEW_USER"
  } else if (transactionCount.le(ActivityThresholds.CASUAL_USER_THRESHOLD)) {
    return "CASUAL_USER"
  } else if (transactionCount.le(ActivityThresholds.ACTIVE_USER_THRESHOLD)) {
    return "ACTIVE_USER"  
  } else if (transactionCount.le(ActivityThresholds.POWER_USER_THRESHOLD)) {
    return "POWER_USER"
  } else {
    return "WHALE_USER"
  }
}

/**
 * Calculate time-based risk multiplier
 */
export function getTimeBasedRiskMultiplier(timestamp: BigInt): BigDecimal {
  let multiplier = BigDecimal.fromString("1.0")
  let hour = (timestamp.toI32() % TimePeriods.DAY_IN_SECONDS) / TimePeriods.HOUR_IN_SECONDS
  
  // Off-hours risk (22:00 - 06:00 UTC)
  if (hour >= 22 || hour <= 6) {
    multiplier = multiplier.plus(RiskWeights.OFF_HOURS_RISK.div(BigDecimal.fromString("100")))
  }
  
  return multiplier
}

/**
 * Get risk weight for transfer amount
 */
export function getAmountRiskWeight(amount: BigInt): BigDecimal {
  let tier = getTransferAmountTier(amount)
  
  if (tier == "DUST") {
    return BigDecimal.fromString("0")
  } else if (tier == "MICRO") {
    return RiskWeights.MICRO_RISK_WEIGHT
  } else if (tier == "SMALL") {
    return RiskWeights.SMALL_RISK_WEIGHT
  } else if (tier == "MEDIUM") {
    return RiskWeights.MEDIUM_RISK_WEIGHT
  } else if (tier == "LARGE") {
    return RiskWeights.LARGE_RISK_WEIGHT
  } else if (tier == "WHALE") {
    return RiskWeights.WHALE_RISK_WEIGHT
  } else { // INSTITUTIONAL
    return RiskWeights.INSTITUTIONAL_RISK_WEIGHT
  }
}
