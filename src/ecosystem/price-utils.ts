/**
 * Price Utilities for GeckoTerminal Enhancements
 * Calculates USD values, manages PoolMetrics
 */

import { BigInt, BigDecimal, Address, Bytes, log } from "@graphprotocol/graph-ts";
import { PoolMetrics } from "../../generated/schema";

// Known token addresses
export const USDFC_ADDRESS = Address.fromString("0x80B98d3aa09ffff255c3ba4A241111Ff1262F045");
export const WFIL_ADDRESS = Address.fromString("0x60E1773636CF5E4A227d9AC24F20fEca034ee25A");
export const AXLUSDC_ADDRESS = Address.fromString("0xEB466342C4d449BC9f53A865D5Cb90586f405215");

// Pool addresses and fee tiers
export class PoolInfo {
  address: Address;
  baseToken: Address;
  quoteToken: Address;
  feeTier: BigInt;

  constructor(address: Address, baseToken: Address, quoteToken: Address, feeTier: BigInt) {
    this.address = address;
    this.baseToken = baseToken;
    this.quoteToken = quoteToken;
    this.feeTier = feeTier;
  }
}

export const KNOWN_POOLS = new Map<string, PoolInfo>();

// Initialize known pools
export function initKnownPools(): void {
  // USDFC/WFIL 0.05%
  KNOWN_POOLS.set(
    "0x4e07447bd38e60b94176764133788be1a0736b30",
    new PoolInfo(
      Address.fromString("0x4e07447bd38e60b94176764133788be1a0736b30"),
      USDFC_ADDRESS,
      WFIL_ADDRESS,
      BigInt.fromI32(500)
    )
  );

  // USDFC/axlUSDC 0.01%
  KNOWN_POOLS.set(
    "0x21ca72fe39095db9642ca9cc694fa056f906037f",
    new PoolInfo(
      Address.fromString("0x21ca72fe39095db9642ca9cc694fa056f906037f"),
      USDFC_ADDRESS,
      AXLUSDC_ADDRESS,
      BigInt.fromI32(100)
    )
  );
}

/**
 * Calculate token price in USD from pool reserves
 * Uses constant product formula: price = quoteReserve / baseReserve
 */
export function calculateTokenPriceUSD(
  baseTokenReserve: BigInt,
  quoteTokenReserve: BigInt,
  quoteTokenPriceUSD: BigDecimal
): BigDecimal {
  if (baseTokenReserve.equals(BigInt.fromI32(0))) {
    return BigDecimal.fromString("0");
  }

  // price = (quoteReserve / baseReserve) * quotePrice
  const price = quoteTokenReserve.toBigDecimal()
    .div(baseTokenReserve.toBigDecimal())
    .times(quoteTokenPriceUSD);

  return price;
}

/**
 * Get or create PoolMetrics entity
 */
export function getOrCreatePoolMetrics(
  poolAddress: Address,
  baseToken: Address,
  quoteToken: Address,
  feeTier: BigInt,
  timestamp: BigInt,
  blockNumber: BigInt
): PoolMetrics {
  let metrics = PoolMetrics.load(poolAddress);

  if (metrics == null) {
    metrics = new PoolMetrics(poolAddress);
    metrics.poolAddress = poolAddress;
    metrics.baseToken = baseToken;
    metrics.quoteToken = quoteToken;
    metrics.feeTier = feeTier;
    metrics.dexProtocol = "SushiSwap V3";
    metrics.createdAt = timestamp;
    metrics.createdAtBlock = blockNumber;

    // Initialize with zeros
    metrics.baseTokenPriceUSD = BigDecimal.fromString("0");
    metrics.quoteTokenPriceUSD = BigDecimal.fromString("1"); // Assume stablecoin = $1
    metrics.reserveUSD = BigDecimal.fromString("0");
    metrics.baseTokenReserve = BigInt.fromI32(0);
    metrics.quoteTokenReserve = BigInt.fromI32(0);

    metrics.volume24hUSD = BigDecimal.fromString("0");
    metrics.volume7dUSD = BigDecimal.fromString("0");
    metrics.volumeAllTimeUSD = BigDecimal.fromString("0");

    metrics.txCount24h = BigInt.fromI32(0);
    metrics.txCount7d = BigInt.fromI32(0);
    metrics.txCountAllTime = BigInt.fromI32(0);

    metrics.buys24h = BigInt.fromI32(0);
    metrics.sells24h = BigInt.fromI32(0);
    metrics.uniqueBuyers24h = 0;
    metrics.uniqueSellers24h = 0;

    metrics.priceChange1h = BigDecimal.fromString("0");
    metrics.priceChange6h = BigDecimal.fromString("0");
    metrics.priceChange24h = BigDecimal.fromString("0");

    metrics.lastUpdateTimestamp = timestamp;
    metrics.lastUpdateBlock = blockNumber;

    log.info("Created new PoolMetrics for pool {}", [poolAddress.toHexString()]);
  }

  return metrics;
}

/**
 * Update pool metrics after a trade
 */
export function updatePoolMetrics(
  poolAddress: Address,
  volumeUSD: BigDecimal,
  isBuy: boolean,
  timestamp: BigInt,
  blockNumber: BigInt
): void {
  let metrics = PoolMetrics.load(poolAddress);

  if (metrics == null) {
    log.warning("PoolMetrics not found for pool {}", [poolAddress.toHexString()]);
    return;
  }

  // Update volume metrics
  metrics.volumeAllTimeUSD = metrics.volumeAllTimeUSD.plus(volumeUSD);

  // Update transaction counts
  metrics.txCountAllTime = metrics.txCountAllTime.plus(BigInt.fromI32(1));

  // Update buy/sell counts (simplified - would need time window logic for 24h)
  if (isBuy) {
    metrics.buys24h = metrics.buys24h.plus(BigInt.fromI32(1));
  } else {
    metrics.sells24h = metrics.sells24h.plus(BigInt.fromI32(1));
  }

  metrics.lastUpdateTimestamp = timestamp;
  metrics.lastUpdateBlock = blockNumber;

  metrics.save();
}

/**
 * Estimate USD value from token amount
 * Uses approximate prices: WFIL = $1.31, axlUSDC = $1.00, USDFC = $0.99
 */
export function estimateUSDValue(tokenAddress: Bytes, amount: BigInt): BigDecimal {
  const amountDecimal = amount.toBigDecimal().div(BigDecimal.fromString("1000000000000000000")); // 18 decimals

  const tokenAddr = Address.fromBytes(tokenAddress);

  if (tokenAddr.equals(USDFC_ADDRESS)) {
    return amountDecimal.times(BigDecimal.fromString("0.99"));
  } else if (tokenAddr.equals(WFIL_ADDRESS)) {
    return amountDecimal.times(BigDecimal.fromString("1.31"));
  } else if (tokenAddr.equals(AXLUSDC_ADDRESS)) {
    return amountDecimal; // $1.00
  }

  return BigDecimal.fromString("0");
}

/**
 * Determine if trade is a BUY or SELL based on USDFC flow direction
 */
export function isBuyTrade(
  amount0: BigInt,
  amount1: BigInt,
  token0: Address,
  token1: Address
): boolean {
  // If USDFC is token0, positive amount0 means selling USDFC (SELL)
  if (token0.equals(USDFC_ADDRESS)) {
    return amount0.lt(BigInt.fromI32(0)); // Negative amount0 = receiving USDFC = BUY
  }
  // If USDFC is token1, positive amount1 means selling USDFC (SELL)
  else if (token1.equals(USDFC_ADDRESS)) {
    return amount1.lt(BigInt.fromI32(0)); // Negative amount1 = receiving USDFC = BUY
  }

  return false; // Default to false if USDFC not involved
}
