import { sdk } from '@farcaster/miniapp-sdk'

export default defineNuxtPlugin(() => {
  // Fire-and-forget: do NOT await — Comlink waits for host response
  // which can block Nuxt initialization if the host isn't ready yet
  sdk.actions.ready().then(() => {
    console.log('[miniapp] ready signal acknowledged by host')
  }).catch((e) => {
    console.warn('[miniapp] sdk.actions.ready() error:', e)
  })
})
