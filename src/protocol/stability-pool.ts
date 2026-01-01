/**
 * USDFC v0 - Enhanced Stability Pool Handler
 * Enhanced V5 stability pool logic with yield tracking and performance analytics
 */

import { BigInt, BigDecimal, log } from "@graphprotocol/graph-ts"
import {
  UserDepositChanged as UserDepositChangedEvent,
  FILGainWithdrawn as FILGainWithdrawnEvent
} from "../../generated/StabilityPool_V0_Enhanced/StabilityPool"
import {
  Transaction,
  Account,
  StabilityDeposit,
  StabilityOperation,
  ProtocolStats
} from "../../generated/schema"
import {
  createUniversalTransaction,
  ensureAccount,
  TX_SOURCE_CONTRACT_EVENT,
  TX_CATEGORY_STABILITY_OPERATION,
  ECOSYSTEM_PROTOCOL_NATIVE,
  ZERO_BI,
  ZERO_BD,
  GLOBAL_STATS_ID
} from "../utils/constants"
import {
  logTransactionStart,
  logTransactionComplete,
  calculatePercentage
} from "../utils/helpers"

/**
 * Enhanced User Deposit Changed handler with yield tracking
 */
export function handleUserDepositChanged(event: UserDepositChangedEvent): void {
  logTransactionStart(
    "UserDepositChanged",
    event.transaction.hash,
    event.params._depositor,
    event.params._depositor,
    event.params._newDeposit
  )
  
  // Create universal transaction
  let universalTx = createUniversalTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.params._depositor,
    event.params._depositor,
    event.params._newDeposit,
    TX_SOURCE_CONTRACT_EVENT,
    TX_CATEGORY_STABILITY_OPERATION,
    ECOSYSTEM_PROTOCOL_NATIVE,
    event.logIndex,
    event.transaction.gasUsed,
    event.transaction.gasPrice,
    true,
    null
  )
  
  // Ensure account exists
  let account = ensureAccount(event.params._depositor)
  
  // Load or create stability deposit
  let deposit = StabilityDeposit.load(event.params._depositor)
  let isNewDepositor = deposit == null
  
  if (deposit == null) {
    deposit = new StabilityDeposit(event.params._depositor)
    deposit.depositor = event.params._depositor
    deposit.totalDeposited = ZERO_BI
    deposit.totalWithdrawn = ZERO_BI
    deposit.totalCollateralGained = ZERO_BI
    deposit.totalProtocolTokenGained = ZERO_BI
    deposit.firstDepositAt = event.block.timestamp
    deposit.averageDeposit = ZERO_BD
    deposit.yieldRate = ZERO_BD
    deposit.performanceScore = BigDecimal.fromString("100")
    deposit.riskScore = BigDecimal.fromString("10") // Low risk for stability deposits
    deposit.daysActive = ZERO_BI
  }
  
  // Store previous deposit for operation tracking
  let previousDeposit = deposit.currentDeposit || ZERO_BI
  
  // Update current state
  deposit.currentDeposit = event.params._newDeposit
  deposit.lastActivityAt = event.block.timestamp
  deposit.daysActive = event.block.timestamp.minus(deposit.firstDepositAt).div(BigInt.fromI32(86400))
  
  // Determine operation type and update metrics
  let depositChange = event.params._newDeposit.minus(previousDeposit)
  let operationType: string
  
  if (previousDeposit.equals(ZERO_BI) && event.params._newDeposit.gt(ZERO_BI)) {
    operationType = "DEPOSIT"
    deposit.totalDeposited = deposit.totalDeposited.plus(event.params._newDeposit)
  } else if (depositChange.gt(ZERO_BI)) {
    operationType = "DEPOSIT"
    deposit.totalDeposited = deposit.totalDeposited.plus(depositChange)
  } else if (depositChange.lt(ZERO_BI)) {
    operationType = "WITHDRAW"
    deposit.totalWithdrawn = deposit.totalWithdrawn.plus(depositChange.neg())
  } else {
    operationType = "CLAIM_GAINS" // No deposit change but transaction occurred
  }
  
  // Update performance analytics
  updateStabilityPerformance(deposit, event.block.timestamp)
  
  deposit.save()
  
  // Create operation record
  createStabilityOperation(event, deposit as StabilityDeposit, operationType, depositChange)
  
  // Update protocol stats
  updateProtocolStatsForStability(isNewDepositor, depositChange, event.block.timestamp)
  
  logTransactionComplete("UserDepositChanged", event.params._depositor.toHexString())
}

/**
 * Enhanced FIL Gain Withdrawn handler with performance tracking
 */
export function handleFILGainWithdrawn(event: FILGainWithdrawnEvent): void {
  logTransactionStart(
    "FILGainWithdrawn",
    event.transaction.hash,
    event.params._depositor,
    event.params._depositor,
    event.params._FIL
  )
  
  // Create universal transaction
  let universalTx = createUniversalTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.params._depositor,
    event.params._depositor,
    event.params._FIL,
    TX_SOURCE_CONTRACT_EVENT,
    TX_CATEGORY_STABILITY_OPERATION,
    ECOSYSTEM_PROTOCOL_NATIVE,
    event.logIndex,
    event.transaction.gasUsed,
    event.transaction.gasPrice,
    true,
    null
  )
  
  // Update stability deposit
  let deposit = StabilityDeposit.load(event.params._depositor)
  if (deposit != null) {
    deposit.totalCollateralGained = deposit.totalCollateralGained.plus(event.params._FIL)
    deposit.totalProtocolTokenGained = deposit.totalProtocolTokenGained.plus(event.params._LQTYAmount)
    deposit.lastActivityAt = event.block.timestamp
    
    // Update yield rate calculation
    updateYieldMetrics(deposit, event.params._FIL, event.params._LQTYAmount, event.block.timestamp)
    
    deposit.save()
    
    // Create operation record
    let operationId = event.transaction.hash.concatI32(event.logIndex.toI32())
    let operation = new StabilityOperation(operationId)
    operation.timestamp = event.block.timestamp
    operation.deposit = deposit.id
    operation.operation = "CLAIM_GAINS"
    operation.amount = ZERO_BI // No deposit amount change
    operation.collateralGainClaimed = event.params._FIL
    operation.protocolTokenClaimed = event.params._LQTYAmount
    operation.blockNumber = event.block.number
    operation.transactionHash = event.transaction.hash
    operation.save()
  }
  
  logTransactionComplete("FILGainWithdrawn", event.params._depositor.toHexString())
}

/**
 * Update stability deposit performance metrics
 */
function updateStabilityPerformance(deposit: StabilityDeposit, timestamp: BigInt): void {
  // Update average deposit size
  if (deposit.daysActive.gt(ZERO_BI)) {
    let weight = BigDecimal.fromString("0.1") // 10% weight for new data
    deposit.averageDeposit = deposit.averageDeposit
      .times(BigDecimal.fromString("0.9"))
      .plus(deposit.currentDeposit.toBigDecimal().times(weight))
  } else {
    deposit.averageDeposit = deposit.currentDeposit.toBigDecimal()
  }
  
  // Calculate performance score based on consistency and duration
  let consistencyScore = deposit.daysActive.gt(BigInt.fromI32(30)) ? 
    BigDecimal.fromString("100") : 
    deposit.daysActive.toBigDecimal().times(BigDecimal.fromString("3.33")) // 30 days = 100 points
  
  let sizeScore = deposit.currentDeposit.gt(BigInt.fromString("1000000000000000000000")) ? // 1000 USDFC
    BigDecimal.fromString("100") :
    deposit.currentDeposit.toBigDecimal().div(BigDecimal.fromString("10000000000000000000")) // Scale by 10 USDFC
  
  deposit.performanceScore = consistencyScore.plus(sizeScore).div(BigDecimal.fromString("2"))
  if (deposit.performanceScore.gt(BigDecimal.fromString("100"))) {
    deposit.performanceScore = BigDecimal.fromString("100")
  }
}

/**
 * Update yield metrics when gains are withdrawn
 */
function updateYieldMetrics(
  deposit: StabilityDeposit, 
  filGain: BigInt, 
  protocolTokenGain: BigInt,
  timestamp: BigInt
): void {
  
  if (deposit.daysActive.gt(ZERO_BI) && deposit.averageDeposit.gt(ZERO_BD)) {
    // Calculate annualized yield rate from FIL gains
    let dailyYield = filGain.toBigDecimal().div(deposit.averageDeposit)
    let annualizedYield = dailyYield.times(BigDecimal.fromString("365"))
    
    // Update running average of yield rate
    if (deposit.yieldRate.equals(ZERO_BD)) {
      deposit.yieldRate = annualizedYield.times(BigDecimal.fromString("100")) // Convert to percentage
    } else {
      // 20% weight for new data, 80% for historical
      deposit.yieldRate = deposit.yieldRate
        .times(BigDecimal.fromString("0.8"))
        .plus(annualizedYield.times(BigDecimal.fromString("100")).times(BigDecimal.fromString("0.2")))
    }
  }
}

/**
 * Create stability operation record
 */
function createStabilityOperation(
  event: UserDepositChangedEvent,
  deposit: StabilityDeposit,
  operationType: string,
  depositChange: BigInt
): void {
  
  let operationId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let operation = new StabilityOperation(operationId)
  
  operation.timestamp = event.block.timestamp
  operation.deposit = deposit.id
  operation.operation = operationType
  operation.amount = depositChange.abs()
  operation.collateralGainClaimed = ZERO_BI
  operation.protocolTokenClaimed = ZERO_BI
  operation.blockNumber = event.block.number
  operation.transactionHash = event.transaction.hash
  
  operation.save()
}

/**
 * Update protocol stats for stability operations
 */
function updateProtocolStatsForStability(
  isNewDepositor: boolean,
  depositChange: BigInt,
  timestamp: BigInt
): void {
  
  let stats = ProtocolStats.load(GLOBAL_STATS_ID)
  if (stats == null) return
  
  // Update depositor count (would need to query actual count)
  if (isNewDepositor) {
    // Increment depositor count - simplified
  }
  
  stats.lastUpdateTimestamp = timestamp
  stats.save()
}
