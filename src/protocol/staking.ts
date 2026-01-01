/**
 * USDFC v0 - Enhanced Protocol Token Staking Handler  
 * Enhanced V5 staking logic with performance metrics and strategy analysis
 */

import { BigInt, BigDecimal, log } from "@graphprotocol/graph-ts"
import {
  StakeChanged as StakeChangedEvent,
  StakingGainsWithdrawn as StakingGainsWithdrawnEvent
} from "../../generated/ProtocolTokenStaking_V0_Enhanced/ProtocolTokenStaking"
import {
  Transaction,
  Account,
  ProtocolStake,
  StakeOperation,
  ProtocolStats
} from "../../generated/schema"
import {
  createUniversalTransaction,
  ensureAccount,
  TX_SOURCE_CONTRACT_EVENT,
  TX_CATEGORY_STAKING_OPERATION,
  ECOSYSTEM_PROTOCOL_NATIVE,
  ZERO_BI,
  ZERO_BD,
  GLOBAL_STATS_ID
} from "../utils/constants"
import {
  logTransactionStart,
  logTransactionComplete
} from "../utils/helpers"

/**
 * Enhanced Stake Changed handler with strategy analysis
 */
export function handleStakeChanged(event: StakeChangedEvent): void {
  logTransactionStart(
    "StakeChanged",
    event.transaction.hash,
    event.params.staker,
    event.params.staker,
    event.params.newStake
  )
  
  // Create universal transaction
  let universalTx = createUniversalTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.params.staker,
    event.params.staker,
    event.params.newStake,
    TX_SOURCE_CONTRACT_EVENT,
    TX_CATEGORY_STAKING_OPERATION,
    ECOSYSTEM_PROTOCOL_NATIVE,
    event.logIndex,
    event.transaction.gasUsed,
    event.transaction.gasPrice,
    true,
    null
  )
  
  // Ensure account exists
  let account = ensureAccount(event.params.staker)
  
  // Load or create protocol stake
  let stake = ProtocolStake.load(event.params.staker)
  let isNewStaker = stake == null
  
  if (stake == null) {
    stake = new ProtocolStake(event.params.staker)
    stake.staker = event.params.staker
    stake.totalStaked = ZERO_BI
    stake.totalUnstaked = ZERO_BI
    stake.totalFILGained = ZERO_BI
    stake.totalUSDFCGained = ZERO_BI
    stake.firstStakeAt = event.block.timestamp
    stake.averageStake = ZERO_BD
    stake.stakingYieldRate = ZERO_BD
    stake.performanceScore = BigDecimal.fromString("100")
    stake.stakingStrategy = "CONSERVATIVE" // Default strategy
    stake.daysActive = ZERO_BI
  }
  
  // Store previous stake for operation tracking
  let previousStake = stake.stake || ZERO_BI
  
  // Update current state
  stake.stake = event.params.newStake
  stake.lastActivityAt = event.block.timestamp
  stake.daysActive = event.block.timestamp.minus(stake.firstStakeAt).div(BigInt.fromI32(86400))
  
  // Determine operation type and update metrics
  let stakeChange = event.params.newStake.minus(previousStake)
  let operationType: string
  
  if (previousStake.equals(ZERO_BI) && event.params.newStake.gt(ZERO_BI)) {
    operationType = "STAKE"
    stake.totalStaked = stake.totalStaked.plus(event.params.newStake)
  } else if (stakeChange.gt(ZERO_BI)) {
    operationType = "STAKE"
    stake.totalStaked = stake.totalStaked.plus(stakeChange)
  } else if (stakeChange.lt(ZERO_BI)) {
    operationType = "UNSTAKE"  
    stake.totalUnstaked = stake.totalUnstaked.plus(stakeChange.neg())
  } else {
    operationType = "CLAIM_GAINS" // No stake change but transaction occurred
  }
  
  // Update performance analytics
  updateStakingPerformance(stake, event.block.timestamp)
  
  stake.save()
  
  // Create operation record
  createStakeOperation(event, stake as ProtocolStake, operationType, stakeChange)
  
  // Update protocol stats
  updateProtocolStatsForStaking(isNewStaker, stakeChange, event.block.timestamp)
  
  logTransactionComplete("StakeChanged", event.params.staker.toHexString())
}

/**
 * Enhanced Staking Gains Withdrawn handler with yield optimization
 */
export function handleStakingGainsWithdrawn(event: StakingGainsWithdrawnEvent): void {
  logTransactionStart(
    "StakingGainsWithdrawn",
    event.transaction.hash,
    event.params.staker,
    event.params.staker,
    event.params.FILGain
  )
  
  // Create universal transaction
  let universalTx = createUniversalTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.params.staker,
    event.params.staker,
    event.params.FILGain,
    TX_SOURCE_CONTRACT_EVENT,
    TX_CATEGORY_STAKING_OPERATION,
    ECOSYSTEM_PROTOCOL_NATIVE,
    event.logIndex,
    event.transaction.gasUsed,
    event.transaction.gasPrice,
    true,
    null
  )
  
  // Update protocol stake
  let stake = ProtocolStake.load(event.params.staker)
  if (stake != null) {
    stake.totalFILGained = stake.totalFILGained.plus(event.params.FILGain)
    stake.totalUSDFCGained = stake.totalUSDFCGained.plus(event.params.LUSDGain)
    stake.lastActivityAt = event.block.timestamp
    
    // Update yield calculations
    updateYieldMetrics(stake, event.params.FILGain, event.params.LUSDGain, event.block.timestamp)
    
    // Analyze staking strategy
    updateStakingStrategy(stake)
    
    stake.save()
    
    // Create operation record
    let operationId = event.transaction.hash.concatI32(event.logIndex.toI32())
    let operation = new StakeOperation(operationId)
    operation.timestamp = event.block.timestamp
    operation.stake = stake.id
    operation.operation = "CLAIM_GAINS"
    operation.amount = ZERO_BI // No stake amount change
    operation.filClaimed = event.params.FILGain
    operation.usdfcClaimed = event.params.LUSDGain
    operation.blockNumber = event.block.number
    operation.transactionHash = event.transaction.hash
    operation.save()
  }
  
  logTransactionComplete("StakingGainsWithdrawn", event.params.staker.toHexString())
}

/**
 * Update staking performance metrics
 */
function updateStakingPerformance(stake: ProtocolStake, timestamp: BigInt): void {
  // Update average stake size
  if (stake.daysActive.gt(ZERO_BI)) {
    let weight = BigDecimal.fromString("0.1") // 10% weight for new data
    stake.averageStake = stake.averageStake
      .times(BigDecimal.fromString("0.9"))
      .plus(stake.stake.toBigDecimal().times(weight))
  } else {
    stake.averageStake = stake.stake.toBigDecimal()
  }
  
  // Calculate performance score based on consistency and duration
  let consistencyScore = stake.daysActive.gt(BigInt.fromI32(30)) ?
    BigDecimal.fromString("100") :
    stake.daysActive.toBigDecimal().times(BigDecimal.fromString("3.33")) // 30 days = 100
  
  let sizeScore = stake.stake.gt(BigInt.fromString("1000000000000000000000")) ? // 1000 tokens
    BigDecimal.fromString("100") :
    stake.stake.toBigDecimal().div(BigDecimal.fromString("10000000000000000000")) // Scale by 10 tokens
  
  stake.performanceScore = consistencyScore.plus(sizeScore).div(BigDecimal.fromString("2"))
  if (stake.performanceScore.gt(BigDecimal.fromString("100"))) {
    stake.performanceScore = BigDecimal.fromString("100")
  }
}

/**
 * Update yield metrics when gains are withdrawn
 */
function updateYieldMetrics(
  stake: ProtocolStake,
  filGain: BigInt,
  usdfcGain: BigInt,
  timestamp: BigInt
): void {
  
  if (stake.daysActive.gt(ZERO_BI) && stake.averageStake.gt(ZERO_BD)) {
    // Calculate annualized yield rate from total gains
    let totalGainValue = filGain.plus(usdfcGain) // Simplified - would need price conversion
    let dailyYield = totalGainValue.toBigDecimal().div(stake.averageStake)
    let annualizedYield = dailyYield.times(BigDecimal.fromString("365"))
    
    // Update running average of yield rate
    if (stake.stakingYieldRate.equals(ZERO_BD)) {
      stake.stakingYieldRate = annualizedYield.times(BigDecimal.fromString("100")) // Convert to percentage
    } else {
      // 20% weight for new data, 80% for historical
      stake.stakingYieldRate = stake.stakingYieldRate
        .times(BigDecimal.fromString("0.8"))
        .plus(annualizedYield.times(BigDecimal.fromString("100")).times(BigDecimal.fromString("0.2")))
    }
  }
}

/**
 * Analyze and update staking strategy
 */
function updateStakingStrategy(stake: ProtocolStake): void {
  // Analyze staking patterns to classify strategy
  let avgStakeUSDFC = stake.averageStake.div(BigDecimal.fromString("1000000000000000000")) // Convert to USDFC
  let yieldRate = stake.stakingYieldRate
  
  if (avgStakeUSDFC.gt(BigDecimal.fromString("100000"))) {
    // Large stakes
    if (stake.daysActive.gt(BigInt.fromI32(365))) {
      stake.stakingStrategy = "WHALE_LONG_TERM"
    } else {
      stake.stakingStrategy = "WHALE_SHORT_TERM"
    }
  } else if (avgStakeUSDFC.gt(BigDecimal.fromString("10000"))) {
    // Medium stakes
    if (yieldRate.gt(BigDecimal.fromString("10"))) {
      stake.stakingStrategy = "YIELD_FOCUSED"
    } else {
      stake.stakingStrategy = "BALANCED"
    }
  } else if (avgStakeUSDFC.gt(BigDecimal.fromString("1000"))) {
    // Small stakes
    if (stake.daysActive.lt(BigInt.fromI32(30))) {
      stake.stakingStrategy = "EXPERIMENTAL"
    } else {
      stake.stakingStrategy = "CONSERVATIVE"
    }
  } else {
    // Very small stakes
    stake.stakingStrategy = "MINIMAL"
  }
}

/**
 * Create stake operation record
 */
function createStakeOperation(
  event: StakeChangedEvent,
  stake: ProtocolStake,
  operationType: string,
  stakeChange: BigInt
): void {
  
  let operationId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let operation = new StakeOperation(operationId)
  
  operation.timestamp = event.block.timestamp
  operation.stake = stake.id
  operation.operation = operationType
  operation.amount = stakeChange.abs()
  operation.filClaimed = ZERO_BI
  operation.usdfcClaimed = ZERO_BI
  operation.blockNumber = event.block.number
  operation.transactionHash = event.transaction.hash
  
  operation.save()
}

/**
 * Update protocol stats for staking operations
 */
function updateProtocolStatsForStaking(
  isNewStaker: boolean,
  stakeChange: BigInt,
  timestamp: BigInt
): void {
  
  let stats = ProtocolStats.load(GLOBAL_STATS_ID)
  if (stats == null) return
  
  // Update staker count (would need to query actual count)
  if (isNewStaker) {
    // Increment staker count - simplified
  }
  
  stats.lastUpdateTimestamp = timestamp
  stats.save()
}
