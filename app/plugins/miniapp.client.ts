import { sdk } from '@farcaster/miniapp-sdk'

export default defineNuxtPlugin(() => {
  // Signal to the host app (Base/Warpcast) that our app is ready
  sdk.actions.ready()
})
