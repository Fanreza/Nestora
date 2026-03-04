import { sdk } from '@farcaster/miniapp-sdk'
import { connect, getAccount } from '@wagmi/core'
import { miniAppWagmiConfig } from '~/config/wagmi-miniapp'
import { usePrivyAuth } from '~/composables/usePrivy'

export default defineNuxtPlugin(async () => {
  // Quick check: not in an iframe → not a mini app
  if (typeof window === 'undefined' || window === window.parent) return

  try {
    // Auto-connect using the farcasterMiniApp connector (first in config)
    const connector = miniAppWagmiConfig.connectors[0]
    await connect(miniAppWagmiConfig, { connector })

    const account = getAccount(miniAppWagmiConfig)
    if (account.address) {
      // Get the EIP-1193 provider from the connected connector
      const provider = await connector.getProvider()

      const { connectWithFarcasterProvider } = usePrivyAuth()
      connectWithFarcasterProvider(provider, account.address)
    }
  } catch (e) {
    console.warn('[miniapp] auto-connect failed:', e)
  }

  // Signal ready to dismiss splash screen
  sdk.actions.ready().catch(() => {})
})
