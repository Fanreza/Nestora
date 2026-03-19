// Handle deep links from system browser OAuth callback
// nestora://auth?code=xxx&state=xxx&provider=google
export default defineNuxtPlugin(() => {
  const isTauri = '__TAURI_INTERNALS__' in window
  if (!isTauri) return

  // Listen for deep link events
  import('@tauri-apps/plugin-deep-link').then(({ onOpenUrl }) => {
    onOpenUrl(async (urls: string[]) => {
      for (const urlStr of urls) {
        try {
          // Parse deep link: nestora://auth?code=xxx&state=xxx&provider=google
          const url = new URL(urlStr)
          if (url.host !== 'auth') continue

          const code = url.searchParams.get('code')
          const state = url.searchParams.get('state')
          const provider = url.searchParams.get('provider')

          if (!code || !state) continue

          console.log('[deep-link] OAuth callback received, completing login...')

          // Store provider if provided
          if (provider) {
            localStorage.setItem('privy_oauth_provider', provider)
          }

          // Complete the OAuth login
          const { usePrivyAuth } = await import('~/composables/usePrivy')
          const { completeOAuthLogin } = usePrivyAuth()
          await completeOAuthLogin(code, state)

          // Navigate to app
          const router = useRouter()
          router.push('/app')
        } catch (e) {
          console.error('[deep-link] Failed to handle auth callback:', e)
        }
      }
    })
  }).catch(() => {
    // Not in Tauri or plugin not available
  })
})
