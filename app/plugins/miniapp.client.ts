import { sdk } from '@farcaster/miniapp-sdk'

export default defineNuxtPlugin(async () => {
  // Call ready immediately — the host needs this signal ASAP
  // Don't gate on app:mounted; the SDK only needs window.parent to exist
  try {
    await sdk.actions.ready()
  } catch (e) {
    console.warn('[miniapp] sdk.actions.ready() failed:', e)
  }
})
