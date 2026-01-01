/**
 * SushiSwap V3 DEX Integration for V7 Ultimate
 *
 * Tracks USDFC trading on SushiSwap:
 * - USDFC/WFIL pair ($50K+ daily volume)
 * - USDFC/axlUSDC pair (cross-chain stablecoin)
 *
 * Creates:
 * - DEXTrade entities for each swap
 * - DEXProfile entities for trader analytics
 * - Updates Account ecosystem metrics
 */

import { BigInt, BigDecimal, Address, log, Bytes } from "@graphprotocol/graph-ts";
import {
  estimateUSDValue,
  isBuyTrade,
  getOrCreatePoolMetrics,
  updatePoolMetrics,
  USDFC_ADDRESS,
  WFIL_ADDRESS,
  AXLUSDC_ADDRESS
} from "./price-utils";
import {
  BridgeRequested as BridgeRequestedEvent
} from "../../generated/SushiXSwap_V2_Router1/SushiXSwapV2";
import {
  Swap as SwapEvent,
  Mint as MintEvent,
  Burn as BurnEvent
} from "../../generated/SushiSwap_Pool_USDFC_axlUSDC/UniswapV3Pool";
import {
  DEXTrade,
  DEXProfile,
  Account,
  Transaction
} from "../../generated/schema";

/**
 * Handle SushiXSwap bridge requests (cross-chain swaps involving USDFC)
 */
export function handleBridgeRequested(event: BridgeRequestedEvent): void {
  log.info("SushiXSwap BridgeRequested detected at tx {}", [
    event.transaction.hash.toHexString()
  ]);

  // Check if USDFC is involved in this bridge request
  const usdfcAddress = Address.fromString("0x80B98d3aa09ffff255c3ba4A241111Ff1262F045");

  // Create or update Account entities
  let fromAccount = getOrCreateAccount(event.params.user);
  let toAccount = getOrCreateAccount(event.params.user); // In bridge, user is both sender and receiver initially

  // Update account metrics
  fromAccount.tokenTransferCount = fromAccount.tokenTransferCount.plus(BigInt.fromI32(1));
  fromAccount.dexActivityCount = fromAccount.dexActivityCount.plus(BigInt.fromI32(1));
  fromAccount.lastActiveBlock = event.block.number;
  fromAccount.lastActiveTimestamp = event.block.timestamp;
  fromAccount.save();

  // Create or update DEXProfile
  let dexProfile = getOrCreateDEXProfile(event.params.user);
  dexProfile.totalTrades = dexProfile.totalTrades.plus(BigInt.fromI32(1));
  dexProfile.totalVolume = dexProfile.totalVolume.plus(event.params.amount);
  dexProfile.save();

  // Create DEXTrade entity
  let tradeId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString());

  let trade = new DEXTrade(Bytes.fromHexString(tradeId));
  trade.trader = fromAccount.id;
  trade.dexProfile = dexProfile.id;
  trade.dexProtocol = "SushiXSwap V2";
  trade.tradeType = "EXACT_INPUT_SINGLE"; // Simplified for bridge swaps

  // TODO: Parse bridge data to determine input/output tokens
  trade.inputToken = event.params.tokenIn;
  trade.outputToken = Bytes.fromHexString("0x0000000000000000000000000000000000000000"); // TBD from bridge data
  trade.inputAmount = event.params.amount;
  trade.outputAmount = BigInt.fromI32(0); // Will be updated when bridge completes

  trade.price = BigDecimal.fromString("0"); // TBD
  trade.slippage = BigDecimal.fromString("0"); // TBD
  trade.fee = BigInt.fromI32(0); // TBD
  trade.feePercentage = BigDecimal.fromString("0"); // TBD
  trade.profitLoss = BigInt.fromI32(0); // TBD
  trade.priceImpact = BigDecimal.fromString("0"); // TBD
  trade.executionQuality = BigDecimal.fromString("0"); // TBD

  trade.blockNumber = event.block.number;
  trade.blockTimestamp = event.block.timestamp;
  trade.gasUsed = BigInt.fromI32(0); // Set in receipt

  trade.save();

  log.info("Created DEXTrade {} for SushiXSwap bridge", [tradeId]);
}

/**
 * Get or create Account entity
 */
function getOrCreateAccount(address: Address): Account {
  let account = Account.load(address);

  if (account == null) {
    account = new Account(address);

    // Initialize V5/V6 core fields
    account.usdfcBalance = BigInt.fromI32(0);
    account.totalTransactionCount = BigInt.fromI32(0);
    account.totalVolumeIn = BigInt.fromI32(0);
    account.totalVolumeOut = BigInt.fromI32(0);
    account.netVolume = BigInt.fromI32(0);

    // Initialize time tracking
    account.firstSeenBlock = BigInt.fromI32(0);
    account.firstSeenTimestamp = BigInt.fromI32(0);
    account.lastActiveBlock = BigInt.fromI32(0);
    account.lastActiveTimestamp = BigInt.fromI32(0);
    account.daysSinceFirstSeen = BigInt.fromI32(0);
    account.daysSinceLastActive = BigInt.fromI32(0);

    // Initialize activity breakdown by source
    account.contractTransactionCount = BigInt.fromI32(0);
    account.tokenTransferCount = BigInt.fromI32(0);
    account.internalTransactionCount = BigInt.fromI32(0);
    account.systemLogCount = BigInt.fromI32(0);

    // Initialize activity breakdown by category
    account.protocolOperationCount = BigInt.fromI32(0);
    account.dexActivityCount = BigInt.fromI32(0);
    account.bridgeActivityCount = BigInt.fromI32(0);
    account.p2pTransferCount = BigInt.fromI32(0);
    account.defiIntegrationCount = BigInt.fromI32(0);

    // Initialize volume breakdown
    account.protocolVolume = BigInt.fromI32(0);
    account.dexVolume = BigInt.fromI32(0);
    account.bridgeVolume = BigInt.fromI32(0);
    account.p2pVolume = BigInt.fromI32(0);
    account.defiIntegrationVolume = BigInt.fromI32(0);

    // Initialize user intelligence
    account.userType = "RETAIL_USER"; // Default, will be updated
    account.activityPatterns = [];
    account.riskScore = BigDecimal.fromString("0");
    account.composabilityScore = BigDecimal.fromString("0");
    account.influenceScore = BigDecimal.fromString("0");
    account.retentionScore = BigDecimal.fromString("0");
  }

  return account;
}

/**
 * Get or create DEXProfile entity
 */
function getOrCreateDEXProfile(address: Address): DEXProfile {
  let profile = DEXProfile.load(address);

  if (profile == null) {
    profile = new DEXProfile(address);
    profile.account = address;

    // Initialize trading metrics
    profile.totalTrades = BigInt.fromI32(0);
    profile.totalVolume = BigInt.fromI32(0);
    profile.totalFees = BigInt.fromI32(0);
    profile.profitableTrades = BigInt.fromI32(0);
    profile.unprofitableTrades = BigInt.fromI32(0);
    profile.averageTradeSize = BigDecimal.fromString("0");
    profile.largestTrade = BigInt.fromI32(0);

    // Initialize performance analytics
    profile.tradingSuccessRate = BigDecimal.fromString("0");
    profile.totalProfitLoss = BigInt.fromI32(0);
    profile.sharpeRatio = BigDecimal.fromString("0");
    profile.maxDrawdown = BigDecimal.fromString("0");

    // Initialize behavioral patterns
    profile.tradingFrequency = "INACTIVE";
    profile.preferredDEXs = ["SushiSwap"];
    profile.tradingHours = [];
    profile.riskTolerance = "MEDIUM";
  }

  return profile;
}

/**
 * Handle direct swaps in SushiSwap V3 pools (USDFC/WFIL, USDFC/axlUSDC)
 */
export function handleSwap(event: SwapEvent): void {
  log.info("SushiSwap V3 Swap detected at tx {}", [
    event.transaction.hash.toHexString()
  ]);

  // Create or update Account entities
  let sender = getOrCreateAccount(event.params.sender);
  let recipient = getOrCreateAccount(event.params.recipient);

  // Update account metrics
  sender.tokenTransferCount = sender.tokenTransferCount.plus(BigInt.fromI32(1));
  sender.dexActivityCount = sender.dexActivityCount.plus(BigInt.fromI32(1));
  sender.lastActiveBlock = event.block.number;
  sender.lastActiveTimestamp = event.block.timestamp;
  sender.save();

  recipient.dexActivityCount = recipient.dexActivityCount.plus(BigInt.fromI32(1));
  recipient.lastActiveBlock = event.block.number;
  recipient.lastActiveTimestamp = event.block.timestamp;
  recipient.save();

  // Create or update DEXProfile
  let dexProfile = getOrCreateDEXProfile(event.params.sender);
  dexProfile.totalTrades = dexProfile.totalTrades.plus(BigInt.fromI32(1));

  // Calculate volume from amount0 or amount1
  let volume = event.params.amount0.gt(BigInt.fromI32(0))
    ? event.params.amount0
    : event.params.amount1.abs();
  dexProfile.totalVolume = dexProfile.totalVolume.plus(volume);
  dexProfile.save();

  // Determine pool tokens and fee tier
  const poolAddress = event.address;
  let baseToken = USDFC_ADDRESS;
  let quoteToken = WFIL_ADDRESS; // Default, will detect
  let feeTier = BigInt.fromI32(500); // Default 0.05%

  // Detect pool based on address
  if (poolAddress.toHexString() == "0x21ca72fe39095db9642ca9cc694fa056f906037f") {
    quoteToken = AXLUSDC_ADDRESS;
    feeTier = BigInt.fromI32(100); // 0.01%
  }

  // Determine BUY vs SELL
  const isBuy = isBuyTrade(event.params.amount0, event.params.amount1, baseToken, quoteToken);

  // Create DEXTrade entity
  let tradeId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString());

  let trade = new DEXTrade(Bytes.fromHexString(tradeId));
  trade.trader = sender.id;
  trade.dexProfile = dexProfile.id;
  trade.dexProtocol = "SushiSwap V3";
  trade.tradeType = isBuy ? "BUY" : "SELL";

  // Determine input/output based on swap direction
  trade.inputToken = event.params.amount0.gt(BigInt.fromI32(0)) ? baseToken : quoteToken;
  trade.outputToken = event.params.amount0.lt(BigInt.fromI32(0)) ? baseToken : quoteToken;
  trade.inputAmount = event.params.amount0.abs();
  trade.outputAmount = event.params.amount1.abs();

  // GeckoTerminal Enhancement: Calculate USD values
  trade.inputAmountUSD = estimateUSDValue(trade.inputToken, trade.inputAmount);
  trade.outputAmountUSD = estimateUSDValue(trade.outputToken, trade.outputAmount);
  trade.volumeUSD = trade.inputAmountUSD; // Use input value as volume

  // GeckoTerminal Enhancement: Set price context
  trade.baseTokenPriceUSD = BigDecimal.fromString("0.99"); // USDFC approximate price
  trade.quoteTokenPriceUSD = quoteToken.equals(WFIL_ADDRESS)
    ? BigDecimal.fromString("1.31")
    : BigDecimal.fromString("1.00");
  trade.poolReserveUSD = BigDecimal.fromString("0"); // Will be calculated separately

  // GeckoTerminal Enhancement: Set pool context
  trade.poolAddress = poolAddress;
  trade.poolFeeTier = feeTier;

  trade.price = BigDecimal.fromString("0"); // Can calculate from sqrtPriceX96
  trade.slippage = BigDecimal.fromString("0");
  trade.fee = BigInt.fromI32(0);
  trade.feePercentage = BigDecimal.fromString("0");
  trade.profitLoss = BigInt.fromI32(0);
  trade.priceImpact = BigDecimal.fromString("0");
  trade.executionQuality = BigDecimal.fromString("0");

  trade.blockNumber = event.block.number;
  trade.blockTimestamp = event.block.timestamp;
  trade.gasUsed = BigInt.fromI32(0);

  trade.save();

  // GeckoTerminal Enhancement: Update PoolMetrics
  let poolMetrics = getOrCreatePoolMetrics(
    poolAddress,
    baseToken,
    quoteToken,
    feeTier,
    event.block.timestamp,
    event.block.number
  );
  updatePoolMetrics(
    poolAddress,
    trade.volumeUSD,
    isBuy,
    event.block.timestamp,
    event.block.number
  );

  log.info("Created DEXTrade {} for SushiSwap V3 swap ({})", [tradeId, trade.tradeType]);
}

/**
 * Handle liquidity provision to SushiSwap V3 pools
 */
export function handleMint(event: MintEvent): void {
  log.info("SushiSwap V3 Mint (liquidity add) detected at tx {}", [
    event.transaction.hash.toHexString()
  ]);

  // Create or update Account
  let owner = getOrCreateAccount(event.params.owner);
  owner.dexActivityCount = owner.dexActivityCount.plus(BigInt.fromI32(1));
  owner.lastActiveBlock = event.block.number;
  owner.lastActiveTimestamp = event.block.timestamp;
  owner.save();

  // Create or update DEXProfile
  let dexProfile = getOrCreateDEXProfile(event.params.owner);
  dexProfile.totalTrades = dexProfile.totalTrades.plus(BigInt.fromI32(1));

  // Track liquidity provision volume
  let volume = event.params.amount0.plus(event.params.amount1);
  dexProfile.totalVolume = dexProfile.totalVolume.plus(volume);
  dexProfile.save();

  // Create DEXTrade entity for liquidity provision
  let tradeId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString());

  let trade = new DEXTrade(Bytes.fromHexString(tradeId));
  trade.trader = owner.id;
  trade.dexProfile = dexProfile.id;
  trade.dexProtocol = "SushiSwap V3";
  trade.tradeType = "ADD_LIQUIDITY";

  trade.inputToken = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
  trade.outputToken = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
  trade.inputAmount = event.params.amount0;
  trade.outputAmount = event.params.amount1;

  trade.price = BigDecimal.fromString("0");
  trade.slippage = BigDecimal.fromString("0");
  trade.fee = BigInt.fromI32(0);
  trade.feePercentage = BigDecimal.fromString("0");
  trade.profitLoss = BigInt.fromI32(0);
  trade.priceImpact = BigDecimal.fromString("0");
  trade.executionQuality = BigDecimal.fromString("0");

  trade.blockNumber = event.block.number;
  trade.blockTimestamp = event.block.timestamp;
  trade.gasUsed = BigInt.fromI32(0);

  trade.save();

  log.info("Created DEXTrade {} for liquidity provision", [tradeId]);
}

/**
 * Handle liquidity removal from SushiSwap V3 pools
 */
export function handleBurn(event: BurnEvent): void {
  log.info("SushiSwap V3 Burn (liquidity remove) detected at tx {}", [
    event.transaction.hash.toHexString()
  ]);

  // Create or update Account
  let owner = getOrCreateAccount(event.params.owner);
  owner.dexActivityCount = owner.dexActivityCount.plus(BigInt.fromI32(1));
  owner.lastActiveBlock = event.block.number;
  owner.lastActiveTimestamp = event.block.timestamp;
  owner.save();

  // Create or update DEXProfile
  let dexProfile = getOrCreateDEXProfile(event.params.owner);
  dexProfile.totalTrades = dexProfile.totalTrades.plus(BigInt.fromI32(1));

  // Track liquidity removal volume
  let volume = event.params.amount0.plus(event.params.amount1);
  dexProfile.totalVolume = dexProfile.totalVolume.plus(volume);
  dexProfile.save();

  // Create DEXTrade entity for liquidity removal
  let tradeId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString());

  let trade = new DEXTrade(Bytes.fromHexString(tradeId));
  trade.trader = owner.id;
  trade.dexProfile = dexProfile.id;
  trade.dexProtocol = "SushiSwap V3";
  trade.tradeType = "REMOVE_LIQUIDITY";

  trade.inputToken = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
  trade.outputToken = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
  trade.inputAmount = event.params.amount0;
  trade.outputAmount = event.params.amount1;

  trade.price = BigDecimal.fromString("0");
  trade.slippage = BigDecimal.fromString("0");
  trade.fee = BigInt.fromI32(0);
  trade.feePercentage = BigDecimal.fromString("0");
  trade.profitLoss = BigInt.fromI32(0);
  trade.priceImpact = BigDecimal.fromString("0");
  trade.executionQuality = BigDecimal.fromString("0");

  trade.blockNumber = event.block.number;
  trade.blockTimestamp = event.block.timestamp;
  trade.gasUsed = BigInt.fromI32(0);

  trade.save();

  log.info("Created DEXTrade {} for liquidity removal", [tradeId]);
}
