import type { TxState } from '~/composables/useVault'
import type { DbPocket } from '~/types/database'
import type { Strategy } from '~/config/strategies'

export interface TransactionRecorderDeps {
  txState: Ref<TxState>
  txHash: Ref<`0x${string}` | null>
  reset: () => void
  selectedPocket: Ref<DbPocket | null>
  selectedStrategy: ComputedRef<Strategy | undefined | null>
  lastTxType: Ref<'deposit' | 'withdraw' | 'redeem'>
  lastTxAmount: Ref<string>
  showDepositDialog: Ref<boolean>
  address: Ref<`0x${string}` | undefined>
  fetchBalances: () => void
  fetchAllPositions: (addr: string) => void
  refreshPockets: () => void
}

export function useTransactionRecorder(deps: TransactionRecorderDeps) {
  const { recordTransaction } = useUserData()

  watch(deps.txState, async (s) => {
    if (s === 'confirmed') {
      if (deps.selectedPocket.value && deps.txHash.value && deps.selectedStrategy.value) {
        await recordTransaction({
          pocket_id: deps.selectedPocket.value.id,
          type: deps.lastTxType.value,
          amount: deps.lastTxAmount.value,
          asset_symbol: deps.selectedStrategy.value.assetSymbol,
          tx_hash: deps.txHash.value,
          timestamp: Math.floor(Date.now() / 1000),
        })
      }

      deps.fetchBalances()
      if (deps.address.value) deps.fetchAllPositions(deps.address.value)
      deps.refreshPockets()
      setTimeout(() => {
        deps.showDepositDialog.value = false
        deps.reset()
      }, 1500)
    }
  })
}
