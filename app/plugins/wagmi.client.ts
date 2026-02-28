import { WagmiPlugin } from '@wagmi/vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { wagmiConfig } from '~/config/wagmi'

export default defineNuxtPlugin((nuxtApp) => {
  const queryClient = new QueryClient()
  nuxtApp.vueApp.use(WagmiPlugin, { config: wagmiConfig })
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
})
