# USDFC Subgraph

GraphQL indexing for USDFC stablecoin on Filecoin. Deployed on Goldsky.

## Live Endpoint

**GraphQL API:**
```
https://api.goldsky.com/api/public/project_cmj1jnhy32wne01te2dha018t/subgraphs/usdfc/v5/gn
```

**Status:** v5 deployed and synced (block 5,630,948+, no indexing errors)

## Available Entities

| Entity | Description |
|--------|-------------|
| `transfers` | USDFC token transfers |
| `mints` | Token mint events |
| `burns` | Token burn events |
| `approvals` | Token approvals |
| `accounts` | Unique addresses |
| `troves` | Collateralized debt positions |
| `troveOperations` | Trove open/close/adjust events |
| `liquidations` | Trove liquidation events |
| `redemptions` | USDFC redemption events |
| `stabilityDeposits` | Stability pool deposits |
| `stabilityOperations` | Stability pool operations |
| `protocolTokenStakes` | Protocol token staking |
| `stakeOperations` | Staking operations |
| `protocolStats` | Global protocol statistics |
| `dailyStats` | Daily aggregated stats |
| `priceUpdates` | Price feed updates |

## Example Queries

### Recent Transfers
```graphql
{
  transfers(first: 10, orderBy: blockNumber, orderDirection: desc) {
    id
    from
    to
    value
    blockNumber
  }
}
```

### Active Troves
```graphql
{
  troves(where: { status: "OPEN" }) {
    id
    owner
    collateral
    debt
    status
  }
}
```

### Subgraph Status
```graphql
{
  _meta {
    block { number }
    hasIndexingErrors
  }
}
```

## Quick Start

```bash
# Install dependencies
npm install

# Generate types from schema
npm run codegen

# Build subgraph
npm run build
```

## Contract Addresses (Filecoin Mainnet)

| Contract | Address |
|----------|---------|
| USDFC Token | `0x80B98d3aa09ffff255c3ba4A241111Ff1262F045` |
| TroveManager | `0x5aB87c2398454125Dd424425e39c8909bBE16022` |
| StabilityPool | `0x791Ad78bBc58324089D3E0A8689E7D045B9592b5` |
| ProtocolTokenStaking | `0xc8707b3d426E7D7A0706C48dcd1A4b83bc220dB3` |
| PriceFeed | `0xFc1EfC3b28cE1a72cDe1fd6A9C4B2E37d0A9c752` |

## Deployment Timeline

| Event | Block | Date |
|-------|-------|------|
| USDFC Token Deploy | 4,807,452 | March 21, 2025 |
| First Transfer | 4,807,947 | March 21, 2025 |
| SushiSwap USDFC/axlUSDC Pool | 4,819,399 | March 2025 |
| First Trove Operation | 4,856,023 | March 2025 |
| SushiSwap USDFC/WFIL Pool | 5,245,708 | April 2025 |
| Current Sync | 5,630,948+ | December 2025 |

## Version Endpoints

| Version | Status | URL |
|---------|--------|-----|
| v5 | Production | https://api.goldsky.com/api/public/project_cmj1jnhy32wne01te2dha018t/subgraphs/usdfc/v5/gn |
| v7 | Staging | https://api.goldsky.com/api/public/project_cmj1jnhy32wne01te2dha018t/subgraphs/usdfc/v7/gn |
| v0 | Latest | https://api.goldsky.com/api/public/project_cmj1jnhy32wne01te2dha018t/subgraphs/usdfc/v0/gn |

## Known Issues (v5)

Some entity fields require refinement:
- `Account.balance` and `Account.transferCount` not yet populated
- `ProtocolStats.activeTroves` field pending
- Mint/burn events may be empty for some periods

These are being addressed in future versions.

## Architecture

```
src/
├── core/           # Universal transaction handling
├── protocol/       # Trove, StabilityPool, Staking handlers
├── ecosystem/      # DEX, Bridge integrations
└── utils/          # Helpers and constants
```

## License

MIT
