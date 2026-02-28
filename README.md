# Nestora

> _Named after Nestor, the Greek sage whose name means "the one who returns" — Nestora helps your wealth return to you, grown._

DeFi savings app on Base. Create pockets, set goals, earn yield. No DeFi knowledge needed.

## Features

- **Pockets** — Named savings jars with target amount, timeline, and risk level
- **Any-token deposit** — Deposit ETH, USDC, or any token. Enso routes the swap automatically
- **3 strategies** — Savings (USDC/yoUSD), Growth (cbBTC/yoBTC), High Growth (WETH/yoETH)
- **Live APY & profit tracking** — Vault yield data and unrealized profit from Yo Protocol API
- **USD progress tracking** — Target progress based on real-time asset prices via DeFiLlama
- **Wallet + Smart Account** — MetaMask, Coinbase Wallet, or Coinbase Smart Account

## Tech

| Layer     | Stack                                                  |
| --------- | ------------------------------------------------------ |
| Framework | Nuxt 3, Vue 3 Composition API                          |
| Styling   | Tailwind CSS v4, shadcn-vue                            |
| Wallet    | wagmi/viem, Base (8453)                                |
| Yield     | Yo Protocol SDK (`@yo-protocol/core`), ERC-4626 vaults |
| Routing   | Enso Finance (swap + deposit in one tx)                |
| Pricing   | DeFiLlama `coins.llama.fi`                             |
| Database  | Supabase (users, pockets, transactions)                |
| State     | Pinia                                                  |

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
cp .env.example .env  # fill in Supabase + Enso keys
npm run dev
```

## License

MIT
