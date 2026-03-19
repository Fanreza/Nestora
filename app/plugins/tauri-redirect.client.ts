// In Tauri native app, skip landing page → go straight to /app
export default defineNuxtPlugin(() => {
  const isTauri = '__TAURI_INTERNALS__' in window
  if (!isTauri) return

  const router = useRouter()
  router.beforeEach((to) => {
    if (to.path === '/') {
      return '/app'
    }
  })
})
