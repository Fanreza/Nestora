export default defineNuxtPlugin(() => {
  const inject = document.createElement('script')
  inject.src = 'https://cdn.botpress.cloud/webchat/v3.6/inject.js'
  inject.async = true
  document.body.appendChild(inject)

  const config = document.createElement('script')
  config.src = 'https://files.bpcontent.cloud/2026/03/15/09/20260315092216-AOB1XALR.js'
  config.defer = true
  document.body.appendChild(config)
})
