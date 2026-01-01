/**
 * USDFC v0 - Enhanced Trove Manager Handler
 * Enhanced V5 trove logic with advanced risk analytics and ecosystem intelligence
 */

import { BigInt, BigDecimal, log, Bytes } from "@graphprotocol/graph-ts"
import {
  TroveUpdated as TroveUpdatedEvent,
  TroveLiquidated as TroveLiquidatedEvent,
  Liquidation as LiquidationEvent,
  Redemption as RedemptionEvent
} from "../../generated/TroveManager_V0_Enhanced/TroveManager"
import {
  Transaction,
  Account,
  Trove,
  TroveOperation,
  Liquidation,
  Redemption,
  ProtocolStats
} from "../../generated/schema"
import {
  createUniversalTransaction,
  ensureAccount,
  TX_SOURCE_CONTRACT_EVENT,
  TX_CATEGORY_TROVE_OPERATION,
  TX_CATEGORY_LIQUIDATION, 
  TX_CATEGORY_REDEMPTION,
  ECOSYSTEM_PROTOCOL_NATIVE,
  ZERO_BI,
  ZERO_BD,
  ONE_BD,
  GLOBAL_STATS_ID
} from "../utils/constants"
import {
  calculateCollateralRatio,
  calculateVolumeRisk,
  normalizeRiskScore,
  logTransactionStart,
  logTransactionComplete,
  validateNonNegative,
  clamp
} from "../utils/helpers"

/**
 * Enhanced Trove Updated handler with risk analytics
 */
export function handleTroveUpdated(event: TroveUpdatedEvent): void {
  logTransactionStart(
    "TroveUpdated",
    event.transaction.hash,
    event.params._borrower,
    event.params._borrower,
    event.params._debt
  )
  
  // Create universal transaction record
  let universalTx = createUniversalTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.params._borrower,
    event.params._borrower, // Trove operations are self-transactions
    event.params._debt,
    TX_SOURCE_CONTRACT_EVENT,
    TX_CATEGORY_TROVE_OPERATION,
    ECOSYSTEM_PROTOCOL_NATIVE,
    event.logIndex,
    event.transaction.gasUsed,
    event.transaction.gasPrice,
    true,
    null
  )
  
  // Ensure borrower account exists
  let account = ensureAccount(event.params._borrower)
  
  // Load or create trove
  let trove = Trove.load(event.params._borrower)
  let isNewTrove = trove == null
  
  if (trove == null) {
    trove = new Trove(event.params._borrower)
    trove.owner = event.params._borrower
    trove.openedAtBlock = event.block.number
    trove.openedAtTimestamp = event.block.timestamp
    
    // Initialize lifetime metrics
    trove.totalBorrowed = ZERO_BI
    trove.totalRepaid = ZERO_BI
    trove.totalCollateralAdded = ZERO_BI
    trove.totalCollateralWithdrawn = ZERO_BI
    trove.borrowingFeesPaid = ZERO_BI
    trove.operationCount = ZERO_BI
    
    // Initialize performance metrics
    trove.averageCollateralRatio = ZERO_BD
    trove.lowestCollateralRatio = BigDecimal.fromString("99999")
    trove.riskEvents = ZERO_BI
    trove.performanceScore = BigDecimal.fromString("100") // Start with perfect score
  }
  
  // Store previous values for comparison (FIXED: track status too)
  let previousCollateral = trove.collateral || ZERO_BI
  let previousDebt = trove.debt || ZERO_BI
  let previousStatus = trove.status || "ACTIVE"  // Track previous status

  // Update current state
  trove.collateral = event.params._coll
  trove.debt = event.params._debt
  trove.stake = event.params._stake
  trove.lastUpdateBlock = event.block.number
  trove.lastUpdateTimestamp = event.block.timestamp

  // Calculate days open
  trove.daysOpen = event.block.timestamp.minus(trove.openedAtTimestamp).div(BigInt.fromI32(86400))

  // Determine trove status based on debt
  if (event.params._debt.equals(ZERO_BI)) {
    trove.status = "CLOSED_BY_OWNER"
    trove.closedAtBlock = event.block.number
    trove.closedAtTimestamp = event.block.timestamp
  } else {
    trove.status = "ACTIVE"
  }
  
  // Calculate enhanced metrics
  updateTroveAnalytics(trove, previousCollateral, previousDebt, event.block.timestamp)
  
  // Create operation record
  createTroveOperation(
    event,
    trove as Trove,
    previousCollateral,
    previousDebt,
    universalTx
  )
  
  trove.save()

  // Update protocol stats (FIXED: pass previous values)
  updateProtocolStatsForTrove(
    trove as Trove,
    previousStatus,
    previousDebt,
    previousCollateral,
    isNewTrove,
    event.block.timestamp
  )
  
  logTransactionComplete("TroveUpdated", event.params._borrower.toHexString())
}

/**
 * Enhanced Trove Liquidated handler
 */
export function handleTroveLiquidated(event: TroveLiquidatedEvent): void {
  logTransactionStart(
    "TroveLiquidated",
    event.transaction.hash,
    event.params._borrower,
    event.params._borrower,
    event.params._debt
  )
  
  // Create universal transaction
  let universalTx = createUniversalTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.params._borrower,
    event.params._borrower,
    event.params._debt,
    TX_SOURCE_CONTRACT_EVENT,
    TX_CATEGORY_LIQUIDATION,
    ECOSYSTEM_PROTOCOL_NATIVE,
    event.logIndex,
    event.transaction.gasUsed,
    event.transaction.gasPrice,
    true,
    null
  )
  
  // Update trove status (FIXED: track previous values for stats)
  let trove = Trove.load(event.params._borrower)
  if (trove != null) {
    // Track previous values before updating
    let previousStatus = trove.status
    let previousDebt = trove.debt
    let previousCollateral = trove.collateral

    trove.status = "CLOSED_BY_LIQUIDATION"
    trove.closedAtBlock = event.block.number
    trove.closedAtTimestamp = event.block.timestamp

    // Record liquidation as risk event
    trove.riskEvents = trove.riskEvents.plus(BigInt.fromI32(1))

    // Impact performance score
    trove.performanceScore = trove.performanceScore.times(BigDecimal.fromString("0.5")) // 50% penalty for liquidation
    trove.performanceScore = clamp(trove.performanceScore, ZERO_BD, BigDecimal.fromString("100"))

    trove.save()

    // FIXED: Update protocol stats with proper tracking
    updateProtocolStatsForTrove(
      trove as Trove,
      previousStatus,
      previousDebt,
      previousCollateral,
      false,  // not a new trove
      event.block.timestamp
    )
  }
  
  logTransactionComplete("TroveLiquidated", event.params._borrower.toHexString())
}

/**
 * Enhanced Liquidation handler with ecosystem impact analysis
 */
export function handleLiquidation(event: LiquidationEvent): void {
  logTransactionStart(
    "Liquidation",
    event.transaction.hash,
    Bytes.fromHexString("0x0000000000000000000000000000000000000000") as Bytes,
    Bytes.fromHexString("0x0000000000000000000000000000000000000000") as Bytes,
    event.params._liquidatedDebt
  )
  
  // Create liquidation record
  let liquidationId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let liquidation = new Liquidation(liquidationId)
  
  liquidation.timestamp = event.block.timestamp
  liquidation.collateralLiquidated = event.params._liquidatedColl
  liquidation.debtLiquidated = event.params._liquidatedDebt
  liquidation.collateralGasCompensation = event.params._collGasCompensation
  liquidation.debtGasCompensation = event.params._LUSDGasCompensation
  liquidation.blockNumber = event.block.number
  liquidation.transactionHash = event.transaction.hash
  
  // Calculate liquidation impact metrics
  let liquidationRatio = calculateCollateralRatio(event.params._liquidatedColl, event.params._liquidatedDebt)
  
  liquidation.save()
  
  // Update protocol stats
  updateProtocolStatsForLiquidation(
    event.params._liquidatedDebt,
    event.params._liquidatedColl,
    event.block.timestamp
  )
  
  logTransactionComplete("Liquidation", liquidationId.toHexString())
}

/**
 * Enhanced Redemption handler with market analysis
 */
export function handleRedemption(event: RedemptionEvent): void {
  logTransactionStart(
    "Redemption", 
    event.transaction.hash,
    Bytes.fromHexString("0x0000000000000000000000000000000000000000") as Bytes,
    Bytes.fromHexString("0x0000000000000000000000000000000000000000") as Bytes,
    event.params._attemptedLUSDAmount
  )
  
  // Create redemption record
  let redemptionId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let redemption = new Redemption(redemptionId)
  
  redemption.timestamp = event.block.timestamp
  redemption.usdfcRedeemed = event.params._attemptedLUSDAmount
  redemption.filReceived = event.params._actualLUSDAmount // Note: This might need adjustment based on actual event params
  redemption.redemptionFee = event.params._LUSDFee
  redemption.blockNumber = event.block.number
  redemption.transactionHash = event.transaction.hash
  
  redemption.save()
  
  // Update protocol stats
  updateProtocolStatsForRedemption(
    event.params._attemptedLUSDAmount,
    event.params._LUSDFee,
    event.block.timestamp
  )
  
  logTransactionComplete("Redemption", redemptionId.toHexString())
}

/**
 * Update trove analytics with enhanced metrics
 */
function updateTroveAnalytics(
  trove: Trove, 
  previousCollateral: BigInt, 
  previousDebt: BigInt,
  timestamp: BigInt
): void {
  
  // Calculate current collateral ratio
  trove.collateralRatio = calculateCollateralRatio(trove.collateral, trove.debt)
  
  // Update lowest collateral ratio
  if (trove.collateralRatio.lt(trove.lowestCollateralRatio)) {
    trove.lowestCollateralRatio = trove.collateralRatio
  }
  
  // Calculate health score (0-100, higher is better)
  trove.healthScore = calculateTroveHealthScore(trove.collateralRatio)
  
  // Classify risk level
  trove.riskLevel = classifyTroveRiskLevel(trove.collateralRatio)
  
  // Calculate liquidation price (price at which CR = 110%)
  if (trove.debt.gt(ZERO_BI)) {
    let minCR = BigDecimal.fromString("1.1") // 110%
    trove.liquidationPrice = trove.debt.toBigDecimal().times(minCR).div(trove.collateral.toBigDecimal())
  } else {
    trove.liquidationPrice = ZERO_BD
  }
  
  // Calculate safety margin (how far from liquidation)
  let liquidationCR = BigDecimal.fromString("110")
  if (trove.collateralRatio.gt(liquidationCR)) {
    trove.safetyMargin = trove.collateralRatio.minus(liquidationCR)
  } else {
    trove.safetyMargin = ZERO_BD
    trove.riskEvents = trove.riskEvents.plus(BigInt.fromI32(1)) // Near liquidation event
  }
  
  // Update lifetime metrics
  let collateralChange = trove.collateral.minus(previousCollateral)
  let debtChange = trove.debt.minus(previousDebt)
  
  if (collateralChange.gt(ZERO_BI)) {
    trove.totalCollateralAdded = trove.totalCollateralAdded.plus(collateralChange)
  } else if (collateralChange.lt(ZERO_BI)) {
    trove.totalCollateralWithdrawn = trove.totalCollateralWithdrawn.plus(collateralChange.neg())
  }
  
  if (debtChange.gt(ZERO_BI)) {
    trove.totalBorrowed = trove.totalBorrowed.plus(debtChange)
  } else if (debtChange.lt(ZERO_BI)) {
    trove.totalRepaid = trove.totalRepaid.plus(debtChange.neg())
  }
  
  trove.operationCount = trove.operationCount.plus(BigInt.fromI32(1))
  
  // Update average collateral ratio (running average)
  if (trove.operationCount.gt(ZERO_BI)) {
    let weight = ONE_BD.div(trove.operationCount.toBigDecimal())
    trove.averageCollateralRatio = trove.averageCollateralRatio
      .times(ONE_BD.minus(weight))
      .plus(trove.collateralRatio.times(weight))
  }
  
  // Calculate performance score based on multiple factors
  trove.performanceScore = calculateTrovePerformanceScore(trove)
  
  // Calculate liquidation risk score (ML-based prediction)
  trove.liquidationRiskScore = calculateLiquidationRiskScore(trove)
  
  // Generate optimization suggestions
  trove.optimizationSuggestions = generateOptimizationSuggestions(trove)
}

/**
 * Calculate trove health score (0-100)
 */
function calculateTroveHealthScore(collateralRatio: BigDecimal): BigDecimal {
  if (collateralRatio.lt(BigDecimal.fromString("110"))) {
    return ZERO_BD // Critical - at or below liquidation threshold
  } else if (collateralRatio.lt(BigDecimal.fromString("125"))) {
    return BigDecimal.fromString("25") // Poor - very risky
  } else if (collateralRatio.lt(BigDecimal.fromString("150"))) {
    return BigDecimal.fromString("50") // Fair - moderate risk
  } else if (collateralRatio.lt(BigDecimal.fromString("200"))) {
    return BigDecimal.fromString("75") // Good - low risk
  } else {
    return BigDecimal.fromString("100") // Excellent - very safe
  }
}

/**
 * Classify trove risk level
 */
function classifyTroveRiskLevel(collateralRatio: BigDecimal): string {
  if (collateralRatio.gt(BigDecimal.fromString("200"))) {
    return "VERY_LOW"
  } else if (collateralRatio.gt(BigDecimal.fromString("150"))) {
    return "LOW"
  } else if (collateralRatio.gt(BigDecimal.fromString("125"))) {
    return "MEDIUM"
  } else if (collateralRatio.gt(BigDecimal.fromString("110"))) {
    return "HIGH"
  } else if (collateralRatio.gt(BigDecimal.fromString("105"))) {
    return "VERY_HIGH"
  } else {
    return "CRITICAL"
  }
}

/**
 * Calculate comprehensive trove performance score
 */
function calculateTrovePerformanceScore(trove: Trove): BigDecimal {
  let scores: BigDecimal[] = []
  let weights: BigDecimal[] = []
  
  // Health score (40% weight)
  scores.push(trove.healthScore)
  weights.push(BigDecimal.fromString("0.4"))
  
  // Stability score based on lowest CR (30% weight)
  let stabilityScore = trove.lowestCollateralRatio.gt(BigDecimal.fromString("150")) ? 
    BigDecimal.fromString("100") : 
    trove.lowestCollateralRatio.div(BigDecimal.fromString("1.5"))
  scores.push(clamp(stabilityScore, ZERO_BD, BigDecimal.fromString("100")))
  weights.push(BigDecimal.fromString("0.3"))
  
  // Risk events penalty (20% weight)
  let riskPenalty = trove.riskEvents.toBigDecimal().times(BigDecimal.fromString("10"))
  let riskScore = clamp(BigDecimal.fromString("100").minus(riskPenalty), ZERO_BD, BigDecimal.fromString("100"))
  scores.push(riskScore)
  weights.push(BigDecimal.fromString("0.2"))
  
  // Age bonus (10% weight)
  let ageBonus = clamp(trove.daysOpen.toBigDecimal().div(BigDecimal.fromString("30")), ZERO_BD, BigDecimal.fromString("100"))
  scores.push(ageBonus)
  weights.push(BigDecimal.fromString("0.1"))
  
  // Calculate weighted average
  let totalWeightedScore = ZERO_BD
  let totalWeight = ZERO_BD
  
  for (let i = 0; i < scores.length; i++) {
    totalWeightedScore = totalWeightedScore.plus(scores[i].times(weights[i]))
    totalWeight = totalWeight.plus(weights[i])
  }
  
  return totalWeight.gt(ZERO_BD) ? totalWeightedScore.div(totalWeight) : BigDecimal.fromString("50")
}

/**
 * Calculate ML-based liquidation risk score
 */
function calculateLiquidationRiskScore(trove: Trove): BigDecimal {
  // Simplified ML model - would be enhanced with more sophisticated algorithms
  let riskFactors: BigDecimal[] = []
  
  // Current CR factor
  let crRisk = BigDecimal.fromString("110").div(trove.collateralRatio.plus(BigDecimal.fromString("1")))
  riskFactors.push(clamp(crRisk.times(BigDecimal.fromString("100")), ZERO_BD, BigDecimal.fromString("100")))
  
  // Historical risk events
  let eventRisk = trove.riskEvents.toBigDecimal().times(BigDecimal.fromString("15"))
  riskFactors.push(clamp(eventRisk, ZERO_BD, BigDecimal.fromString("100")))
  
  // Volatility risk (based on operations frequency)
  let volatilityRisk = trove.operationCount.gt(ZERO_BI) ? 
    trove.operationCount.toBigDecimal().div(trove.daysOpen.plus(BigInt.fromI32(1)).toBigDecimal()).times(BigDecimal.fromString("10")) :
    ZERO_BD
  riskFactors.push(clamp(volatilityRisk, ZERO_BD, BigDecimal.fromString("100")))
  
  // Calculate average risk score
  let totalRisk = ZERO_BD
  for (let i = 0; i < riskFactors.length; i++) {
    totalRisk = totalRisk.plus(riskFactors[i])
  }
  
  return riskFactors.length > 0 ? totalRisk.div(BigDecimal.fromString(riskFactors.length.toString())) : BigDecimal.fromString("50")
}

/**
 * Generate optimization suggestions
 */
function generateOptimizationSuggestions(trove: Trove): string[] {
  let suggestions: string[] = []
  
  if (trove.collateralRatio.lt(BigDecimal.fromString("150"))) {
    suggestions.push("Consider adding more collateral to improve safety margin")
  }
  
  if (trove.collateralRatio.gt(BigDecimal.fromString("300"))) {
    suggestions.push("Consider optimizing capital efficiency by borrowing more or withdrawing collateral")
  }
  
  if (trove.riskEvents.gt(BigInt.fromI32(2))) {
    suggestions.push("Consider maintaining higher collateral ratios to avoid future risk events")
  }
  
  if (trove.operationCount.gt(BigInt.fromI32(20)) && trove.daysOpen.lt(BigInt.fromI32(30))) {
    suggestions.push("High operation frequency detected - consider longer-term position management")
  }
  
  return suggestions
}

/**
 * Create trove operation record
 */
function createTroveOperation(
  event: TroveUpdatedEvent,
  trove: Trove,
  previousCollateral: BigInt,
  previousDebt: BigInt,
  universalTx: Transaction
): void {
  
  let operationId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let operation = new TroveOperation(operationId)
  
  operation.timestamp = event.block.timestamp
  operation.trove = trove.id
  operation.collateralChange = event.params._coll.minus(previousCollateral)
  operation.debtChange = event.params._debt.minus(previousDebt)
  operation.collateralBefore = previousCollateral
  operation.collateralAfter = event.params._coll
  operation.debtBefore = previousDebt
  operation.debtAfter = event.params._debt
  operation.blockNumber = event.block.number
  operation.transactionHash = event.transaction.hash
  
  // Classify operation type
  operation.operation = classifyTroveOperationType(
    operation.collateralChange,
    operation.debtChange,
    previousCollateral,
    previousDebt
  )
  
  operation.save()
}

/**
 * Classify trove operation type
 */
function classifyTroveOperationType(
  collateralChange: BigInt,
  debtChange: BigInt,
  previousCollateral: BigInt,
  previousDebt: BigInt
): string {
  
  let wasOpen = previousDebt.gt(ZERO_BI)
  let isOpen = previousDebt.plus(debtChange).gt(ZERO_BI)
  
  if (!wasOpen && isOpen) {
    return "OPEN"
  } else if (wasOpen && !isOpen) {
    return "CLOSE"
  } else if (collateralChange.gt(ZERO_BI) && debtChange.equals(ZERO_BI)) {
    return "ADD_COLLATERAL"
  } else if (collateralChange.lt(ZERO_BI) && debtChange.equals(ZERO_BI)) {
    return "WITHDRAW_COLLATERAL"
  } else if (collateralChange.equals(ZERO_BI) && debtChange.gt(ZERO_BI)) {
    return "BORROW"
  } else if (collateralChange.equals(ZERO_BI) && debtChange.lt(ZERO_BI)) {
    return "REPAY"
  } else {
    return "ADJUST"
  }
}

/**
 * Update protocol stats for trove operations (FIXED: proper tracking)
 */
function updateProtocolStatsForTrove(
  trove: Trove,
  previousStatus: string,
  previousDebt: BigInt,
  previousCollateral: BigInt,
  isNewTrove: boolean,
  timestamp: BigInt
): void {
  let stats = ProtocolStats.load(GLOBAL_STATS_ID)
  if (stats == null) return

  if (isNewTrove) {
    stats.totalTroveCount = stats.totalTroveCount.plus(BigInt.fromI32(1))
  }

  // FIXED: Only update activeTroveCount on status TRANSITIONS
  if (previousStatus != trove.status) {
    if (trove.status == "ACTIVE" && previousStatus != "ACTIVE") {
      // Trove became active
      stats.activeTroveCount = stats.activeTroveCount.plus(BigInt.fromI32(1))
    } else if (previousStatus == "ACTIVE" && trove.status != "ACTIVE") {
      // Trove became inactive
      stats.activeTroveCount = stats.activeTroveCount.minus(BigInt.fromI32(1))
    }
  }

  // FIXED: Update totals by DELTA, not absolute values
  let debtChange = trove.debt.minus(previousDebt)
  let collateralChange = trove.collateral.minus(previousCollateral)

  stats.totalDebt = stats.totalDebt.plus(debtChange)
  stats.totalCollateral = stats.totalCollateral.plus(collateralChange)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  
  stats.save()
}

/**
 * Update protocol stats for liquidations
 */
function updateProtocolStatsForLiquidation(
  liquidatedDebt: BigInt,
  liquidatedCollateral: BigInt,
  timestamp: BigInt
): void {
  let stats = ProtocolStats.load(GLOBAL_STATS_ID)
  if (stats == null) return
  
  stats.lifetimeLiquidationCount = stats.lifetimeLiquidationCount.plus(BigInt.fromI32(1))
  stats.totalDebt = stats.totalDebt.minus(liquidatedDebt)
  stats.totalCollateral = stats.totalCollateral.minus(liquidatedCollateral)
  stats.lastUpdateTimestamp = timestamp
  
  stats.save()
}

/**
 * Update protocol stats for redemptions
 */
function updateProtocolStatsForRedemption(
  redeemedAmount: BigInt,
  fee: BigInt,
  timestamp: BigInt
): void {
  let stats = ProtocolStats.load(GLOBAL_STATS_ID)
  if (stats == null) return
  
  stats.lifetimeRedemptionCount = stats.lifetimeRedemptionCount.plus(BigInt.fromI32(1))
  stats.totalRedemptionFees = stats.totalRedemptionFees.plus(fee)
  stats.lastUpdateTimestamp = timestamp
  
  stats.save()
}
