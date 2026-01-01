/**
 * USDFC v0 - Fixed Token Handler (MVP Version)
 * Minimal working version based on actual USDFC ABI events
 */

import { BigInt, log, Bytes } from "@graphprotocol/graph-ts"
import {
  Transfer as TransferEvent,
  Approval as ApprovalEvent
} from "../../generated/USDFC_V0_Enhanced/USDFC"
import {
  Transaction,
  Account,
  Transfer,
  ProtocolStats
} from "../../generated/schema"
import {
  createUniversalTransaction,
  ensureAccount,
  TX_SOURCE_CONTRACT_EVENT,
  TX_CATEGORY_TRANSFER,
  TX_CATEGORY_APPROVAL,
  ECOSYSTEM_PROTOCOL_NATIVE,
  ZERO_BI,
  GLOBAL_STATS_ID
} from "../utils/constants"
import {
  logTransactionStart,
  logTransactionComplete,
  calculateTransferRiskScore
} from "../utils/helpers"

/**
 * Enhanced Transfer handler with ecosystem classification
 */
export function handleTransfer(event: TransferEvent): void {
  logTransactionStart(
    "Transfer",
    event.transaction.hash,
    event.params.from,
    event.params.to,
    event.params.value
  )
  
  // Create universal transaction record
  let universalTx = createUniversalTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.params.from,
    event.params.to,
    event.params.value,
    TX_SOURCE_CONTRACT_EVENT,
    TX_CATEGORY_TRANSFER,
    ECOSYSTEM_PROTOCOL_NATIVE,
    event.logIndex,
    null, // Remove gasUsed reference
    null, // Remove gasPrice reference
    true,
    null
  )
  
  // Create V5-compatible Transfer entity (backward compatibility)
  let transferId = event.transaction.hash
    .concatI32(event.logIndex.toI32())
  
  let transfer = new Transfer(transferId)
  
  // V5 fields preserved
  transfer.timestamp = event.block.timestamp
  transfer.from = ensureAccount(event.params.from).id
  transfer.to = ensureAccount(event.params.to).id
  transfer.value = event.params.value
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash
  transfer.relatedOperation = null
  
  // Classify transfer type (enhanced V5 logic)
  transfer.transferType = classifyTransferType(event.params.from, event.params.to, event.params.value)
  
  // V0 enhancements
  transfer.universalTransaction = universalTx.id
  transfer.ecosystemType = ECOSYSTEM_PROTOCOL_NATIVE
  transfer.riskScore = calculateTransferRiskScore(event.params.from, event.params.to, event.params.value)
  transfer.rawTransferData = event.transaction.input
  
  transfer.save()
  
  // Update account balances
  updateAccountBalances(event.params.from, event.params.to, event.params.value)
  
  // Update protocol statistics
  updateProtocolStats(TX_CATEGORY_TRANSFER, event.params.value, event.block.timestamp)
  
  logTransactionComplete("Transfer", transferId.toHexString())
}

/**
 * Enhanced Approval handler
 */
export function handleApproval(event: ApprovalEvent): void {
  logTransactionStart(
    "Approval",
    event.transaction.hash,
    event.params.owner,
    event.params.spender,
    ZERO_BI // Approvals don't transfer value
  )
  
  // Create universal transaction (approvals don't transfer value)
  let universalTx = createUniversalTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.params.owner,
    event.params.spender,
    ZERO_BI, // No value transfer in approvals
    TX_SOURCE_CONTRACT_EVENT,
    TX_CATEGORY_APPROVAL,
    ECOSYSTEM_PROTOCOL_NATIVE,
    event.logIndex,
    null, // Remove gasUsed reference
    null, // Remove gasPrice reference
    true,
    null
  )
  
  logTransactionComplete("Approval", universalTx.id.toHexString())
}

/**
 * Classify transfer type using enhanced V5 logic
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
  
  // Check protocol contract addresses for classification
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

/**
 * Update protocol statistics
 */
function updateProtocolStats(category: string, value: BigInt, timestamp: BigInt): void {
  let stats = ProtocolStats.load(GLOBAL_STATS_ID)
  if (stats == null) {
    stats = new ProtocolStats(GLOBAL_STATS_ID)
    initializeProtocolStats(stats)
  }
  
  // Update based on category
  if (category == TX_CATEGORY_TRANSFER) {
    stats.lifetimeTransferCount = stats.lifetimeTransferCount.plus(BigInt.fromI32(1))
  }
  
  stats.lifetimeVolume = stats.lifetimeVolume.plus(value)
  stats.lastUpdateBlock = event.block.number
  stats.lastUpdateTimestamp = timestamp
  
  stats.save()
}

/**
 * Initialize protocol stats
 */
function initializeProtocolStats(stats: ProtocolStats): void {
  stats.totalSupply = ZERO_BI
  stats.totalDebt = ZERO_BI
  stats.totalCollateral = ZERO_BI
  stats.activeTroveCount = ZERO_BI
  stats.totalTroveCount = ZERO_BI
  stats.holderCount = ZERO_BI
  stats.lifetimeVolume = ZERO_BI
  stats.lifetimeTransferCount = ZERO_BI
  stats.lifetimeMintCount = ZERO_BI
  stats.lifetimeBurnCount = ZERO_BI
  stats.lifetimeLiquidationCount = ZERO_BI
  stats.lifetimeRedemptionCount = ZERO_BI
  stats.totalBorrowingFees = ZERO_BI
  stats.totalRedemptionFees = ZERO_BI
  stats.lastUpdateBlock = ZERO_BI
  stats.lastUpdateTimestamp = ZERO_BI
}
