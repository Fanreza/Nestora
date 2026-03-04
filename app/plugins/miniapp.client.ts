import { sdk } from '@farcaster/miniapp-sdk'
import { connect, getAccount } from '@wagmi/core'
import { miniAppWagmiConfig } from '~/config/wagmi-miniapp'
import { usePrivyAuth } from '~/composables/usePrivy'

export default defineNuxtPlugin(() => {
  // Not in an iframe → not a mini app
  if (typeof window === 'undefined' || window === window.parent) return

  // Set mini app flag synchronously so privy plugin skips
  const { markAsMiniApp, connectWithFarcasterProvider } = usePrivyAuth()
  markAsMiniApp()

  // Signal ready immediately so splash screen dismisses
  sdk.actions.ready().catch(() => {})

  // Auto-connect wallet in background — MUST be non-blocking
  // otherwise the async Comlink RPC hangs and Nuxt never mounts
  const connector = miniAppWagmiConfig.connectors[0]
  if (!connector) return

  connect(miniAppWagmiConfig, { connector })
    .then(async () => {
      const account = getAccount(miniAppWagmiConfig)
      if (account.address) {
        const provider = await connector.getProvider()
        connectWithFarcasterProvider(provider, account.address)
      }
    })
    .catch((e) => {
      console.warn('[miniapp] auto-connect failed:', e)
    })
})
