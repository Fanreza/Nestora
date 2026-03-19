import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  ssr: false,

  devServer: {
    host: process.env.TAURI_DEV_HOST || 'localhost',
  },

  vite: {
    // Fix Tauri Android dev mode
    clearScreen: false,
    server: {
      strictPort: true,
      ...(process.env.TAURI_DEV_HOST
        ? {
            host: process.env.TAURI_DEV_HOST,
            hmr: {
              protocol: 'ws',
              host: process.env.TAURI_DEV_HOST,
              port: 3000,
            },
            watch: {
              ignored: ['**/src-tauri/**'],
            },
          }
        : {}),
    },
  },

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

  modules: ['@pinia/nuxt', 'shadcn-nuxt', '@nuxt/icon', '@nuxt/fonts', '@vite-pwa/nuxt'],

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Nestora — Smart Savings on Base',
      short_name: 'Nestora',
      description: 'DeFi savings app on Base. Create pockets, set goals, earn yield.',
      theme_color: '#10B981',
      background_color: '#0B0E0D',
      display: 'standalone',
      orientation: 'portrait',
      start_url: '/',
      icons: [
        { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.yo\.xyz\/.*/i,
          handler: 'NetworkFirst',
          options: { cacheName: 'yo-api', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },

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
      include: ['@coinbase/wallet-sdk', '@privy-io/js-sdk-core', '@farcaster/miniapp-sdk', 'comlink'],
    },
  },

  app: {
    head: {
      htmlAttrs: { class: 'dark' },
      title: 'Nestora',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' },
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
        // Farcaster Mini App
        { name: 'fc:miniapp', content: JSON.stringify({ version: '1', imageUrl: 'https://nestora.aethereal.top/hero.png', button: { title: 'Open Nestora', action: { type: 'launch_frame', name: 'Nestora', url: 'https://nestora.aethereal.top', splashImageUrl: 'https://nestora.aethereal.top/splash.png', splashBackgroundColor: '#0B0E0D' } } }) },
        // Theme
        { name: 'theme-color', content: '#10B981' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'apple-touch-icon', href: '/logo.png' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'canonical', href: 'https://nestora.aethereal.top' },
      ],
      script: [
        // Call sdk.actions.ready() via CDN independently of Nuxt —
        // ensures splash screen hides even if the Vue app fails to init
        {
          innerHTML: "import('https://esm.sh/@farcaster/miniapp-sdk').then(function(m){return m.sdk.actions.ready()}).catch(function(){})",
          type: 'module',
          tagPosition: 'head',
        },
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
          'Content-Security-Policy': "frame-ancestors *",
        },
      },
    },
  },

  compatibilityDate: '2025-01-01',
})
