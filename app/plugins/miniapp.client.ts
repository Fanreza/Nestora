import { sdk } from '@farcaster/miniapp-sdk'
import { connect, getAccount } from '@wagmi/core'
import { miniAppWagmiConfig } from '~/config/wagmi-miniapp'
import { usePrivyAuth } from '~/composables/usePrivy'

export default defineNuxtPlugin(() => {
  // Not in an iframe → not a mini app
  if (typeof window === 'undefined' || window === window.parent) return

  // Set mini app flag synchronously so privy plugin skips
  const auth = usePrivyAuth()
  auth.markAsMiniApp()

  // Signal ready immediately so splash screen dismisses
  sdk.actions.ready().catch(() => {})

  // Auto-connect wallet in background — MUST be non-blocking
  const connector = miniAppWagmiConfig.connectors[0]
  if (!connector) return

  // Race: connect wallet vs 10s timeout
  const connectPromise = connect(miniAppWagmiConfig, { connector })
    .then(async () => {
      const account = getAccount(miniAppWagmiConfig)
      if (account.address) {
        const provider = await connector.getProvider()
        auth.connectWithFarcasterProvider(provider, account.address)
        return true
      }
      return false
    })

  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 10000))

  Promise.race([connectPromise, timeout])
    .then((connected) => {
      if (!connected) {
        console.warn('[miniapp] auto-connect timed out or failed, showing app anyway')
        // Set isReady so app renders (will show sign-in as fallback)
        auth.connectWithFarcasterProvider(null as any, '')
      }
    })
    .catch((e) => {
      console.warn('[miniapp] auto-connect failed:', e)
    })
})
