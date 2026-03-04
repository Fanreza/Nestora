import { sdk } from '@farcaster/miniapp-sdk'

export default defineNuxtPlugin((nuxtApp) => {
  // Signal ready after the Vue app is fully mounted
  nuxtApp.hook('app:mounted', () => {
    sdk.actions.ready()
  })
})
