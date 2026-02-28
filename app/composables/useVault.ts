import { useAccount } from '@wagmi/vue'
import { getWalletClient, getPublicClient, sendTransaction, waitForTransactionReceipt } from '@wagmi/core'
import { wagmiConfig } from '~/config/wagmi'
import type { Strategy } from '~/config/strategies'
import { useEnso } from './useEnso'
import { createYoClient, YO_GATEWAY_ADDRESS } from '@yo-protocol/core'

export type TxState =
  | 'idle'
  | 'preparing'
  | 'approving'
  | 'awaiting_signature'
  | 'pending'
  | 'confirmed'
  | 'failed'

const BASE_CHAIN_ID = 8453

export function useVault() {
  const { address } = useAccount()

  const txState = ref<TxState>('idle')
  const txHash = ref<`0x${string}` | null>(null)
  const txError = ref('')
  const gasEstimate = ref('')

  // Create a Yo client with wallet for write operations
  // Pass wagmi's publicClient so SDK and wagmi share same RPC state
  async function getYoClient() {
    const walletClient = await getWalletClient(wagmiConfig)
    const publicClient = getPublicClient(wagmiConfig)
    // TODO: Replace partnerId with your own — get one at https://x.com/yield
    return createYoClient({ chainId: BASE_CHAIN_ID, walletClient, publicClient, partnerId: 9999 })
  }

  // Read-only Yo client (no wallet needed)
  function getReadClient() {
    const publicClient = getPublicClient(wagmiConfig)
    return createYoClient({ chainId: BASE_CHAIN_ID, publicClient })
  }

  // ---- Gas estimation ----
  async function estimateDepositGas(_strategy: Strategy, _amount: bigint) {
    // Yo SDK handles gas estimation internally
    gasEstimate.value = ''
  }

  // ---- Deposit via Yo Gateway ----
  async function deposit(strategy: Strategy, amount: bigint) {
    if (!address.value || amount === 0n) return
    try {
      txState.value = 'preparing'
      txError.value = ''
      txHash.value = null

      const client = await getYoClient()

      // Check if vault is paused
      const paused = await client.isPaused(strategy.vaultAddress)
      if (paused) {
        txError.value = 'This vault is currently paused'
        txState.value = 'failed'
        return
      }

      // Check allowance and approve if needed (approve to Gateway, not vault)
      txState.value = 'approving'
      const hasAllowance = await client.hasEnoughAllowance(
        strategy.assetAddress,
        address.value,
        YO_GATEWAY_ADDRESS,
        amount,
      )

      if (!hasAllowance) {
        const approveResult = await client.approve(strategy.assetAddress, amount)
        // Wait for approve to confirm before depositing
        await client.waitForTransaction(approveResult.hash)
      }

      // Use prepareDeposit (encodes calldata only, no simulateContract)
      // then send via wagmi — works with Smart Wallets & EOAs alike
      txState.value = 'awaiting_signature'
      const preparedTx = await client.prepareDeposit({
        vault: strategy.vaultAddress,
        amount,
        recipient: address.value,
      })

      const hash = await sendTransaction(wagmiConfig, {
        to: preparedTx.to as `0x${string}`,
        data: preparedTx.data as `0x${string}`,
        value: preparedTx.value,
      })

      txHash.value = hash
      txState.value = 'pending'

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
      txState.value = receipt.status === 'success' ? 'confirmed' : 'failed'
      if (receipt.status !== 'success') txError.value = 'Transaction reverted'
    } catch (e: any) {
      console.error('[useVault] deposit error:', e)
      txState.value = 'failed'
      txError.value = e.shortMessage || e.message || 'Transaction failed'
    }
  }

  // ---- Redeem via Yo Gateway ----
  async function redeem(strategy: Strategy, shares: bigint) {
    if (!address.value || shares === 0n) return
    try {
      txState.value = 'preparing'
      txError.value = ''
      txHash.value = null

      const client = await getYoClient()

      // Approve vault shares to Gateway (vault token = share token)
      txState.value = 'approving'
      const hasAllowance = await client.hasEnoughAllowance(
        strategy.vaultAddress,
        address.value,
        YO_GATEWAY_ADDRESS,
        shares,
      )

      if (!hasAllowance) {
        const approveResult = await client.approve(strategy.vaultAddress, shares)
        await client.waitForTransaction(approveResult.hash)
      }

      // Use prepareRedeem + wagmi sendTransaction (Smart Wallet compatible)
      txState.value = 'awaiting_signature'
      const preparedTx = await client.prepareRedeem({
        vault: strategy.vaultAddress,
        shares,
        recipient: address.value,
      })

      const hash = await sendTransaction(wagmiConfig, {
        to: preparedTx.to as `0x${string}`,
        data: preparedTx.data as `0x${string}`,
        value: preparedTx.value,
      })

      txHash.value = hash
      txState.value = 'pending'

      // Wait for tx confirmation
      const txReceipt = await waitForTransactionReceipt(wagmiConfig, { hash })
      if (txReceipt.status !== 'success') {
        txState.value = 'failed'
        txError.value = 'Transaction reverted'
        return
      }

      // Try to decode redeem receipt (instant vs queued)
      try {
        const receipt = await client.waitForRedeemReceipt(hash)
        txState.value = 'confirmed'
        if (!receipt.instant) {
          txError.value = 'Your withdrawal is queued and will be processed shortly.'
        }
      } catch {
        // Event parsing may fail but tx succeeded
        txState.value = 'confirmed'
      }
    } catch (e: any) {
      console.error('[useVault] redeem error:', e)
      txState.value = 'failed'
      txError.value = e.shortMessage || e.message || 'Transaction failed'
    }
  }

  // ---- Read vault position via Yo SDK ----
  async function getShareBalance(strategy: Strategy): Promise<bigint> {
    if (!address.value) return 0n
    try {
      const client = getReadClient()
      const shares = await client.getShareBalance(strategy.vaultAddress, address.value)
      console.log(`[vault] getShareBalance(${strategy.vaultSymbol}, ${address.value}):`, shares.toString())
      return shares
    } catch (e) {
      console.error(`[vault] getShareBalance(${strategy.vaultSymbol}) failed:`, e)
      return 0n
    }
  }

  async function getShareValue(strategy: Strategy, shares: bigint): Promise<bigint> {
    if (shares === 0n) return 0n
    try {
      const client = getReadClient()
      const value = await client.convertToAssets(strategy.vaultAddress, shares)
      console.log(`[vault] convertToAssets(${strategy.vaultSymbol}, ${shares}):`, value.toString())
      return value
    } catch (e) {
      console.error(`[vault] convertToAssets(${strategy.vaultSymbol}) failed:`, e)
      return 0n
    }
  }

  // ---- Zap Deposit (via Enso) ----
  async function zapDeposit(strategy: Strategy, tokenIn: `0x${string}`, amount: string) {
    if (!address.value) return
    const { getZapQuote, getApprovalTx, NATIVE_TOKEN } = useEnso()

    try {
      txState.value = 'preparing'
      txError.value = ''
      txHash.value = null

      const quote = await getZapQuote(tokenIn, strategy, amount, address.value)
      if (!quote) {
        txError.value = 'Could not find a route for this swap'
        txState.value = 'failed'
        return
      }

      // Approve token spend if not native ETH
      if (tokenIn.toLowerCase() !== NATIVE_TOKEN.toLowerCase()) {
        txState.value = 'approving'
        const approval = await getApprovalTx(tokenIn, amount, address.value)
        if (approval?.tx) {
          const approveHash = await sendTransaction(wagmiConfig, {
            to: approval.tx.to as `0x${string}`,
            data: approval.tx.data as `0x${string}`,
            value: BigInt(approval.tx.value || '0'),
          })
          await waitForTransactionReceipt(wagmiConfig, { hash: approveHash })
        }
      }

      // Execute the zap transaction
      txState.value = 'awaiting_signature'
      const hash = await sendTransaction(wagmiConfig, {
        to: quote.tx.to as `0x${string}`,
        data: quote.tx.data as `0x${string}`,
        value: BigInt(quote.tx.value || '0'),
      })

      txHash.value = hash
      txState.value = 'pending'

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
      txState.value = receipt.status === 'success' ? 'confirmed' : 'failed'
      if (receipt.status !== 'success') txError.value = 'Transaction reverted'
    } catch (e: any) {
      console.error('[useVault] zapDeposit error:', e)
      txState.value = 'failed'
      txError.value = e.shortMessage || e.message || 'Transaction failed'
    }
  }

  // ---- Vault Snapshot (APY data) ----
  async function getVaultSnapshot(strategy: Strategy) {
    try {
      const client = getReadClient()
      return await client.getVaultSnapshot(strategy.vaultAddress)
    } catch (e) {
      console.error(`[vault] getVaultSnapshot(${strategy.vaultSymbol}) failed:`, e)
      return null
    }
  }

  // ---- User Transaction History ----
  async function getUserHistory(strategy: Strategy, userAddress: string) {
    try {
      const client = getReadClient()
      return await client.getUserHistory(strategy.vaultAddress, userAddress as `0x${string}`)
    } catch (e) {
      console.error(`[vault] getUserHistory(${strategy.vaultSymbol}) failed:`, e)
      return []
    }
  }

  // ---- User Performance (profit) ----
  async function getUserPerformance(strategy: Strategy, userAddress: string) {
    try {
      const client = getReadClient()
      return await client.getUserPerformance(strategy.vaultAddress, userAddress as `0x${string}`)
    } catch (e) {
      console.error(`[vault] getUserPerformance(${strategy.vaultSymbol}) failed:`, e)
      return null
    }
  }

  function reset() {
    txState.value = 'idle'
    txHash.value = null
    txError.value = ''
    gasEstimate.value = ''
  }

  return {
    txState,
    txHash,
    txError,
    gasEstimate,
    deposit,
    redeem,
    zapDeposit,
    estimateDepositGas,
    getShareBalance,
    getShareValue,
    getVaultSnapshot,
    getUserHistory,
    getUserPerformance,
    reset,
  }
}
