export default defineNuxtPlugin(() => {
  const inject = document.createElement('script')
  inject.src = 'https://cdn.botpress.cloud/webchat/v3.6/inject.js'
  inject.async = true

  // Load config script only after inject.js is ready
  inject.onload = () => {
    const config = document.createElement('script')
    config.src = 'https://files.bpcontent.cloud/2026/03/15/09/20260315092216-AOB1XALR.js'
    document.body.appendChild(config)
  }

  document.body.appendChild(inject)
})
