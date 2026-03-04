import { sdk } from '@farcaster/miniapp-sdk'
import { usePrivyAuth } from '~/composables/usePrivy'

export default defineNuxtPlugin(async () => {
  // Quick check: not in an iframe → not a mini app
  if (typeof window === 'undefined' || window === window.parent) return

  try {
    // Get the Farcaster wallet provider and user's address
    const provider = await sdk.wallet.getEthereumProvider()
    if (provider) {
      const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' })
      if (accounts?.[0]) {
        const { connectWithFarcasterProvider } = usePrivyAuth()
        connectWithFarcasterProvider(provider, accounts[0])
      }
    }
  } catch (e) {
    console.warn('[miniapp] auto-connect failed:', e)
  }

  // Signal ready to dismiss splash screen
  sdk.actions.ready().catch(() => {})
})
