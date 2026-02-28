<script setup lang="ts">
defineProps<{
  isConnected: boolean
  isBase: boolean
  displayName: string
}>()

defineEmits<{
  signIn: []
  switchNetwork: []
  goProfile: []
}>()
</script>

<template>
  <header class="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="text-xl font-bold tracking-tight">Nestora</NuxtLink>

      <Button
        v-if="!isConnected"
        size="sm"
        class="bg-green-500 text-white hover:bg-green-600"
        @click="$emit('signIn')"
      >
        <Icon name="lucide:log-in" class="w-4 h-4 mr-1.5" />
        Sign In
      </Button>

      <div v-else class="flex items-center gap-2">
        <Badge
          v-if="!isBase"
          variant="destructive"
          class="cursor-pointer text-xs"
          @click="$emit('switchNetwork')"
        >
          Network issue
        </Badge>
        <Button variant="outline" size="sm" @click="$emit('goProfile')">
          <Icon name="lucide:user-circle" class="w-4 h-4 mr-1.5" />
          {{ displayName }}
        </Button>
      </div>
    </div>
  </header>
</template>
