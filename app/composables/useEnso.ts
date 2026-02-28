import { EnsoClient } from '@ensofinance/sdk'
import type { Strategy } from '~/config/strategies'

const NATIVE_TOKEN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' as const
const BASE_CHAIN_ID = 8453

export interface TokenBalance {
  amount: string
  decimals: number
  token: string
  price: string
  name: string
  symbol: string
  logoUri: string
}

let ensoClient: EnsoClient | null = null

function getClient(): EnsoClient {
  if (ensoClient) return ensoClient
  const config = useRuntimeConfig()
  const apiKey = config.public.ensoApiKey as string
  if (!apiKey) throw new Error('Missing Enso API key in runtimeConfig')
  ensoClient = new EnsoClient({ apiKey })
  return ensoClient
}

export interface ZapQuote {
  amountOut: string
  gas: string
  tx: {
    to: string
    data: string
    from: string
    value: string
  }
  route: any[]
  priceImpact: string | null
}

export function useEnso() {
  const loading = ref(false)
  const error = ref('')

  function tokenAddress(strategy: Strategy): `0x${string}` {
    return strategy.type === 'native' ? NATIVE_TOKEN : strategy.assetAddress
  }

  async function getZapQuote(
    tokenIn: `0x${string}`,
    strategy: Strategy,
    amountIn: string,
    fromAddress: `0x${string}`,
  ): Promise<ZapQuote | null> {
    loading.value = true
    error.value = ''

    try {
      const client = getClient()
      const vaultAsset = tokenAddress(strategy)

      // If tokenIn is the same as vault underlying, no zap needed
      if (tokenIn.toLowerCase() === vaultAsset.toLowerCase()) {
        return null
      }

      const routeData = await client.getRouteData({
        fromAddress,
        chainId: BASE_CHAIN_ID,
        amountIn: [amountIn],
        tokenIn: [tokenIn],
        tokenOut: [strategy.vaultAddress],
        slippage: '300', // 3%
        routingStrategy: 'router',
      })

      return {
        amountOut: String(routeData.amountOut),
        gas: String(routeData.gas),
        tx: {
          to: routeData.tx.to,
          data: routeData.tx.data,
          from: routeData.tx.from,
          value: String(routeData.tx.value),
        },
        route: routeData.route,
        priceImpact: routeData.priceImpact ? String(routeData.priceImpact) : null,
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to get zap quote'
      console.error('[useEnso] getZapQuote error:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function getApprovalTx(
    tokenIn: `0x${string}`,
    amount: string,
    fromAddress: `0x${string}`,
  ) {
    try {
      const client = getClient()
      return await client.getApprovalData({
        fromAddress,
        chainId: BASE_CHAIN_ID,
        tokenAddress: tokenIn,
        amount,
      })
    } catch (e: any) {
      console.error('[useEnso] getApprovalTx error:', e)
      return null
    }
  }

  async function getWalletBalances(address: `0x${string}`, crossChain = false): Promise<TokenBalance[]> {
    try {
      const client = getClient()
      const result = await client.getBalances({
        chainId: crossChain ? 'all' : BASE_CHAIN_ID,
        eoaAddress: address,
        useEoa: true,
      })
      return (result as any[]).map((b: any) => ({
        amount: String(b.amount),
        decimals: b.decimals,
        token: b.token,
        price: String(b.price ?? '0'),
        name: b.name ?? '',
        symbol: b.symbol ?? '',
        logoUri: b.logoUri ?? '',
      }))
    } catch (e: any) {
      console.error('[useEnso] getWalletBalances error:', e)
      return []
    }
  }

  return {
    loading,
    error,
    getZapQuote,
    getApprovalTx,
    getWalletBalances,
    NATIVE_TOKEN,
  }
}
