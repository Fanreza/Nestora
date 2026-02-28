<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useWallet } from '~/composables/useWallet'
import { useProfileStore } from '~/stores/useProfileStore'

const { isConnected, address, disconnect } = useWallet()
const profileStore = useProfileStore()
const { ensName, customName } = storeToRefs(profileStore)

const editingName = ref(false)
const nameInput = ref('')

// Redirect if not connected
watch(isConnected, (connected) => {
  if (!connected) navigateTo('/app')
}, { immediate: true })

function startEditing() {
  nameInput.value = customName.value
  editingName.value = true
}

function saveName() {
  profileStore.setCustomName(nameInput.value.trim())
  editingName.value = false
}

function handleDisconnect() {
  profileStore.reset()
  disconnect()
  navigateTo('/app')
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-md mx-auto px-4 py-6 flex flex-col min-h-screen">

      <!-- Header -->
      <header class="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" @click="navigateTo('/app')">
          <Icon name="lucide:arrow-left" class="w-5 h-5" />
        </Button>
        <h1 class="text-xl font-bold">Account</h1>
      </header>

      <template v-if="isConnected && address">
        <!-- Avatar & Identity -->
        <div class="flex flex-col items-center mb-8">
          <div class="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <Icon name="lucide:user" class="w-10 h-10 text-green-500" />
          </div>
          <p class="text-lg font-semibold">
            {{ profileStore.displayName(address) }}
          </p>
          <Badge variant="secondary" class="mt-2 font-mono text-xs">
            {{ truncate(address) }}
          </Badge>
        </div>

        <div class="space-y-4">

          <!-- ENS Identity -->
          <Card v-if="ensName">
            <CardContent class="p-4">
              <div class="flex items-center gap-2 mb-1">
                <Icon name="lucide:at-sign" class="w-4 h-4 text-muted-foreground" />
                <p class="text-sm font-medium">Web Identity</p>
              </div>
              <p class="text-sm text-muted-foreground">{{ ensName }}</p>
            </CardContent>
          </Card>

          <!-- Display Name -->
          <Card>
            <CardContent class="p-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:pen-line" class="w-4 h-4 text-muted-foreground" />
                  <p class="text-sm font-medium">Display Name</p>
                </div>
                <Button
                  v-if="!editingName"
                  variant="ghost"
                  size="sm"
                  @click="startEditing"
                >
                  Edit
                </Button>
              </div>
              <template v-if="editingName">
                <div class="flex gap-2">
                  <Input
                    v-model="nameInput"
                    placeholder="Enter your name"
                    class="flex-1"
                    @keyup.enter="saveName"
                  />
                  <Button size="sm" class="bg-green-500 text-white hover:bg-green-600" @click="saveName">Save</Button>
                  <Button size="sm" variant="ghost" @click="editingName = false">
                    <Icon name="lucide:x" class="w-4 h-4" />
                  </Button>
                </div>
              </template>
              <p v-else class="text-sm text-muted-foreground">
                {{ customName || 'No name set' }}
              </p>
            </CardContent>
          </Card>

          <!-- Export Wallet -->
          <Card>
            <CardContent class="p-4">
              <div class="flex items-center gap-2 mb-1">
                <Icon name="lucide:download" class="w-4 h-4 text-muted-foreground" />
                <p class="text-sm font-medium">Export Wallet</p>
              </div>
              <p class="text-xs text-muted-foreground mb-3">
                Back up your account keys to keep them safe.
              </p>
              <Button
                variant="outline"
                size="sm"
                class="w-full"
                as="a"
                href="https://keys.coinbase.com"
                target="_blank"
              >
                <Icon name="lucide:external-link" class="w-3.5 h-3.5 mr-1.5" />
                Manage Keys
              </Button>
            </CardContent>
          </Card>

          <Separator />

          <!-- Sign Out -->
          <Button
            variant="destructive"
            class="w-full"
            @click="handleDisconnect"
          >
            <Icon name="lucide:log-out" class="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>
