import { defineStore } from 'pinia'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { useAccount } from '@wagmi/vue'
import type { DbUser, DbPocket, UpdatePocketInput } from '~/types/database'
import { useUserData } from '~/composables/useUserData'

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

export const useProfileStore = defineStore('profile', () => {
  const { ensureUser, updateDisplayName: updateDbName, getPockets: fetchDbPockets, createPocket: createDbPocket, updatePocket: updateDbPocket, deletePocket: deleteDbPocket } = useUserData()

  // ---- State ----
  const currentUser = ref<DbUser | null>(null)
  const ensName = ref<string | null>(null)
  const ensResolved = ref(false)
  const customName = ref('')
  const pockets = ref<DbPocket[]>([])
  const loading = ref(false)

  // ---- Getters ----
  function displayName(address: string): string {
    if (ensName.value) return ensName.value
    if (customName.value) return customName.value
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // ---- Actions ----
  function reset() {
    currentUser.value = null
    ensName.value = null
    ensResolved.value = false
    customName.value = ''
    pockets.value = []
  }

  async function resolveEns(address: `0x${string}`) {
    try {
      ensName.value = await mainnetClient.getEnsName({ address })
    } catch {
      ensName.value = null
    }
    ensResolved.value = true
  }

  async function loadProfile(address: `0x${string}`) {
    loading.value = true
    try {
      const user = await ensureUser(address)
      if (user) {
        currentUser.value = user
        customName.value = user.display_name || ''
        pockets.value = await fetchDbPockets(user.id)
      }
    } finally {
      loading.value = false
    }
  }

  async function setCustomName(name: string) {
    customName.value = name
    if (currentUser.value?.address) {
      await updateDbName(currentUser.value.address, name)
    }
  }

  async function refreshPockets() {
    if (!currentUser.value) return
    pockets.value = await fetchDbPockets(currentUser.value.id)
  }

  async function createPocket(input: Parameters<typeof createDbPocket>[0]) {
    const pocket = await createDbPocket(input)
    if (pocket) {
      pockets.value = [pocket, ...pockets.value]
    }
    return pocket
  }

  async function updatePocket(id: string, input: UpdatePocketInput) {
    const ok = await updateDbPocket(id, input)
    if (ok) {
      const idx = pockets.value.findIndex(p => p.id === id)
      if (idx !== -1) {
        pockets.value[idx] = { ...pockets.value[idx], ...input }
      }
    }
    return ok
  }

  async function deletePocket(id: string) {
    const ok = await deleteDbPocket(id)
    if (ok) {
      pockets.value = pockets.value.filter(p => p.id !== id)
    }
    return ok
  }

  // ---- Auto-fetch on address change ----
  const account = useAccount()

  watch(() => account.address.value, async (addr, oldAddr) => {
    if (addr === oldAddr) return
    reset()
    if (addr) {
      resolveEns(addr)
      await loadProfile(addr)
    }
  }, { immediate: true })

  return {
    currentUser,
    ensName,
    customName,
    pockets,
    loading,
    displayName,
    reset,
    setCustomName,
    refreshPockets,
    createPocket,
    updatePocket,
    deletePocket,
  }
})
