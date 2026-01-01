/**
 * USDFC v0 - Enhanced Price Feed Handler
 * Enhanced V5 price feed logic with market analytics and impact analysis
 */

import { BigInt, BigDecimal, log } from "@graphprotocol/graph-ts"
import {
  LastGoodPriceUpdated as LastGoodPriceUpdatedEvent
} from "../../generated/PriceFeed_V0_Enhanced/PriceFeed"
import {
  Transaction,
  PriceUpdate,
  MarketCondition,
  ProtocolStats
} from "../../generated/schema"
import {
  createUniversalTransaction,
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

// Previous price for volatility calculation
let previousPrice: BigDecimal = ZERO_BD
let previousTimestamp: BigInt = ZERO_BI

/**
 * Enhanced Price Update handler with market impact analysis
 */
export function handlePriceUpdate(event: LastGoodPriceUpdatedEvent): void {
  logTransactionStart(
    "PriceUpdate",
    event.transaction.hash,
    event.address,
    event.address,
    event.params._price
  )
  
  // Create universal transaction (price updates are system-level)
  let universalTx = createUniversalTransaction(
    event.transaction.hash,
    event.block.number,
    event.block.timestamp,
    event.address,
    event.address,
    event.params._price,
    TX_SOURCE_CONTRACT_EVENT,
    "PRICE_UPDATE",
    ECOSYSTEM_PROTOCOL_NATIVE,
    event.logIndex,
    null, // Price updates typically don't have gas costs
    null,
    true,
    null
  )
  
  // Create price update record
  let priceUpdateId = event.transaction.hash.concatI32(event.logIndex.toI32())
  let priceUpdate = new PriceUpdate(priceUpdateId)
  
  priceUpdate.timestamp = event.block.timestamp
  priceUpdate.filPrice = event.params._price
  priceUpdate.blockNumber = event.block.number
  priceUpdate.transactionHash = event.transaction.hash
  
  // Calculate price change analytics
  let currentPrice = event.params._price.toBigDecimal()
  updateMarketAnalytics(priceUpdate, currentPrice, event.block.timestamp)
  
  priceUpdate.save()
  
  // Update market conditions
  updateMarketConditions(currentPrice, event.block.timestamp)
  
  // Update global price in protocol stats
  updateProtocolStatsWithPrice(event.params._price, event.block.timestamp)
  
  // Store current price for next calculation
  previousPrice = currentPrice
  previousTimestamp = event.block.timestamp
  
  logTransactionComplete("PriceUpdate", priceUpdateId.toHexString())
}

/**
 * Update market analytics for price update
 */
function updateMarketAnalytics(
  priceUpdate: PriceUpdate,
  currentPrice: BigDecimal,
  timestamp: BigInt
): void {
  
  // Calculate price change if we have previous data
  if (previousPrice.gt(ZERO_BD)) {
    let priceChange = currentPrice.minus(previousPrice)
    let priceChangePercent = priceChange.div(previousPrice).times(BigDecimal.fromString("100"))
    
    // Store price change metrics (could be added to schema)
    // priceUpdate.priceChange = priceChange
    // priceUpdate.priceChangePercent = priceChangePercent
    
    // Log significant price movements
    if (priceChangePercent.abs().gt(BigDecimal.fromString("5"))) {
      log.info("Significant price movement: {}% change from {} to {}", [
        priceChangePercent.toString(),
        previousPrice.toString(),
        currentPrice.toString()
      ])
    }
  }
  
  // Calculate time since last update
  if (previousTimestamp.gt(ZERO_BI)) {
    let timeDiff = timestamp.minus(previousTimestamp)
    
    // Log if price update frequency is unusual
    if (timeDiff.gt(BigInt.fromI32(3600))) { // More than 1 hour
      log.info("Long gap between price updates: {} seconds", [timeDiff.toString()])
    } else if (timeDiff.lt(BigInt.fromI32(60))) { // Less than 1 minute
      log.info("Frequent price updates: {} seconds gap", [timeDiff.toString()])
    }
  }
}

/**
 * Update market conditions based on price movements
 */
function updateMarketConditions(currentPrice: BigDecimal, timestamp: BigInt): void {
  let dayId = timestamp.div(BigInt.fromI32(86400)).toString()
  let marketCondition = MarketCondition.load(dayId)
  
  if (marketCondition == null) {
    marketCondition = new MarketCondition(dayId)
    marketCondition.date = dayId
    marketCondition.timestamp = timestamp
    marketCondition.openPrice = currentPrice
    marketCondition.highPrice = currentPrice
    marketCondition.lowPrice = currentPrice
    marketCondition.priceUpdatesCount = BigInt.fromI32(1)
    marketCondition.volatilityScore = ZERO_BD
    marketCondition.trendDirection = "NEUTRAL"
  } else {
    // Update high/low
    if (currentPrice.gt(marketCondition.highPrice)) {
      marketCondition.highPrice = currentPrice
    }
    if (currentPrice.lt(marketCondition.lowPrice)) {
      marketCondition.lowPrice = currentPrice
    }
    
    marketCondition.priceUpdatesCount = marketCondition.priceUpdatesCount.plus(BigInt.fromI32(1))
  }
  
  // Always update close price and timestamp
  marketCondition.closePrice = currentPrice
  marketCondition.lastUpdateTimestamp = timestamp
  
  // Calculate volatility (simplified)
  if (marketCondition.openPrice.gt(ZERO_BD)) {
    let dailyRange = marketCondition.highPrice.minus(marketCondition.lowPrice)
    marketCondition.volatilityScore = dailyRange.div(marketCondition.openPrice).times(BigDecimal.fromString("100"))
    
    // Determine trend direction
    let priceChange = marketCondition.closePrice.minus(marketCondition.openPrice)
    let changePercent = priceChange.div(marketCondition.openPrice).times(BigDecimal.fromString("100"))
    
    if (changePercent.gt(BigDecimal.fromString("2"))) {
      marketCondition.trendDirection = "BULLISH"
    } else if (changePercent.lt(BigDecimal.fromString("-2"))) {
      marketCondition.trendDirection = "BEARISH"
    } else {
      marketCondition.trendDirection = "NEUTRAL"
    }
  }
  
  marketCondition.save()
}

/**
 * Update protocol stats with current price
 */
function updateProtocolStatsWithPrice(price: BigInt, timestamp: BigInt): void {
  let stats = ProtocolStats.load(GLOBAL_STATS_ID)
  if (stats == null) return
  
  // Store current FIL price (could add to schema)
  // stats.currentFilPrice = price
  stats.lastUpdateTimestamp = timestamp
  
  // Calculate protocol health metrics based on price
  // This could include analysis of liquidation risk based on current price
  updateProtocolHealthMetrics(stats, price)
  
  stats.save()
}

/**
 * Update protocol health metrics based on current price
 */
function updateProtocolHealthMetrics(stats: ProtocolStats, price: BigInt): void {
  // Calculate system-wide collateralization based on current price
  if (stats.totalCollateral.gt(ZERO_BI) && stats.totalDebt.gt(ZERO_BI)) {
    let totalCollateralValue = stats.totalCollateral.toBigDecimal().times(price.toBigDecimal())
    let systemCollateralRatio = totalCollateralValue.div(stats.totalDebt.toBigDecimal())
    
    // Calculate liquidation risk based on system CR
    let protocolHealth: BigDecimal
    if (systemCollateralRatio.gt(BigDecimal.fromString("2.0"))) {
      protocolHealth = BigDecimal.fromString("100") // Excellent health
    } else if (systemCollateralRatio.gt(BigDecimal.fromString("1.5"))) {
      protocolHealth = BigDecimal.fromString("80") // Good health
    } else if (systemCollateralRatio.gt(BigDecimal.fromString("1.2"))) {
      protocolHealth = BigDecimal.fromString("60") // Fair health
    } else if (systemCollateralRatio.gt(BigDecimal.fromString("1.1"))) {
      protocolHealth = BigDecimal.fromString("30") // Poor health
    } else {
      protocolHealth = BigDecimal.fromString("10") // Critical health
    }
    
    stats.protocolHealth = protocolHealth
    
    // Calculate liquidation risk
    let liquidationRisk = BigDecimal.fromString("110").div(systemCollateralRatio.times(BigDecimal.fromString("100")))
    if (liquidationRisk.gt(BigDecimal.fromString("100"))) {
      liquidationRisk = BigDecimal.fromString("100")
    }
    stats.liquidationRisk = liquidationRisk
  }
}

// Supporting type that might be added to schema
// type MarketCondition @entity {
//   id: ID!
//   date: String!
//   timestamp: BigInt!
//   openPrice: BigDecimal!
//   highPrice: BigDecimal!
//   lowPrice: BigDecimal!
//   closePrice: BigDecimal!
//   priceUpdatesCount: BigInt!
//   volatilityScore: BigDecimal!
//   trendDirection: String!
//   lastUpdateTimestamp: BigInt!
// }
