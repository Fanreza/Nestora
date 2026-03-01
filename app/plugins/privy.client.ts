import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { getPrivy } from '~/config/privy'
import { usePrivyAuth } from '~/composables/usePrivy'

export default defineNuxtPlugin(async (nuxtApp) => {
  // Keep VueQuery for data fetching
  const queryClient = new QueryClient()
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })

  // Initialize Privy singleton
  const privy = getPrivy()

  // Mount hidden iframe for embedded wallet
  const iframeUrl = privy.embeddedWallet.getURL()
  const iframeOrigin = new URL(iframeUrl).origin

  const iframe = document.createElement('iframe')
  iframe.src = iframeUrl
  iframe.style.display = 'none'
  iframe.id = 'privy-iframe'
  iframe.allow = 'clipboard-read; clipboard-write'
  document.body.appendChild(iframe)

  let iframeReady = false

  // Wire up postMessage communication
  iframe.addEventListener('load', () => {
    if (iframe.contentWindow) {
      privy.setMessagePoster(iframe.contentWindow)
    }
    iframeReady = true

    // Restore session after iframe is ready
    const { restoreSession } = usePrivyAuth()
    restoreSession()
  })

  window.addEventListener('message', (e: MessageEvent) => {
    // Only handle messages from the Privy iframe after it's ready
    if (!iframeReady || e.origin !== iframeOrigin) return
    try {
      privy.embeddedWallet.onMessage(e.data)
    } catch {
      // Ignore malformed messages
    }
  })

  return {
    provide: { privy },
  }
})
