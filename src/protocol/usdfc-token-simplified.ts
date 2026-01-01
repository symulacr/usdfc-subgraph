/**
 * USDFC v0 - Simplified Token Handler (MVP Version)
 * Minimal working version focusing on core functionality
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
import {
  ensureAccount,
  ZERO_BI,
  GLOBAL_STATS_ID
} from "../utils/constants"

/**
 * Enhanced Transfer handler - Simplified
 */
export function handleTransfer(event: TransferEvent): void {
  log.info("Processing USDFC Transfer: {} from {} to {} value {}", [
    event.transaction.hash.toHexString(),
    event.params.from.toHexString(),
    event.params.to.toHexString(),
    event.params.value.toString()
  ])
  
  // Create Transfer entity
  let transferId = event.transaction.hash
    .concatI32(event.logIndex.toI32())
  
  let transfer = new Transfer(transferId)
  
  // Core fields
  transfer.timestamp = event.block.timestamp
  transfer.from = ensureAccount(event.params.from).id
  transfer.to = ensureAccount(event.params.to).id
  transfer.value = event.params.value
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash
  
  // Classify transfer type
  transfer.transferType = classifyTransferType(event.params.from, event.params.to, event.params.value)
  transfer.riskScore = calculateTransferRiskScore(event.params.from, event.params.to, event.params.value)
  
  transfer.save()
  
  // Update account balances
  updateAccountBalances(event.params.from, event.params.to, event.params.value)
  
  log.info("USDFC Transfer processed: {} USDFC from {} to {}", [
    event.params.value.toString(),
    event.params.from.toHexString(),
    event.params.to.toHexString()
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
  
  log.info("USDFC Mint processed: {} USDFC to {}", [
    event.params.amount.toString(),
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
  
  log.info("USDFC Burn processed: {} USDFC from {}", [
    event.params.amount.toString(),
    event.params.account.toHexString()
  ])
}

/**
 * Enhanced Approval handler - Simplified
 */
export function handleApproval(event: ApprovalEvent): void {
  log.info("Processing USDFC Approval: {} owner {} spender {} value {}", [
    event.transaction.hash.toHexString(),
    event.params.owner.toHexString(),
    event.params.spender.toHexString(),
    event.params.value.toString()
  ])
  
  // Basic approval logging for now
  log.info("USDFC Approval processed")
}

/**
 * Classify transfer type
 */
function classifyTransferType(from: Bytes, to: Bytes, value: BigInt): string {
  let zeroAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000") as Bytes
  
  // Check for mint (from zero address)
  if (from.equals(zeroAddress)) {
    return "MINT_TO_BORROWER"
  }
  
  // Check for burn (to zero address)
  if (to.equals(zeroAddress)) {
    return "BURN_FROM_REPAYMENT"
  }
  
  // Check protocol contract addresses
  let troveManagerAddress = Bytes.fromHexString("0x5aB87c2398454125Dd424425e39c8909bBE16022") as Bytes
  let stabilityPoolAddress = Bytes.fromHexString("0x791Ad78bBc58324089D3E0A8689E7D045B9592b5") as Bytes
  let stakingAddress = Bytes.fromHexString("0xc8707b3d426E7D7A0706C48dcd1A4b83bc220dB3") as Bytes
  
  if (from.equals(troveManagerAddress) || to.equals(troveManagerAddress)) {
    return "LIQUIDATION_REWARD"
  }
  
  if (from.equals(stabilityPoolAddress) || to.equals(stabilityPoolAddress)) {
    return "STABILITY_OPERATION"
  }
  
  if (from.equals(stakingAddress) || to.equals(stakingAddress)) {
    return "STAKING_OPERATION"
  }
  
  // Default to normal transfer
  return "NORMAL"
}

/**
 * Calculate transfer risk score - Simplified
 */
function calculateTransferRiskScore(from: Bytes, to: Bytes, value: BigInt): BigDecimal {
  let riskScore = BigDecimal.fromString("0")
  
  // Large transfer risk
  let largeTransferThreshold = BigInt.fromString("1000000000000000000000") // 1000 USDFC
  if (value.gt(largeTransferThreshold)) {
    riskScore = riskScore.plus(BigDecimal.fromString("20"))
  }
  
  return riskScore
}

/**
 * Update account balances
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
