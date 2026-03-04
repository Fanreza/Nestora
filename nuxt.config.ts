import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4,
  },

  ssr: false,

  runtimeConfig: {
    ensoApiKey: '',
    supabaseUrl: '',
    supabaseKey: '',
    public: {
      privyAppId: '',
      privyClientId: '',
      walletConnectProjectId: '',
      moonpayApiKey: '',
    },
  },

  modules: ['@pinia/nuxt', 'shadcn-nuxt', '@nuxt/icon', '@nuxt/fonts'],

  shadcn: {
    prefix: '',
    componentDir: './app/components/ui',
  },

  fonts: {
    families: [
      { name: 'Plus Jakarta Sans', provider: 'google', weights: [400, 500, 600, 700, 800] },
    ],
  },

  css: ['~/assets/css/tailwind.css'],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['@coinbase/wallet-sdk', '@privy-io/js-sdk-core'],
    },
  },

  app: {
    head: {
      htmlAttrs: { class: 'dark' },
      title: 'Nestora',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'description', content: 'DeFi savings app on Base. Create pockets, set goals, earn yield. No DeFi knowledge needed.' },
        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://nestora.aethereal.top' },
        { property: 'og:title', content: 'Nestora — Smart Savings on Base' },
        { property: 'og:description', content: 'Create pockets, set goals, earn yield. Deposit any token into yield-bearing vaults. No DeFi knowledge needed.' },
        { property: 'og:image', content: 'https://nestora.aethereal.top/logo.png' },
        { property: 'og:site_name', content: 'Nestora' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Nestora — Smart Savings on Base' },
        { name: 'twitter:description', content: 'Create pockets, set goals, earn yield. Deposit any token into yield-bearing vaults. No DeFi knowledge needed.' },
        { name: 'twitter:image', content: 'https://nestora.aethereal.top/logo.png' },
        // Base
        { name: 'base:app_id', content: '69a8116ef1a340127fafeb96' },
        // Theme
        { name: 'theme-color', content: '#10B981' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'apple-touch-icon', href: '/logo.png' },
        { rel: 'canonical', href: 'https://nestora.aethereal.top' },
      ],
    },
  },

  nitro: {
    externals: {
      inline: ['jspdf', 'jspdf-autotable'],
    },
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'SAMEORIGIN',
          'Content-Security-Policy': "frame-ancestors 'self' https://auth.privy.io https://*.privy.io",
        },
      },
    },
  },

  compatibilityDate: '2025-01-01',
})
