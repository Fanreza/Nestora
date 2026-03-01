<script setup lang="ts">
import { usePrivyAuth } from '~/composables/usePrivy'

const { completeOAuthLogin, isConnected } = usePrivyAuth()

const error = ref('')
const processing = ref(true)

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('privy_oauth_code')
  const state = params.get('privy_oauth_state')

  if (!code || !state) {
    error.value = 'Missing OAuth parameters'
    processing.value = false
    return
  }

  try {
    await completeOAuthLogin(code, state)
    navigateTo('/app')
  } catch (e: any) {
    console.error('[auth/callback] OAuth login failed:', e)
    error.value = e.message || 'Login failed. Please try again.'
    processing.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center">
    <div class="text-center">
      <template v-if="processing">
        <Icon name="lucide:loader-2" class="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p class="text-sm text-muted-foreground">Signing you in...</p>
      </template>
      <template v-else-if="error">
        <Icon name="lucide:alert-circle" class="w-8 h-8 text-destructive mx-auto mb-4" />
        <p class="text-sm text-destructive mb-4">{{ error }}</p>
        <Button variant="outline" @click="navigateTo('/app')">
          Back to app
        </Button>
      </template>
    </div>
  </div>
</template>
