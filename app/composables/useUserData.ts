import type { DbUser, DbPocket, CreatePocketInput, UpdatePocketInput } from '~/types/database'

export function useUserData() {
  // ---- User CRUD ----

  async function ensureUser(address: string): Promise<DbUser | null> {
    try {
      return await $fetch<DbUser>('/api/users/ensure', {
        method: 'POST',
        body: { address },
      })
    } catch (e: any) {
      console.error('[useUserData] ensureUser error:', e.message)
      return null
    }
  }

  async function getUser(address: string): Promise<DbUser | null> {
    try {
      return await $fetch<DbUser | null>(`/api/users/${address.toLowerCase()}`)
    } catch {
      return null
    }
  }

  async function updateDisplayName(address: string, name: string): Promise<boolean> {
    try {
      await $fetch(`/api/users/${address.toLowerCase()}`, {
        method: 'PATCH',
        body: { display_name: name },
      })
      return true
    } catch (e: any) {
      console.error('[useUserData] updateDisplayName error:', e.message)
      return false
    }
  }

  // ---- Pocket CRUD ----

  async function getPockets(userId: string): Promise<DbPocket[]> {
    try {
      return await $fetch<DbPocket[]>('/api/pockets', {
        query: { user_id: userId },
      })
    } catch (e: any) {
      console.error('[useUserData] getPockets error:', e.message)
      return []
    }
  }

  async function createPocket(input: CreatePocketInput): Promise<DbPocket | null> {
    try {
      return await $fetch<DbPocket>('/api/pockets', {
        method: 'POST',
        body: input,
      })
    } catch (e: any) {
      console.error('[useUserData] createPocket error:', e.message)
      return null
    }
  }

  async function updatePocket(id: string, input: UpdatePocketInput): Promise<boolean> {
    try {
      await $fetch(`/api/pockets/${id}`, {
        method: 'PATCH',
        body: input,
      })
      return true
    } catch (e: any) {
      console.error('[useUserData] updatePocket error:', e.message)
      return false
    }
  }

  async function deletePocket(id: string): Promise<boolean> {
    try {
      await $fetch(`/api/pockets/${id}`, {
        method: 'DELETE',
      })
      return true
    } catch (e: any) {
      console.error('[useUserData] deletePocket error:', e.message)
      return false
    }
  }

  return {
    ensureUser,
    getUser,
    updateDisplayName,
    getPockets,
    createPocket,
    updatePocket,
    deletePocket,
  }
}
