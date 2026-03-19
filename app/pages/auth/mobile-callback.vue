<script setup lang="ts">
// This page runs in the SYSTEM BROWSER after OAuth login.
// It captures the OAuth code/state and redirects to the Tauri app via deep link.

const processing = ref(true)
const error = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('privy_oauth_code')
  const state = params.get('privy_oauth_state')
  const provider = params.get('provider') || 'google'

  if (!code || !state) {
    error.value = 'Missing OAuth parameters'
    processing.value = false
    return
  }

  // Redirect to Tauri app via deep link
  const deepLink = `nestora://auth?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&provider=${provider}`
  window.location.assign(deepLink)

  // Fallback: if deep link doesn't work after 3s, show manual instructions
  setTimeout(() => {
    processing.value = false
  }, 3000)
})
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center">
    <div class="text-center max-w-sm px-4">
      <template v-if="processing">
        <Icon name="lucide:loader-2" class="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p class="text-sm text-muted-foreground">Redirecting to Nestora app...</p>
      </template>
      <template v-else-if="error">
        <Icon name="lucide:alert-circle" class="w-8 h-8 text-destructive mx-auto mb-4" />
        <p class="text-sm text-destructive mb-4">{{ error }}</p>
      </template>
      <template v-else>
        <Icon name="lucide:check-circle" class="w-8 h-8 text-primary mx-auto mb-4" />
        <p class="text-sm text-foreground mb-2">Login successful!</p>
        <p class="text-xs text-muted-foreground mb-4">
          If the app didn't open automatically, tap the button below.
        </p>
        <a
          :href="`nestora://auth${window.location.search}&provider=${new URLSearchParams(window.location.search).get('provider') || 'google'}`"
          class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open Nestora
        </a>
      </template>
    </div>
  </div>
</template>
