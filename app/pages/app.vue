<script setup lang="ts">
import { parseUnits, formatUnits } from 'viem'
import { STRATEGIES, STRATEGY_LIST, type StrategyKey } from '~/config/strategies'
import type { DbPocket } from '~/types/database'
import { useWallet } from '~/composables/useWallet'
import { useBalances } from '~/composables/useBalances'
import { useVault } from '~/composables/useVault'
import { useEnso, type TokenBalance } from '~/composables/useEnso'
import { useUserData } from '~/composables/useUserData'
import { useCoinGecko } from '~/composables/useCoinGecko'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '~/stores/useProfileStore'

// ---- Wallet ----
const {
  isConnected, address, isBase,
  connectWallet, connectSmartAccount, switchToBase,
} = useWallet()

// ---- Connect Modal ----
const showConnectModal = ref(false)

async function handleWallet() {
  showConnectModal.value = false
  await connectWallet()
}

async function handleSmartAccount() {
  showConnectModal.value = false
  await connectSmartAccount()
}

// ---- Profile Store ----
const profileStore = useProfileStore()
const { currentUser, pockets, loading: loadingPockets } = storeToRefs(profileStore)
const profileDisplayName = computed(() =>
  address.value ? profileStore.displayName(address.value) : '',
)

// ---- Balances ----
const { ethBalance, fetchBalances } = useBalances()

// ---- Vault ----
const {
  txState, txHash, txError,
  deposit, redeem, zapDeposit,
  getShareBalance, getShareValue,
  getVaultSnapshot, getUserPerformance,
  reset,
} = useVault()

// ---- Enso ----
const { getZapQuote, getWalletBalances, NATIVE_TOKEN } = useEnso()
const { getTokenPrices } = useCoinGecko()
const { createTransaction } = useUserData()

// ---- Asset USD prices ----
const assetPrices = ref<Record<string, number>>({})

async function fetchAssetPrices() {
  const addresses = STRATEGY_LIST.map(s => s.assetAddress as string)
  const prices = await getTokenPrices(addresses)
  assetPrices.value = prices
}

function getAssetPrice(strategyKey: string): number {
  const strategy = STRATEGIES[strategyKey as StrategyKey]
  if (!strategy) return 0
  return assetPrices.value[strategy.assetAddress.toLowerCase()] ?? 0
}

// ---- Portfolio totals ----
const totalPortfolioUsd = computed(() => {
  return pockets.value.reduce((sum, pocket) => {
    const pos = pocketPositions.value[pocket.id]
    if (!pos || pos.value === 0n) return sum
    const strategy = STRATEGIES[pocket.strategy_key as StrategyKey]
    if (!strategy) return sum
    const assetVal = parseFloat(formatUnits(pos.value, strategy.decimals))
    const price = getAssetPrice(pocket.strategy_key)
    return sum + assetVal * price
  }, 0)
})

const totalPortfolioFormatted = computed(() => {
  if (totalPortfolioUsd.value === 0) return '$0.00'
  return '$' + totalPortfolioUsd.value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
})

const pocketCount = computed(() => pockets.value.length)

// ---- Vault APY data ----
const vaultApys = ref<Record<string, string | null>>({})

async function fetchVaultSnapshots() {
  for (const strategy of STRATEGY_LIST) {
    try {
      const snapshot = await getVaultSnapshot(strategy)
      if (snapshot?.yield) {
        vaultApys.value[strategy.key] = snapshot.yield['7d'] ?? snapshot.yield['30d'] ?? null
      }
    } catch (e) {
      console.error(`[apy] ${strategy.vaultSymbol} snapshot failed:`, e)
    }
  }
}

function getStrategyApy(strategyKey: string): string | null {
  return vaultApys.value[strategyKey] ?? null
}

// ---- User profit data ----
const pocketProfits = ref<Record<string, string | null>>({})

async function fetchUserPerformances() {
  if (!address.value) return
  const seen = new Set<string>()
  for (const pocket of pockets.value) {
    const strategy = STRATEGIES[pocket.strategy_key as StrategyKey]
    if (!strategy || seen.has(strategy.key)) continue
    seen.add(strategy.key)
    try {
      const perf = await getUserPerformance(strategy, address.value)
      if (perf) {
        // Store by strategy key — all pockets with same strategy share vault performance
        for (const p of pockets.value.filter(pp => pp.strategy_key === strategy.key)) {
          pocketProfits.value[p.id] = perf.unrealized.formatted
        }
      }
    } catch (e) {
      console.error(`[profit] ${strategy.vaultSymbol} performance failed:`, e)
    }
  }
}

// ---- Pocket positions ----
const pocketPositions = ref<Record<string, { shares: bigint; value: bigint }>>({})
const loadingPosition = ref(false)

async function fetchPocketPosition(pocket: DbPocket) {
  const strategy = STRATEGIES[pocket.strategy_key as StrategyKey]
  if (!strategy || !address.value) return
  loadingPosition.value = true
  try {
    const shares = await getShareBalance(strategy)
    const value = await getShareValue(strategy, shares)
    pocketPositions.value[pocket.id] = { shares, value }
  } catch (e) {
    console.error(`[position] ${pocket.name} fetch failed:`, e)
    pocketPositions.value[pocket.id] = { shares: 0n, value: 0n }
  } finally {
    loadingPosition.value = false
  }
}

async function fetchAllPositions() {
  await Promise.all([
    fetchAssetPrices(),
    fetchVaultSnapshots(),
    ...pockets.value.map(fetchPocketPosition),
  ])
  // Fetch after positions are loaded
  fetchUserPerformances()
}

watch(pockets, () => { if (pockets.value.length) fetchAllPositions() })
watch(txState, (s) => {
  if (s === 'confirmed') {
    // Log transaction to Supabase
    if (pendingTxInfo.value && txHash.value) {
      createTransaction({
        pocket_id: pendingTxInfo.value.pocketId,
        type: pendingTxInfo.value.type,
        amount: pendingTxInfo.value.amount,
        asset_symbol: pendingTxInfo.value.assetSymbol,
        tx_hash: txHash.value,
      }).then(() => { pendingTxInfo.value = null })
    }
    fetchBalances()
    fetchAllPositions()
    profileStore.refreshPockets()
    setTimeout(() => {
      showDepositDialog.value = false
      reset()
    }, 1500)
  }
})

// ---- Wallet tokens for deposit ----
type WalletToken = TokenBalance & { usdPrice: number; usdValue: number; formattedBal: number }
const walletTokens = ref<WalletToken[]>([])
const loadingTokens = ref(false)

async function fetchWalletTokens() {
  if (!address.value) return
  loadingTokens.value = true
  try {
    const balances = await getWalletBalances(address.value)
    const nonZero = balances.filter(t => t.amount && BigInt(t.amount) > 0n)

    // Fetch prices but don't filter out tokens without prices
    let prices: Record<string, number> = {}
    try {
      prices = await getTokenPrices(nonZero.map(t => t.token))
    } catch (e) {
      console.error('[fetchWalletTokens] price fetch failed:', e)
    }

    walletTokens.value = nonZero
      .map(t => {
        const usdPrice = prices[t.token.toLowerCase()] ?? 0
        const formattedBal = Number(BigInt(t.amount)) / Math.pow(10, t.decimals)
        return { ...t, usdPrice, usdValue: formattedBal * usdPrice, formattedBal }
      })
      .filter(t => t.usdPrice > 0)
      .sort((a, b) => b.usdValue - a.usdValue)
  } catch (e) {
    console.error('[fetchWalletTokens] failed:', e)
    walletTokens.value = []
  } finally {
    loadingTokens.value = false
  }
}

// ---- Create pocket ----
const showCreateDialog = ref(false)
const creatingPocket = ref(false)

async function handleCreatePocket(payload: {
  name: string
  purpose?: string
  target_amount?: number
  timeline?: string
  strategy_key: StrategyKey
}) {
  if (!currentUser.value) return
  creatingPocket.value = true
  try {
    const pocket = await profileStore.createPocket({
      user_id: currentUser.value.id,
      ...payload,
    })
    if (pocket) {
      showCreateDialog.value = false
      openDepositDialog(pocket)
    }
  } finally {
    creatingPocket.value = false
  }
}

// ---- Delete pocket ----
async function handleDeletePocket(pocket: DbPocket) {
  const ok = await profileStore.deletePocket(pocket.id)
  if (ok && selectedPocket.value?.id === pocket.id) {
    selectedPocket.value = null
    showDepositDialog.value = false
  }
}

// ---- Pending tx info for logging ----
const pendingTxInfo = ref<{ pocketId: string; type: 'deposit' | 'withdraw'; amount: string; assetSymbol: string } | null>(null)

// ---- Deposit / Withdraw dialog ----
const selectedPocket = ref<DbPocket | null>(null)
const showDepositDialog = ref(false)
const selectedTokenIn = ref<`0x${string}` | null>(null)
const depositAmount = ref('')
const zapQuote = ref<import('~/composables/useEnso').ZapQuote | null>(null)
const fetchingQuote = ref(false)

const selectedStrategy = computed(() =>
  selectedPocket.value
    ? STRATEGIES[selectedPocket.value.strategy_key as StrategyKey]
    : null,
)

const pocketPosition = computed(() => {
  if (!selectedPocket.value) return { shares: 0n, value: 0n }
  return pocketPositions.value[selectedPocket.value.id] || { shares: 0n, value: 0n }
})

function openDepositDialog(pocket: DbPocket, mode: 'deposit' | 'withdraw' = 'deposit') {
  selectedPocket.value = pocket
  depositAmount.value = ''
  selectedTokenIn.value = null
  zapQuote.value = null
  reset()
  showDepositDialog.value = true
  fetchPocketPosition(pocket)
  if (mode === 'deposit') fetchWalletTokens()
}

// Zap quote debouncing
const isDirectDeposit = computed(() => {
  if (!selectedTokenIn.value || !selectedStrategy.value) return true
  const vaultAsset = selectedStrategy.value.type === 'native'
    ? NATIVE_TOKEN
    : selectedStrategy.value.assetAddress
  return selectedTokenIn.value.toLowerCase() === vaultAsset.toLowerCase()
})

let quoteTimeout: ReturnType<typeof setTimeout> | null = null
watch([selectedTokenIn, depositAmount], () => {
  zapQuote.value = null
  if (quoteTimeout) clearTimeout(quoteTimeout)
  if (!selectedTokenIn.value || !depositAmount.value || !selectedStrategy.value || !address.value) return
  if (isDirectDeposit.value) return

  const tokenBal = walletTokens.value.find(
    t => t.token?.toLowerCase() === selectedTokenIn.value?.toLowerCase(),
  )

  quoteTimeout = setTimeout(async () => {
    fetchingQuote.value = true
    try {
      const decimals = tokenBal?.decimals ?? 18
      const amountWei = parseUnits(depositAmount.value, decimals).toString()
      zapQuote.value = await getZapQuote(selectedTokenIn.value!, selectedStrategy.value!, amountWei, address.value!)
    } finally {
      fetchingQuote.value = false
    }
  }, 800)
})

// Handle deposit/withdraw actions from dialog
async function handleDeposit(payload: { tokenIn: `0x${string}`; amount: string; isDirect: boolean }) {
  const strategy = selectedStrategy.value
  if (!strategy || !address.value || !selectedPocket.value) return

  pendingTxInfo.value = {
    pocketId: selectedPocket.value.id,
    type: 'deposit',
    amount: payload.amount,
    assetSymbol: strategy.assetSymbol,
  }

  if (payload.isDirect) {
    const parsed = parseUnits(payload.amount, strategy.decimals)
    if (parsed === 0n) return
    await deposit(strategy, parsed)
  } else if (zapQuote.value) {
    const tokenBal = walletTokens.value.find(
      t => t.token?.toLowerCase() === payload.tokenIn.toLowerCase(),
    )
    const decimals = tokenBal?.decimals ?? 18
    const amountWei = parseUnits(payload.amount, decimals).toString()
    await zapDeposit(strategy, payload.tokenIn, amountWei)
  }
}

async function handleWithdraw(amount: string) {
  const strategy = selectedStrategy.value
  if (!strategy || !address.value || !selectedPocket.value) return

  pendingTxInfo.value = {
    pocketId: selectedPocket.value.id,
    type: 'withdraw',
    amount,
    assetSymbol: strategy.assetSymbol,
  }

  const parsed = parseUnits(amount, strategy.decimals)
  if (parsed === 0n) return
  await redeem(strategy, parsed)
}

function handleSelectToken(token: `0x${string}`) {
  selectedTokenIn.value = token
  depositAmount.value = ''
  zapQuote.value = null
}

function handleUpdateAmount(amount: string) {
  depositAmount.value = amount
}

function handleChangeMode(mode: 'deposit' | 'withdraw') {
  depositAmount.value = ''
  selectedTokenIn.value = null
  zapQuote.value = null
  if (mode === 'deposit') fetchWalletTokens()
}

// ---- Helpers ----
const lowGas = computed(() => ethBalance.value < parseUnits('0.0005', 18))
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <AppHeader
      :is-connected="isConnected"
      :is-base="isBase"
      :display-name="profileDisplayName"
      @sign-in="showConnectModal = true"
      @switch-network="switchToBase"
      @go-profile="navigateTo('/profile')"
    />

    <!-- Not connected -->
    <div
      v-if="!isConnected"
      class="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4"
    >
      <div class="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-2">
        <Icon name="lucide:piggy-bank" class="w-8 h-8 text-white" />
      </div>
      <h2 class="text-xl font-semibold">Your money, growing</h2>
      <p class="text-muted-foreground text-center text-sm max-w-65">
        Sign in to start earning interest on your savings.
      </p>
      <Button
        size="lg"
        class="mt-6 bg-green-500 text-white hover:bg-green-600"
        @click="showConnectModal = true"
      >
        Get Started
        <Icon name="lucide:arrow-right" class="w-4 h-4 ml-2" />
      </Button>
    </div>

    <!-- Connected: Pocket Dashboard -->
    <main v-else class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <!-- Alerts -->
      <Alert v-if="!isBase" variant="destructive" class="mb-4">
        <Icon name="lucide:alert-triangle" class="w-4 h-4" />
        <AlertTitle>Quick setup needed</AlertTitle>
        <AlertDescription class="flex items-center justify-between">
          <span>We need to switch you to the right network. One tap.</span>
          <Button size="sm" variant="destructive" @click="switchToBase">
            Fix it
          </Button>
        </AlertDescription>
      </Alert>

      <Alert v-if="lowGas && isBase" class="mb-4">
        <Icon name="lucide:info" class="w-4 h-4" />
        <AlertTitle>Low balance for fees</AlertTitle>
        <AlertDescription>
          You'll need a small amount of ETH to cover processing fees.
        </AlertDescription>
      </Alert>

      <!-- Portfolio summary -->
      <div class="mb-8">
        <p class="text-sm text-muted-foreground mb-1">Total balance</p>
        <h1 class="text-4xl font-bold tracking-tight">{{ totalPortfolioFormatted }}</h1>
        <p class="text-sm text-muted-foreground mt-1">
          {{ pocketCount }} pocket{{ pocketCount !== 1 ? 's' : '' }}
        </p>
      </div>

      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold">Pockets</h2>
        <Button
          class="bg-green-500 text-white hover:bg-green-600"
          @click="showCreateDialog = true"
        >
          <Icon name="lucide:plus" class="w-4 h-4 mr-1.5" />
          Create Pocket
        </Button>
      </div>

      <!-- Loading -->
      <div
        v-if="loadingPockets"
        class="flex items-center justify-center py-20"
      >
        <Icon name="lucide:loader-2" class="w-6 h-6 animate-spin text-muted-foreground" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="pockets.length === 0"
        class="rounded-2xl bg-linear-to-br from-green-500/5 via-background to-emerald-500/5 border border-dashed border-green-500/20 p-14 flex flex-col items-center justify-center text-center"
      >
        <div class="relative mb-6">
          <div class="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <Icon name="lucide:piggy-bank" class="w-10 h-10 text-green-500" />
          </div>
          <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Icon name="lucide:sparkles" class="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <h3 class="text-xl font-semibold mb-2">Start saving</h3>
        <p class="text-sm text-muted-foreground max-w-xs mb-8">
          Create your first pocket to begin growing your money automatically.
        </p>
        <Button
          size="lg"
          class="bg-green-500 text-white hover:bg-green-600"
          @click="showCreateDialog = true"
        >
          <Icon name="lucide:plus" class="w-4 h-4 mr-1.5" />
          Create Pocket
        </Button>
      </div>

      <!-- Pocket cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AppPocketCard
          v-for="pocket in pockets"
          :key="pocket.id"
          :pocket="pocket"
          :position="pocketPositions[pocket.id] || { shares: 0n, value: 0n }"
          :asset-price="getAssetPrice(pocket.strategy_key)"
          :apy="getStrategyApy(pocket.strategy_key)"
          :profit="pocketProfits[pocket.id] ?? null"
          @click="navigateTo(`/pocket/${pocket.id}`)"
          @deposit="openDepositDialog(pocket, 'deposit')"
          @withdraw="openDepositDialog(pocket, 'withdraw')"
          @delete="handleDeletePocket(pocket)"
        />
      </div>
    </main>

    <!-- Dialogs -->
    <AppConnectModal
      v-model:open="showConnectModal"
      @wallet="handleWallet"
      @smart-account="handleSmartAccount"
    />

    <AppCreatePocketDialog
      v-model:open="showCreateDialog"
      :creating="creatingPocket"
      @create="handleCreatePocket"
    />

    <AppDepositDialog
      v-model:open="showDepositDialog"
      :pocket="selectedPocket"
      :position="pocketPosition"
      :tx-state="txState"
      :tx-hash="txHash"
      :tx-error="txError"
      :wallet-tokens="walletTokens"
      :loading-tokens="loadingTokens"
      :loading-position="loadingPosition"
      :fetching-quote="fetchingQuote"
      :zap-quote="zapQuote"
      :native-token="NATIVE_TOKEN"
      :asset-price="selectedPocket ? getAssetPrice(selectedPocket.strategy_key) : 0"
      @deposit="handleDeposit"
      @withdraw="handleWithdraw"
      @reset="reset"
      @fetch-tokens="fetchWalletTokens"
      @fetch-position="selectedPocket && fetchPocketPosition(selectedPocket)"
      @select-token="handleSelectToken"
      @update-amount="handleUpdateAmount"
      @change-mode="handleChangeMode"
    />
  </div>
</template>
