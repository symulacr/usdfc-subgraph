/**
 * USDFC v0 - Constants
 * Central location for all contract addresses, magic numbers, and configuration
 */

import { BigInt, BigDecimal, Bytes } from "@graphprotocol/graph-ts"

// ===========================================
// CONTRACT ADDRESSES (Filecoin Mainnet)
// ===========================================

export const USDFC_TOKEN_ADDRESS = "0x80B98d3aa09ffff255c3ba4A241111Ff1262F045"
export const TROVE_MANAGER_ADDRESS = "0x5aB87c2398454125Dd424425e39c8909bBE16022"  
export const STABILITY_POOL_ADDRESS = "0x791Ad78bBc58324089D3E0A8689E7D045B9592b5"
export const PROTOCOL_TOKEN_STAKING_ADDRESS = "0xc8707b3d426E7D7A0706C48dcd1A4b83bc220dB3"
export const PRICE_FEED_ADDRESS = "0x80e651c9739C1ed15A267c11b85361780164A368"
export const BORROWER_OPERATIONS_ADDRESS = "0x4f122d7fce7971e38801af5d96fcd4ed83efd654"

// Contract address bytes for comparisons
export const USDFC_TOKEN_BYTES = Bytes.fromHexString(USDFC_TOKEN_ADDRESS) as Bytes
export const TROVE_MANAGER_BYTES = Bytes.fromHexString(TROVE_MANAGER_ADDRESS) as Bytes
export const STABILITY_POOL_BYTES = Bytes.fromHexString(STABILITY_POOL_ADDRESS) as Bytes
export const PROTOCOL_TOKEN_STAKING_BYTES = Bytes.fromHexString(PROTOCOL_TOKEN_STAKING_ADDRESS) as Bytes
export const BORROWER_OPERATIONS_BYTES = Bytes.fromHexString(BORROWER_OPERATIONS_ADDRESS) as Bytes

// Zero address for mint/burn operations
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
export const ZERO_ADDRESS_BYTES = Bytes.fromHexString(ZERO_ADDRESS) as Bytes

// ===========================================
// TRANSACTION CLASSIFICATION
// ===========================================

// Transaction Sources
export const TX_SOURCE_CONTRACT_EVENT = "CONTRACT_EVENT"
export const TX_SOURCE_TOKEN_TRANSFER = "TOKEN_TRANSFER"
export const TX_SOURCE_INTERNAL_CALL = "INTERNAL_CALL"
export const TX_SOURCE_SYSTEM_LOG = "SYSTEM_LOG"

// Transaction Categories  
export const TX_CATEGORY_MINT = "MINT"
export const TX_CATEGORY_BURN = "BURN"
export const TX_CATEGORY_TRANSFER = "TRANSFER"
export const TX_CATEGORY_APPROVAL = "APPROVAL"
export const TX_CATEGORY_TROVE_OPERATION = "TROVE_OPERATION"
export const TX_CATEGORY_LIQUIDATION = "LIQUIDATION"
export const TX_CATEGORY_REDEMPTION = "REDEMPTION"
export const TX_CATEGORY_STABILITY_OPERATION = "STABILITY_OPERATION"
export const TX_CATEGORY_STAKING_OPERATION = "STAKING_OPERATION"
export const TX_CATEGORY_DEX_SWAP = "DEX_SWAP"
export const TX_CATEGORY_DEX_LIQUIDITY = "DEX_LIQUIDITY"
export const TX_CATEGORY_BRIDGE_TRANSFER = "BRIDGE_TRANSFER"
export const TX_CATEGORY_P2P_TRANSFER = "P2P_TRANSFER"
export const TX_CATEGORY_PROTOCOL_INTEGRATION = "PROTOCOL_INTEGRATION"
export const TX_CATEGORY_FLASH_LOAN = "FLASH_LOAN"
export const TX_CATEGORY_ARBITRAGE = "ARBITRAGE"
export const TX_CATEGORY_COMPLEX_DEFI = "COMPLEX_DEFI"
export const TX_CATEGORY_INSTITUTIONAL_OPERATION = "INSTITUTIONAL_OPERATION"

// Ecosystem Types
export const ECOSYSTEM_PROTOCOL_NATIVE = "PROTOCOL_NATIVE"
export const ECOSYSTEM_DEX_ECOSYSTEM = "DEX_ECOSYSTEM"
export const ECOSYSTEM_BRIDGE_ECOSYSTEM = "BRIDGE_ECOSYSTEM"
export const ECOSYSTEM_DEFI_ECOSYSTEM = "DEFI_ECOSYSTEM"
export const ECOSYSTEM_P2P_ECOSYSTEM = "P2P_ECOSYSTEM"
export const ECOSYSTEM_INSTITUTIONAL_ECOSYSTEM = "INSTITUTIONAL_ECOSYSTEM"

// Transfer Types (Enhanced V5)
export const TRANSFER_TYPE_NORMAL = "NORMAL"
export const TRANSFER_TYPE_MINT_TO_BORROWER = "MINT_TO_BORROWER"
export const TRANSFER_TYPE_BURN_FROM_REPAYMENT = "BURN_FROM_REPAYMENT"
export const TRANSFER_TYPE_LIQUIDATION_REWARD = "LIQUIDATION_REWARD"
export const TRANSFER_TYPE_REDEMPTION_PAYMENT = "REDEMPTION_PAYMENT"
export const TRANSFER_TYPE_STABILITY_DEPOSIT = "STABILITY_DEPOSIT"
export const TRANSFER_TYPE_STABILITY_WITHDRAWAL = "STABILITY_WITHDRAWAL"
export const TRANSFER_TYPE_STAKING_OPERATION = "STAKING_OPERATION"
export const TRANSFER_TYPE_DEX_SWAP_IN = "DEX_SWAP_IN"
export const TRANSFER_TYPE_DEX_SWAP_OUT = "DEX_SWAP_OUT"
export const TRANSFER_TYPE_BRIDGE_DEPOSIT = "BRIDGE_DEPOSIT"
export const TRANSFER_TYPE_BRIDGE_WITHDRAWAL = "BRIDGE_WITHDRAWAL"
export const TRANSFER_TYPE_P2P_DIRECT = "P2P_DIRECT"
export const TRANSFER_TYPE_FLASH_LOAN_BORROW = "FLASH_LOAN_BORROW"
export const TRANSFER_TYPE_FLASH_LOAN_REPAY = "FLASH_LOAN_REPAY"

// User Types
export const USER_TYPE_RETAIL_USER = "RETAIL_USER"
export const USER_TYPE_POWER_USER = "POWER_USER"
export const USER_TYPE_DEX_TRADER = "DEX_TRADER"
export const USER_TYPE_DEFI_USER = "DEFI_USER"
export const USER_TYPE_BRIDGE_USER = "BRIDGE_USER"
export const USER_TYPE_INSTITUTIONAL_USER = "INSTITUTIONAL_USER"
export const USER_TYPE_PROTOCOL_NATIVE = "PROTOCOL_NATIVE"
export const USER_TYPE_ECOSYSTEM_NATIVE = "ECOSYSTEM_NATIVE"

// ===========================================
// NUMERICAL CONSTANTS
// ===========================================

// BigInt constants
export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const TWO_BI = BigInt.fromI32(2)
export const TEN_BI = BigInt.fromI32(10)
export const HUNDRED_BI = BigInt.fromI32(100)
export const THOUSAND_BI = BigInt.fromI32(1000)

// BigDecimal constants
export const ZERO_BD = BigDecimal.fromString("0")
export const ONE_BD = BigDecimal.fromString("1")
export const TWO_BD = BigDecimal.fromString("2")
export const TEN_BD = BigDecimal.fromString("10")
export const HUNDRED_BD = BigDecimal.fromString("100")

// Decimal precision (18 decimals for USDFC)
export const DECIMAL_PRECISION = BigInt.fromI32(10).pow(18)
export const DECIMAL_PRECISION_BD = BigDecimal.fromString("1000000000000000000")

// Common thresholds
export const LARGE_TRANSFER_THRESHOLD = BigInt.fromString("1000000000000000000000") // 1000 USDFC
export const WHALE_THRESHOLD = BigInt.fromString("100000000000000000000000") // 100,000 USDFC  
export const INSTITUTIONAL_THRESHOLD = BigInt.fromString("1000000000000000000000000") // 1M USDFC

// Risk scoring constants
export const MAX_RISK_SCORE = BigDecimal.fromString("100")
export const MIN_RISK_SCORE = BigDecimal.fromString("0")
export const DEFAULT_RISK_SCORE = BigDecimal.fromString("50")

// Time constants (seconds)
export const SECONDS_PER_DAY = BigInt.fromI32(86400)
export const SECONDS_PER_WEEK = BigInt.fromI32(604800)
export const SECONDS_PER_MONTH = BigInt.fromI32(2628000) // 30.4 days
export const SECONDS_PER_YEAR = BigInt.fromI32(31557600) // 365.25 days

// ===========================================
// COLLATERAL RATIO CONSTANTS
// ===========================================

// Risk level thresholds (percentages as BigDecimal)
export const CR_VERY_LOW_THRESHOLD = BigDecimal.fromString("200")  // >200%
export const CR_LOW_THRESHOLD = BigDecimal.fromString("150")       // 150-200%
export const CR_MEDIUM_THRESHOLD = BigDecimal.fromString("125")    // 125-150%
export const CR_HIGH_THRESHOLD = BigDecimal.fromString("110")      // 110-125%
export const CR_VERY_HIGH_THRESHOLD = BigDecimal.fromString("105") // 105-110%
export const CR_CRITICAL_THRESHOLD = BigDecimal.fromString("105")  // <105%

// Protocol constants
export const MINIMUM_COLLATERAL_RATIO = BigDecimal.fromString("110") // 110% minimum CR
export const LIQUIDATION_THRESHOLD = BigDecimal.fromString("110")    // Liquidation at 110% CR

// ===========================================
// ENTITY IDs
// ===========================================

// Global entity IDs
export const GLOBAL_STATS_ID = "global"
export const PROTOCOL_STATS_ID = "global"
export const ECOSYSTEM_STATS_ID = "global"

// ===========================================
// DEX & ECOSYSTEM CONSTANTS  
// ===========================================

// Known DEX protocols (for classification)
export const DEX_PROTOCOLS = [
  "Uniswap",
  "SushiSwap", 
  "PancakeSwap",
  "1inch",
  "Balancer",
  "Curve"
]

// Known bridge protocols
export const BRIDGE_PROTOCOLS = [
  "Axelar",
  "Wormhole",
  "Multichain",
  "Hop",
  "Synapse"
]

// Trading frequency classifications
export const TRADING_FREQ_INACTIVE = "INACTIVE"
export const TRADING_FREQ_OCCASIONAL = "OCCASIONAL"  
export const TRADING_FREQ_REGULAR = "REGULAR"
export const TRADING_FREQ_ACTIVE = "ACTIVE"
export const TRADING_FREQ_VERY_ACTIVE = "VERY_ACTIVE"
export const TRADING_FREQ_HIGH_FREQUENCY = "HIGH_FREQUENCY"

// Risk tolerance levels
export const RISK_TOLERANCE_VERY_LOW = "VERY_LOW"
export const RISK_TOLERANCE_LOW = "LOW"
export const RISK_TOLERANCE_MEDIUM = "MEDIUM"
export const RISK_TOLERANCE_HIGH = "HIGH"
export const RISK_TOLERANCE_VERY_HIGH = "VERY_HIGH"

// Institution types
export const INSTITUTION_BANK = "BANK"
export const INSTITUTION_HEDGE_FUND = "HEDGE_FUND"
export const INSTITUTION_INSURANCE = "INSURANCE_COMPANY"
export const INSTITUTION_PENSION = "PENSION_FUND"
export const INSTITUTION_SOVEREIGN = "SOVEREIGN_WEALTH_FUND"
export const INSTITUTION_FINTECH = "FINTECH_COMPANY"
export const INSTITUTION_EXCHANGE = "CRYPTOCURRENCY_EXCHANGE"
export const INSTITUTION_MARKET_MAKER = "MARKET_MAKER"
export const INSTITUTION_TREASURY = "TREASURY_MANAGEMENT"

// ===========================================
// PERFORMANCE & ANALYTICS CONSTANTS
// ===========================================

// Activity pattern thresholds
export const LOW_ACTIVITY_THRESHOLD = BigInt.fromI32(5)      // < 5 transactions
export const MEDIUM_ACTIVITY_THRESHOLD = BigInt.fromI32(50)  // 5-50 transactions
export const HIGH_ACTIVITY_THRESHOLD = BigInt.fromI32(200)   // 50-200 transactions
// >200 = Very high activity

// Composability scoring
export const MAX_COMPOSABILITY_SCORE = BigDecimal.fromString("100")
export const COMPOSABILITY_PER_ECOSYSTEM = BigDecimal.fromString("20") // 20 points per ecosystem

// Influence scoring (based on volume and activity)
export const VOLUME_INFLUENCE_DIVISOR = BigDecimal.fromString("1000000000000000000") // 1 USDFC
export const ACTIVITY_INFLUENCE_DIVISOR = BigDecimal.fromString("100") // Normalize activity

// Performance scoring
export const EXCELLENT_PERFORMANCE_THRESHOLD = BigDecimal.fromString("90")
export const GOOD_PERFORMANCE_THRESHOLD = BigDecimal.fromString("70")  
export const AVERAGE_PERFORMANCE_THRESHOLD = BigDecimal.fromString("50")
export const POOR_PERFORMANCE_THRESHOLD = BigDecimal.fromString("30")

// ===========================================
// ERROR HANDLING & VALIDATION
// ===========================================

// Default values for missing data
export const DEFAULT_GAS_LIMIT = BigInt.fromString("21000")
export const DEFAULT_GAS_PRICE = BigInt.fromString("1000000000") // 1 gwei
export const DEFAULT_BLOCK_TIME = BigInt.fromI32(30) // 30 seconds

// Validation limits
export const MAX_TRANSFER_VALUE = BigInt.fromString("1000000000000000000000000000") // 1B USDFC
export const MIN_TRANSFER_VALUE = BigInt.fromI32(1) // 1 wei

// ===========================================
// FEATURE FLAGS & CONFIGURATION
// ===========================================

// Enable/disable advanced features
export const ENABLE_RISK_SCORING = true
export const ENABLE_COMPOSABILITY_TRACKING = true  
export const ENABLE_PREDICTIVE_ANALYTICS = true
export const ENABLE_INSTITUTIONAL_PROFILING = true
export const ENABLE_GEOGRAPHIC_ANALYSIS = false // Future feature

// Performance optimization flags
export const ENABLE_CACHING = true
export const BATCH_SIZE_LIMIT = BigInt.fromI32(100)
export const CACHE_TTL_SECONDS = BigInt.fromI32(300) // 5 minutes
