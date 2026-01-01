/**
 * Ecosystem Transfer Classifier for V7 Ultimate
 *
 * Classifies USDFC transfers to detect ecosystem usage:
 * - DEX swaps (SushiSwap pools)
 * - Lending operations (Secured Finance)
 * - Bridge transfers (Axelar, Celer)
 * - Storage payments (Lighthouse)
 * - P2P transfers
 *
 * This allows V7 to automatically detect new integrations
 * without requiring manual data source additions.
 */

import { Address, Bytes, BigInt, log } from "@graphprotocol/graph-ts";

/**
 * Known contract addresses on Filecoin mainnet
 * TODO: Update these addresses via Blockscout discovery
 */
export class KnownContracts {
  // USDFC Core Protocol
  static USDFC_TOKEN: string = "0x80B98d3aa09ffff255c3ba4A241111Ff1262F045";
  static TROVE_MANAGER: string = ""; // TBD
  static STABILITY_POOL: string = ""; // TBD
  static STAKING: string = ""; // TBD

  // SushiSwap DEX
  static SUSHISWAP_ROUTER_1: string = "0x804b526e5bF4349819fe2Db65349d0825870F8Ee";
  static SUSHISWAP_ROUTER_2: string = "0xd5607d184b1d6ecba94a07c217497fe9346010d9";
  static SUSHISWAP_V3_FACTORY: string = "0xc35DADB65012eC5796536bD9864eD8773aBc74C4"; // Pool creator
  static SUSHISWAP_POOL_USDFC_WFIL: string = "0x4e07447bd38e60b94176764133788be1a0736b30";
  static SUSHISWAP_POOL_USDFC_AXLUSDC: string = "0x21ca72fe39095db9642ca9cc694fa056f906037f";

  // Secured Finance Lending
  static SECURED_FINANCE_LENDING_POOL: string = ""; // TBD
  static SECURED_FINANCE_ORDER_BOOK: string = ""; // TBD

  // Cross-Chain Bridges
  static AXELAR_GATEWAY: string = ""; // TBD
  static CELER_BRIDGE: string = ""; // TBD
  static SQUID_ROUTER: string = ""; // TBD

  // Storage Payments
  static LIGHTHOUSE_PAYMENTS: string = ""; // TBD

  // Wrapped tokens
  static WFIL: string = "0x60E1773636CF5E4A227d9AC24F20fEca034ee25A";
  static AXLUSDC: string = "0xEB466342C4d449BC9f53A865D5Cb90586f405215";

  /**
   * Check if address is a known DEX contract
   */
  static isDEX(address: Address): boolean {
    const addr = address.toHexString().toLowerCase();

    return (
      addr == this.SUSHISWAP_ROUTER_1.toLowerCase() ||
      addr == this.SUSHISWAP_ROUTER_2.toLowerCase() ||
      addr == this.SUSHISWAP_V3_FACTORY.toLowerCase() ||
      addr == this.SUSHISWAP_POOL_USDFC_WFIL.toLowerCase() ||
      addr == this.SUSHISWAP_POOL_USDFC_AXLUSDC.toLowerCase()
    );
  }

  /**
   * Check if address is a known bridge contract
   */
  static isBridge(address: Address): boolean {
    const addr = address.toHexString().toLowerCase();

    return (
      addr == this.AXELAR_GATEWAY.toLowerCase() ||
      addr == this.CELER_BRIDGE.toLowerCase() ||
      addr == this.SQUID_ROUTER.toLowerCase()
    );
  }

  /**
   * Check if address is a known lending protocol
   */
  static isLending(address: Address): boolean {
    const addr = address.toHexString().toLowerCase();

    return (
      addr == this.SECURED_FINANCE_LENDING_POOL.toLowerCase() ||
      addr == this.SECURED_FINANCE_ORDER_BOOK.toLowerCase()
    );
  }

  /**
   * Check if address is storage payment related
   */
  static isStoragePayment(address: Address): boolean {
    const addr = address.toHexString().toLowerCase();
    return addr == this.LIGHTHOUSE_PAYMENTS.toLowerCase();
  }

  /**
   * Check if address is USDFC protocol contract
   */
  static isProtocol(address: Address): boolean {
    const addr = address.toHexString().toLowerCase();

    return (
      addr == this.USDFC_TOKEN.toLowerCase() ||
      addr == this.TROVE_MANAGER.toLowerCase() ||
      addr == this.STABILITY_POOL.toLowerCase() ||
      addr == this.STAKING.toLowerCase()
    );
  }
}

/**
 * Ecosystem types for classification
 */
export enum EcosystemType {
  PROTOCOL_NATIVE = "PROTOCOL_NATIVE",
  DEX_ECOSYSTEM = "DEX_ECOSYSTEM",
  BRIDGE_ECOSYSTEM = "BRIDGE_ECOSYSTEM",
  DEFI_ECOSYSTEM = "DEFI_ECOSYSTEM",
  P2P_ECOSYSTEM = "P2P_ECOSYSTEM",
  INSTITUTIONAL_ECOSYSTEM = "INSTITUTIONAL_ECOSYSTEM",
  STORAGE_PAYMENT = "STORAGE_PAYMENT",
  UNKNOWN = "UNKNOWN"
}

/**
 * Transaction categories
 */
export enum TransactionCategory {
  // Protocol operations (V5 preserved)
  MINT = "MINT",
  BURN = "BURN",
  TRANSFER = "TRANSFER",
  APPROVAL = "APPROVAL",
  TROVE_OPERATION = "TROVE_OPERATION",
  LIQUIDATION = "LIQUIDATION",
  REDEMPTION = "REDEMPTION",
  STABILITY_OPERATION = "STABILITY_OPERATION",
  STAKING_OPERATION = "STAKING_OPERATION",

  // Ecosystem operations (V7 new)
  DEX_SWAP = "DEX_SWAP",
  DEX_LIQUIDITY = "DEX_LIQUIDITY",
  BRIDGE_TRANSFER = "BRIDGE_TRANSFER",
  P2P_TRANSFER = "P2P_TRANSFER",
  PROTOCOL_INTEGRATION = "PROTOCOL_INTEGRATION",
  FLASH_LOAN = "FLASH_LOAN",
  ARBITRAGE = "ARBITRAGE",
  COMPLEX_DEFI = "COMPLEX_DEFI",
  INSTITUTIONAL_OPERATION = "INSTITUTIONAL_OPERATION",
  STORAGE_PAYMENT = "STORAGE_PAYMENT",
  UNKNOWN = "UNKNOWN"
}

/**
 * Classify a USDFC transfer
 */
export class TransferClassifier {
  /**
   * Classify transfer based on from/to addresses and amount
   */
  static classify(
    from: Address,
    to: Address,
    amount: BigInt
  ): TransferClassification {
    let classification = new TransferClassification();

    // Check if zero address (mint/burn)
    const ZERO_ADDRESS = Address.fromString(
      "0x0000000000000000000000000000000000000000"
    );

    if (from.equals(ZERO_ADDRESS)) {
      classification.category = TransactionCategory.MINT;
      classification.ecosystem = EcosystemType.PROTOCOL_NATIVE;
      return classification;
    }

    if (to.equals(ZERO_ADDRESS)) {
      classification.category = TransactionCategory.BURN;
      classification.ecosystem = EcosystemType.PROTOCOL_NATIVE;
      return classification;
    }

    // Check DEX
    if (KnownContracts.isDEX(to) || KnownContracts.isDEX(from)) {
      classification.category = TransactionCategory.DEX_SWAP;
      classification.ecosystem = EcosystemType.DEX_ECOSYSTEM;
      return classification;
    }

    // Check Bridge
    if (KnownContracts.isBridge(to) || KnownContracts.isBridge(from)) {
      classification.category = TransactionCategory.BRIDGE_TRANSFER;
      classification.ecosystem = EcosystemType.BRIDGE_ECOSYSTEM;
      return classification;
    }

    // Check Lending
    if (KnownContracts.isLending(to) || KnownContracts.isLending(from)) {
      classification.category = TransactionCategory.PROTOCOL_INTEGRATION;
      classification.ecosystem = EcosystemType.DEFI_ECOSYSTEM;
      return classification;
    }

    // Check Storage Payment
    if (KnownContracts.isStoragePayment(to)) {
      classification.category = TransactionCategory.STORAGE_PAYMENT;
      classification.ecosystem = EcosystemType.STORAGE_PAYMENT;
      return classification;
    }

    // Check Protocol
    if (KnownContracts.isProtocol(to) || KnownContracts.isProtocol(from)) {
      classification.category = TransactionCategory.PROTOCOL_INTEGRATION;
      classification.ecosystem = EcosystemType.PROTOCOL_NATIVE;
      return classification;
    }

    // Check for institutional patterns (large transfers)
    const INSTITUTIONAL_THRESHOLD = BigInt.fromString("1000000000000000000000000"); // 1M USDFC
    if (amount.gt(INSTITUTIONAL_THRESHOLD)) {
      classification.category = TransactionCategory.INSTITUTIONAL_OPERATION;
      classification.ecosystem = EcosystemType.INSTITUTIONAL_ECOSYSTEM;
      return classification;
    }

    // Default to P2P transfer
    classification.category = TransactionCategory.P2P_TRANSFER;
    classification.ecosystem = EcosystemType.P2P_ECOSYSTEM;

    return classification;
  }

  /**
   * Get readable description of classification
   */
  static getDescription(classification: TransferClassification): string {
    if (classification.ecosystem == EcosystemType.DEX_ECOSYSTEM) {
      return "DEX Swap on SushiSwap";
    } else if (classification.ecosystem == EcosystemType.BRIDGE_ECOSYSTEM) {
      return "Cross-chain bridge transfer";
    } else if (classification.ecosystem == EcosystemType.DEFI_ECOSYSTEM) {
      return "DeFi protocol interaction";
    } else if (classification.ecosystem == EcosystemType.STORAGE_PAYMENT) {
      return "Storage payment (Lighthouse)";
    } else if (classification.ecosystem == EcosystemType.PROTOCOL_NATIVE) {
      return "USDFC protocol operation";
    } else if (classification.ecosystem == EcosystemType.INSTITUTIONAL_ECOSYSTEM) {
      return "Institutional-scale transfer";
    } else {
      return "Peer-to-peer transfer";
    }
  }
}

/**
 * Transfer classification result
 */
export class TransferClassification {
  category: string = TransactionCategory.UNKNOWN;
  ecosystem: string = EcosystemType.UNKNOWN;
}
