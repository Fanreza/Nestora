import type { DbUser, DbPocket, DbTransaction, CreatePocketInput, UpdatePocketInput, CreateTransactionInput } from '~/types/database'
import { useSupabase } from './useSupabase'

export function useUserData() {
  const supabase = useSupabase()

  // ---- User CRUD ----

  async function ensureUser(address: string): Promise<DbUser | null> {
    const addr = address.toLowerCase()

    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('address', addr)
      .maybeSingle()

    if (existing) return existing as DbUser

    const { data: created, error } = await supabase
      .from('users')
      .insert({ address: addr })
      .select()
      .single()

    if (error) {
      console.error('[useUserData] ensureUser error:', error.message)
      return null
    }
    return created as DbUser
  }

  async function getUser(address: string): Promise<DbUser | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('address', address.toLowerCase())
      .single()

    if (error) return null
    return data as DbUser
  }

  async function updateDisplayName(address: string, name: string): Promise<boolean> {
    const { error } = await supabase
      .from('users')
      .update({ display_name: name })
      .eq('address', address.toLowerCase())

    if (error) {
      console.error('[useUserData] updateDisplayName error:', error.message)
      return false
    }
    return true
  }

  // ---- Pocket CRUD ----

  async function getPockets(userId: string): Promise<DbPocket[]> {
    const { data, error } = await supabase
      .from('pockets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[useUserData] getPockets error:', error.message)
      return []
    }
    return (data ?? []) as DbPocket[]
  }

  async function createPocket(input: CreatePocketInput): Promise<DbPocket | null> {
    const { data, error } = await supabase
      .from('pockets')
      .insert(input)
      .select()
      .single()

    if (error) {
      console.error('[useUserData] createPocket error:', error.message)
      return null
    }
    return data as DbPocket
  }

  async function updatePocket(id: string, input: UpdatePocketInput): Promise<boolean> {
    const { error } = await supabase
      .from('pockets')
      .update(input)
      .eq('id', id)

    if (error) {
      console.error('[useUserData] updatePocket error:', error.message)
      return false
    }
    return true
  }

  async function deletePocket(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('pockets')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[useUserData] deletePocket error:', error.message)
      return false
    }
    return true
  }

  // ---- Transaction CRUD ----

  async function createTransaction(input: CreateTransactionInput): Promise<DbTransaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .insert(input)
      .select()
      .single()

    if (error) {
      console.error('[useUserData] createTransaction error:', error.message)
      return null
    }
    return data as DbTransaction
  }

  async function getTransactions(pocketId: string): Promise<DbTransaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('pocket_id', pocketId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[useUserData] getTransactions error:', error.message)
      return []
    }
    return (data ?? []) as DbTransaction[]
  }

  return {
    ensureUser,
    getUser,
    updateDisplayName,
    getPockets,
    createPocket,
    updatePocket,
    deletePocket,
    createTransaction,
    getTransactions,
  }
}
