// Capture ?ref=CODE from URL and store in localStorage
// Applied later when user connects wallet (in useProfileStore.loadProfile)
export default defineNuxtPlugin(() => {
  const route = useRoute()
  const refCode = route.query.ref as string | undefined
  if (refCode) {
    localStorage.setItem('nestora_referral_code', refCode.toUpperCase())
  }
})
