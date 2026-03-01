# <img width="204" height="204" alt="logo" src="https://github.com/user-attachments/assets/26173df0-142e-4369-8321-9bfa9f206f3f" />
Nestora

> _Named after Nestor, the Greek sage whose name means "the one who returns" — Nestora helps your wealth return to you, grown._

DeFi savings app on Base. Create pockets, set goals, earn yield. No DeFi knowledge needed.

## Features

- **Pockets** — Named savings jars with target amount, timeline, and risk level
- **Any-token deposit** — Deposit ETH, USDC, or any token. Enso routes the swap automatically
- **3 strategies** — Savings (USDC/yoUSD), Growth (cbBTC/yoBTC), High Growth (WETH/yoETH)
- **Live APY & profit tracking** — Vault yield data (1d/7d/30d) and unrealized profit from Yo Protocol API
- **USD progress tracking** — Target progress based on real-time asset prices via DeFiLlama
- **Multi-auth login** — Email, Google, Twitter, Discord, Farcaster, or external wallets (MetaMask, Coinbase, etc.)
- **Smart wallet support** — Coinbase Smart Wallet with account abstraction
- **Risk quiz** — AI-assisted strategy recommendation based on a quick risk assessment quiz
- **Export** — CSV, PDF, and image export for tax reports and transaction history
- **Profile** — ENS resolution, custom display names, wallet management per login method
- **Share card** — Shareable pocket progress cards for social media

## Tech

| Layer      | Stack                                                  |
| ---------- | ------------------------------------------------------ |
| Framework  | Nuxt 3, Vue 3 Composition API, TypeScript              |
| Styling    | Tailwind CSS v4, shadcn-vue                            |
| Auth       | Privy (`@privy-io/js-sdk-core`) — email, OAuth, SIWE, Farcaster |
| Blockchain | viem, Base (8453)                                      |
| Yield      | Yo Protocol SDK (`@yo-protocol/core`), ERC-4626 vaults |
| Routing    | Enso Finance (swap + deposit in one tx)                |
| Pricing    | DeFiLlama `coins.llama.fi`                             |
| Database   | Supabase (users, pockets, transactions)                |
| State      | Pinia                                                  |

## Architecture

```
app/
├── pages/
│   ├── index.vue          # Landing page (hero, features, strategies, FAQ)
│   ├── app.vue            # Dashboard — pocket grid, create/deposit dialogs
│   ├── profile.vue        # Profile settings, wallet management
│   ├── pocket/[id].vue    # Pocket detail — history, progress, share card
│   └── auth/callback.vue  # OAuth callback handler
├── composables/
│   ├── usePrivy.ts        # Auth: login flows, session, wallet clients
│   ├── useVault.ts        # Yo SDK: deposit, redeem, share balance, APY
│   ├── useEnso.ts         # Enso: zap quotes, approvals, wallet balances
│   ├── useBalances.ts     # ETH/token balance polling (30s interval)
│   ├── useDepositFlow.ts  # Multi-step deposit/withdraw orchestration
│   ├── useWalletTokens.ts # Wallet token list with USD values
│   └── useCoinGecko.ts    # DeFiLlama price fetching (5min cache)
├── stores/
│   └── useProfileStore.ts # Pinia: user, pockets, positions, APY, profits
├── config/
│   ├── strategies.ts      # Strategy definitions (conservative/balanced/aggressive)
│   └── privy.ts           # Privy singleton + Base chain config
└── components/
    ├── app/               # App components (dialogs, cards, header)
    ├── landing/           # Marketing landing page sections
    └── ui/                # shadcn-vue primitives (30+ components)

server/
└── api/
    ├── users/             # User CRUD (ensure, get, patch)
    ├── pockets/           # Pocket CRUD (list, create, update, delete)
    ├── transactions/      # Transaction recording + PDF export
    └── enso/              # Enso Finance proxy (route, approval, balances)
```

## Authentication

Nestora uses [Privy](https://privy.io) for flexible authentication:

| Method | Wallet | Flow |
| ------ | ------ | ---- |
| Email | Embedded (Privy) | OTP verification |
| Google, Twitter, Discord | Embedded (Privy) | OAuth redirect |
| Farcaster | Embedded (Privy) | Sign-In with Farcaster (SIWF) |
| MetaMask, Rabby, etc. | External (browser) | Sign-In with Ethereum (SIWE) |
| Coinbase Smart Wallet | Smart account | Account abstraction via Coinbase SDK |

External wallets are auto-detected via [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) and reconnected across page refreshes.

## Strategies

| Strategy | Asset | Vault | Risk | Best for |
| -------- | ----- | ----- | ---- | -------- |
| Savings | USDC | yoUSD | Low | Emergency funds, short-term savings |
| Growth | cbBTC | yoBTC | Medium | Long-term Bitcoin believers |
| High Growth | WETH | yoETH | High | Experienced investors, long horizon |

All vaults are ERC-4626 compliant, powered by [Yo Protocol](https://yo.xyz). Deposits and withdrawals go through the Yo Gateway contract.

## Risk

This is an experimental DeFi application. Funds deposited into vaults are subject to:

- **Smart contract risk** — Yo Protocol vault contracts could contain bugs or be exploited
- **Market risk** — ETH and BTC strategies are exposed to asset price volatility
- **Protocol risk** — Underlying yield sources (lending, staking) carry their own risks
- **Bridge/routing risk** — Enso zap transactions route through third-party DEXs
- **No deposit insurance** — This is not a bank. There is no FDIC or equivalent protection

Use at your own risk. Only deposit what you can afford to lose.

## Setup

```bash
npm install
cp .env.example .env  # fill in keys below
npm run dev
```

### Environment variables

```env
NUXT_SUPABASE_URL=        # Supabase project URL
NUXT_SUPABASE_KEY=        # Supabase anon key
NUXT_ENSO_API_KEY=        # Enso Finance API key
NUXT_PUBLIC_PRIVY_APP_ID=       # Privy app ID
NUXT_PUBLIC_PRIVY_CLIENT_ID=    # Privy client ID
NUXT_PUBLIC_WALLETCONNECT_PROJECT_ID=  # WalletConnect project ID
```

## License

MIT
