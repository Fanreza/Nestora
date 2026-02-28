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
      include: ['@coinbase/wallet-sdk'],
    },
  },

  app: {
    head: {
      htmlAttrs: { class: 'dark' },
      title: 'Nestora',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' },
        { name: 'description', content: 'Smart savings on Base' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/logo.png' },
        { rel: 'apple-touch-icon', href: '/logo.png' },
      ],
    },
  },

  nitro: {
    externals: {
      inline: ['jspdf', 'jspdf-autotable'],
    },
  },

  compatibilityDate: '2025-01-01',
})
