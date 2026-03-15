# Nestora — Knowledge Base

## Overview

**Nestora** is a goal-based onchain savings application built on Base, powered by YO Protocol's ERC-4626 yield vaults. It abstracts DeFi complexity behind a familiar savings app experience, allowing users to create named savings goals ("pockets"), deposit any token, and earn yield automatically — no DeFi knowledge required.

**Website**: https://nestora.aethereal.top
**Twitter/X**: https://x.com/nestora_app

---

## How Nestora Works

### The Pocket System

Nestora organizes savings into **pockets** — named containers with a goal, strategy, and optional target amount.

**Creating a Pocket:**
1. Choose a name (e.g., "Emergency Fund", "Vacation 2026")
2. Set a purpose or description (optional)
3. Set a target amount in USD (optional)
4. Set a timeline (optional)
5. Pick a strategy: Conservative, Balanced, or Aggressive

Each pocket maps to one YO Protocol vault. Users can have multiple pockets with different strategies.

### Strategies

| Strategy | Label | Risk | Vault | Asset | Decimals |
|----------|-------|------|-------|-------|----------|
| Conservative | Savings | Low | yoUSD | USDC | 6 |
| Balanced | Growth | Medium | yoBTC | cbBTC | 8 |
| Aggressive | High Growth | High | yoETH | WETH | 18 |

**Conservative (Savings)**
- Underlying: USDC (stablecoin pegged to US Dollar)
- Vault token: yoUSD
- Yield: Steady interest, minimal price risk
- Best for: Emergency funds, short-term savings, risk-averse users
- Estimated downturn impact: -2%

**Balanced (Growth)**
- Underlying: cbBTC (Coinbase Wrapped Bitcoin)
- Vault token: yoBTC
- Yield: Bitcoin appreciation + vault yield
- Best for: Long-term BTC believers, moderate risk tolerance
- Estimated downturn impact: -20%

**Aggressive (High Growth)**
- Underlying: WETH (Wrapped Ethereum)
- Vault token: yoETH
- Yield: Ethereum appreciation + vault yield
- Best for: Experienced investors, long time horizons
- Estimated downturn impact: -30%

---

## Deposit Flow

### Direct Deposit
When the deposited token matches the vault's underlying asset:
1. User enters amount
2. Nestora checks if vault is active (not paused)
3. Token approval to YO Gateway (if needed)
4. Deposit via YO Gateway → user receives vault shares (yoUSD/yoBTC/yoETH)
5. Yield starts accruing immediately

### Zap Deposit (Any Token)
When the deposited token differs from the vault's underlying:
1. User selects any token from their wallet
2. Enso Finance finds the best swap route
3. Preview shows: input amount → estimated output → estimated vault shares
4. Single transaction: swap + deposit
5. Slippage tolerance: 3%

**Supported input tokens**: Any ERC-20 token on Base, plus native ETH.

---

## Withdrawal Flow

### Direct Withdrawal
Redeems vault shares for the underlying asset:
1. User enters amount or selects percentage (10%, 25%, 50%, 75%, MAX)
2. Nestora tries YO Gateway redemption first
3. If gateway liquidity is insufficient, falls back to direct vault redemption
4. User receives the underlying asset (USDC, cbBTC, or WETH)

### Zap Withdrawal (To Any Token)
Redeems and swaps to any desired token:
1. User selects output token
2. Enso Finance provides swap route from vault shares → desired token
3. Approval of vault shares to Enso router
4. Single transaction: redeem + swap

### Withdrawal Notes
- Withdrawals are usually instant
- In rare cases, withdrawals may be queued if vault liquidity is low
- No penalties or fees for withdrawal

---

## Vault Switching

Users can switch a pocket from one strategy to another in a single flow:
1. Select pocket → Switch Strategy
2. Choose new strategy
3. Nestora redeems from old vault and deposits into new vault
4. Executed as a swap via Enso (old vault token → new vault token)
5. Pocket's strategy is updated in the database

---

## Merkl Rewards

YO Protocol distributes YO token rewards to vault depositors through Merkl's distribution system.

**How it works:**
- Rewards accumulate automatically while funds are in vaults
- Dashboard shows claimable rewards with per-token breakdown
- One-tap claim sends rewards to user's wallet
- Rewards are fetched 3 seconds after wallet connection (to avoid RPC rate limiting)

**Claiming process:**
1. Nestora fetches claimable rewards via YO SDK
2. User clicks "Claim" on the rewards banner
3. YO SDK prepares the claim transaction
4. User approves in wallet
5. Rewards sent to user's address

---

## Preview Estimates

Before confirming any transaction, users see real-time estimates:
- **Deposit preview**: "You'll receive ~X yoUSD/yoBTC/yoETH"
- **Withdraw preview**: "You'll receive ~X USDC/cbBTC/WETH"
- Powered by ERC-4626's `previewDeposit()` and `previewRedeem()` functions
- Updated with 500ms debounce as user types

---

## Authentication & Wallet Connection

Nestora supports multiple sign-in methods via Privy:

**For non-crypto users:**
- Email (OTP verification) → embedded wallet created automatically
- Google OAuth → embedded wallet
- Twitter/X OAuth → embedded wallet
- Discord OAuth → embedded wallet
- Farcaster → embedded wallet

**For crypto users:**
- MetaMask
- Rabby Wallet
- Coinbase Wallet
- WalletConnect (QR scan for mobile wallets)
- Any EIP-6963 compatible wallet

**Session management:**
- Login persists across page refreshes
- Wallet address stored locally for session restoration
- Switching wallets updates the active address without logout

---

## Deposit Reminders

Users can set recurring deposit reminders on any pocket:
- Choose a day of the month (1-28)
- Set a reminder amount
- Nestora notifies when it's time to deposit
- Reminders can be modified or removed anytime

---

## Portfolio Tracking

**Dashboard displays:**
- Total portfolio value in USD
- Number of active pockets
- Per-pocket: current value, strategy, APY, profit/loss
- Available wallet balance (tokens not in vaults)

**Earnings breakdown (per pocket):**
- Principal deposited (total deposits - total withdrawals)
- Yield earned (current value - principal)
- Yield contribution percentage
- Estimated 1-year value based on current APY

**Data sources:**
- Position values: On-chain vault share balances × conversion rate
- Asset prices: DeFiLlama API (5-minute cache)
- APY: YO API vault snapshots (7-day average, fallback to 30-day)
- Transaction history: Supabase database

---

## Technical Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Nuxt 4, Vue 3 Composition API, TypeScript |
| Styling | Tailwind CSS v4, shadcn-vue |
| State | Pinia stores |
| Auth | Privy JS SDK Core |
| Blockchain | Viem, Base (chain ID: 8453) |
| Yield | YO Protocol SDK (@yo-protocol/core), ERC-4626 |
| Routing/Swap | Enso Finance API |
| Pricing | DeFiLlama API |
| Database | Supabase (PostgreSQL) |
| PWA | @vite-pwa/nuxt, Workbox |

**Key addresses on Base:**
- yoUSD vault: `0x0000000f2eb9f69274678c76222b35eec7588a65`
- yoBTC vault: `0xbcbc8cb4d1e8ed048a6276a5e94a3e952660bcbc`
- yoETH vault: `0x3a43aec53490cb9fa922847385d82fe25d0e9de7`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- cbBTC: `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`
- WETH: `0x4200000000000000000000000000000000000006`

---

## Self-Custodial & Security

- **No custody**: Nestora never holds user funds. All assets remain in user wallets and vaults.
- **No lock-ups**: Withdraw anytime, no penalties.
- **Audited vaults**: YO Protocol vaults are ERC-4626 compliant.
- **No private keys**: Nestora never asks for or stores seed phrases or private keys.
- **Base L2**: Low gas fees (typically < $0.01 per transaction).

---

## About YO Protocol

YO Protocol is a yield vault protocol that provides ERC-4626 compliant vaults across Ethereum, Base, and Arbitrum. Nestora uses YO vaults on Base.

**Vault mechanics:**
- Users deposit assets → receive yield-bearing vault tokens
- Vault tokens (yoUSD, yoBTC, yoETH) increase in value over time
- Yield is generated from DeFi strategies (lending, LP, etc.)
- All operations go through YO Gateway for optimized execution

**YO SDK capabilities used by Nestora:**
- Deposit and redeem operations
- Share balance and value conversion
- Preview estimates
- Vault snapshot data (APY, TVL)
- Merkl reward detection and claiming
- Transaction receipt tracking

---

## Frequently Asked Questions

**Is Nestora free to use?**
Yes. Nestora charges no fees. Users only pay Base gas fees (very low) and potential swap slippage on zap operations.

**What happens if a vault is paused?**
Deposits are blocked. Withdrawals may still be possible through direct vault redemption. Nestora shows a warning if a vault is paused.

**Can I use Nestora on mobile?**
Yes. Nestora is a Progressive Web App (PWA). Install it from your browser for a native app experience. Connect mobile wallets via WalletConnect QR code.

**What is ERC-4626?**
A standardized interface for yield-bearing vaults on Ethereum. It ensures compatibility and composability across DeFi protocols.

**What is Base?**
Base is Coinbase's Layer 2 blockchain built on Ethereum. It offers low fees and fast transactions while inheriting Ethereum's security.

**How do I get tokens on Base?**
Use the "Fund Wallet" button in Nestora to onramp via MoonPay, or bridge tokens from Ethereum mainnet using the Base Bridge.

**What if my transaction fails?**
Check your ETH balance for gas. Try refreshing the page and reconnecting your wallet. If the issue persists, the vault may be temporarily paused.
