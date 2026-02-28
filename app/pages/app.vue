<script setup lang="ts">
import { parseUnits } from 'viem'
import { STRATEGIES, type StrategyKey } from '~/config/strategies'
import type { DbPocket } from '~/types/database'
import { useWallet } from '~/composables/useWallet'
import { useBalances } from '~/composables/useBalances'
import { useVault } from '~/composables/useVault'
import { useEnso, type TokenBalance } from '~/composables/useEnso'
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

// ---- Profile Store (all position/price/APY data lives here) ----
const profileStore = useProfileStore()
const {
  currentUser, pockets, loading: loadingPockets,
  pocketPositions, pocketProfits, loadingPositions,
  totalPortfolioFormatted,
} = storeToRefs(profileStore)

const profileDisplayName = computed(() =>
  address.value ? profileStore.displayName(address.value) : '',
)

const pocketCount = computed(() => pockets.value.length)

// ---- Balances ----
const { ethBalance, fetchBalances } = useBalances()

// ---- Vault ----
const {
  txState, txHash, txError,
  deposit, redeem, zapDeposit,
  reset,
} = useVault()

// ---- Enso ----
const { getZapQuote, getWalletBalances, NATIVE_TOKEN } = useEnso()
const { getTokenPrices } = useCoinGecko()

watch(txState, (s) => {
  if (s === 'confirmed') {
    fetchBalances()
    if (address.value) profileStore.fetchAllPositions(address.value)
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
const showDeleteConfirm = ref(false)
const pocketToDelete = ref<DbPocket | null>(null)
const deletingPocket = ref(false)

function requestDeletePocket(pocket: DbPocket) {
  pocketToDelete.value = pocket
  showDeleteConfirm.value = true
}

async function confirmDeletePocket() {
  if (!pocketToDelete.value) return
  deletingPocket.value = true
  try {
    const ok = await profileStore.deletePocket(pocketToDelete.value.id)
    if (ok && selectedPocket.value?.id === pocketToDelete.value.id) {
      selectedPocket.value = null
      showDepositDialog.value = false
    }
  } finally {
    deletingPocket.value = false
    showDeleteConfirm.value = false
    pocketToDelete.value = null
  }
}

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
  profileStore.fetchPocketPosition(pocket)
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
      <img src="/logo.png" alt="Nestora" class="w-20 h-20 mb-2" />
      <h2 class="text-xl font-semibold">Your money, growing</h2>
      <p class="text-muted-foreground text-center text-sm max-w-65">
        Sign in to start earning interest on your savings.
      </p>
      <Button
        size="lg"
        class="mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
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
        <Skeleton v-if="loadingPositions" class="h-10 w-40 mb-1" />
        <h1 v-else class="text-4xl font-bold tracking-tight">{{ totalPortfolioFormatted }}</h1>
        <p class="text-sm text-muted-foreground mt-1">
          {{ pocketCount }} pocket{{ pocketCount !== 1 ? 's' : '' }}
        </p>
      </div>

      <div class="flex items-center justify-between mb-5">
        <h2 class="text-lg font-semibold">Pockets</h2>
        <Button
          class="bg-primary text-primary-foreground hover:bg-primary/90"
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
        class="rounded-2xl bg-linear-to-br from-primary/5 via-background to-primary/5 border border-dashed border-primary/20 p-14 flex flex-col items-center justify-center text-center"
      >
        <div class="relative mb-6">
          <div class="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Icon name="lucide:piggy-bank" class="w-10 h-10 text-primary" />
          </div>
          <div class="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name="lucide:sparkles" class="w-4 h-4 text-primary" />
          </div>
        </div>
        <h3 class="text-xl font-semibold mb-2">Start saving</h3>
        <p class="text-sm text-muted-foreground max-w-xs mb-8">
          Create your first pocket to begin growing your money automatically.
        </p>
        <Button
          size="lg"
          class="bg-primary text-primary-foreground hover:bg-primary/90"
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
          :asset-price="profileStore.getAssetPrice(pocket.strategy_key)"
          :apy="profileStore.getStrategyApy(pocket.strategy_key)"
          :profit="pocketProfits[pocket.id] ?? null"
          :loading="loadingPositions"
          @click="navigateTo(`/pocket/${pocket.id}`)"
          @deposit="openDepositDialog(pocket, 'deposit')"
          @withdraw="openDepositDialog(pocket, 'withdraw')"
          @delete="requestDeletePocket(pocket)"
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
      :loading-position="loadingPositions"
      :fetching-quote="fetchingQuote"
      :zap-quote="zapQuote"
      :native-token="NATIVE_TOKEN"
      :asset-price="selectedPocket ? profileStore.getAssetPrice(selectedPocket.strategy_key) : 0"
      @deposit="handleDeposit"
      @withdraw="handleWithdraw"
      @reset="reset"
      @fetch-tokens="fetchWalletTokens"
      @fetch-position="selectedPocket && profileStore.fetchPocketPosition(selectedPocket)"
      @select-token="handleSelectToken"
      @update-amount="handleUpdateAmount"
      @change-mode="handleChangeMode"
    />

    <!-- Delete Confirmation -->
    <AlertDialog v-model:open="showDeleteConfirm">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete pocket?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <span class="font-medium text-foreground">{{ pocketToDelete?.name }}</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deletingPocket">Cancel</AlertDialogCancel>
          <AlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="deletingPocket"
            @click.prevent="confirmDeletePocket"
          >
            <Icon v-if="deletingPocket" name="lucide:loader-2" class="w-4 h-4 mr-1.5 animate-spin" />
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
