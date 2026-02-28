import { useAccount, useDisconnect, useSwitchChain } from '@wagmi/vue'
import { connect, getConnectors } from '@wagmi/core'
import { base } from 'viem/chains'
import { wagmiConfig } from '~/config/wagmi'

export function useWallet() {
  const account = useAccount()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const isConnected = computed(() => account.status.value === 'connected')
  const isConnecting = ref(false)
  const address = computed(() => account.address.value)
  const chainId = computed(() => account.chainId.value)
  const isBase = computed(() => chainId.value === base.id)

  function findConnector(id: string) {
    return getConnectors(wagmiConfig).find(c => c.id === id)
  }

  async function connectWallet() {
    const connector = findConnector('injected')
    if (!connector) return
    isConnecting.value = true
    try {
      await connect(wagmiConfig, { connector })
    } catch (e: any) {
      console.error('[useWallet] Connect failed:', e.shortMessage || e.message)
    } finally {
      isConnecting.value = false
    }
  }

  async function connectSmartAccount() {
    const connector = findConnector('coinbaseWalletSDK')
    if (!connector) return
    isConnecting.value = true
    try {
      await connect(wagmiConfig, { connector })
    } catch (e: any) {
      console.error('[useWallet] Smart account connect failed:', e.shortMessage || e.message)
    } finally {
      isConnecting.value = false
    }
  }

  function switchToBase() {
    switchChain({ chainId: base.id })
  }

  return {
    isConnected,
    isConnecting,
    address,
    chainId,
    isBase,
    connectWallet,
    connectSmartAccount,
    disconnect,
    switchToBase,
  }
}
