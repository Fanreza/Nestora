export interface DbUser {
  id: string
  address: string
  display_name: string | null
  created_at: string
  updated_at: string
}

export interface DbPocket {
  id: string
  user_id: string
  name: string
  purpose: string | null
  timeline: string | null
  target_amount: number | null
  strategy_key: string
  created_at: string
  updated_at: string
}

export interface CreatePocketInput {
  user_id: string
  name: string
  purpose?: string
  timeline?: string
  target_amount?: number
  strategy_key: string
}

export interface UpdatePocketInput {
  name?: string
  purpose?: string
  timeline?: string
  target_amount?: number
  strategy_key?: string
}

export interface DbTransaction {
  id: string
  pocket_id: string
  type: 'deposit' | 'withdraw' | 'redeem'
  amount: string
  asset_symbol: string
  tx_hash: string
  timestamp: number
  created_at: string
}

export interface CreateTransactionInput {
  pocket_id: string
  type: 'deposit' | 'withdraw' | 'redeem'
  amount: string
  asset_symbol: string
  tx_hash: string
  timestamp: number
}