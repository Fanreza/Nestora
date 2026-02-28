<script setup lang="ts">
import { formatUnits } from 'viem'
import { STRATEGIES, type StrategyKey } from '~/config/strategies'
import type { DbPocket, DbTransaction } from '~/types/database'
import { useVault } from '~/composables/useVault'
import { useWallet } from '~/composables/useWallet'
import { useCoinGecko } from '~/composables/useCoinGecko'
import { useUserData } from '~/composables/useUserData'
import { storeToRefs } from 'pinia'
import { useProfileStore } from '~/stores/useProfileStore'
import type { VaultSnapshot, UserPerformance } from '@yo-protocol/core'

const route = useRoute()
const pocketId = route.params.id as string

const { address, isConnected } = useWallet()
const profileStore = useProfileStore()
const { pockets } = storeToRefs(profileStore)
const { getShareBalance, getShareValue, getVaultSnapshot, getUserHistory, getUserPerformance } = useVault()
const { getTokenPrices } = useCoinGecko()
const { getTransactions } = useUserData()

// ---- Pocket ----
const pocket = computed(() => pockets.value.find(p => p.id === pocketId) ?? null)
const strategy = computed(() =>
  pocket.value ? STRATEGIES[pocket.value.strategy_key as StrategyKey] : null,
)

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  conservative: { label: 'Low risk', color: 'text-emerald-500' },
  balanced: { label: 'Medium risk', color: 'text-blue-500' },
  aggressive: { label: 'High risk', color: 'text-violet-500' },
}

const STRATEGY_LABELS: Record<string, string> = {
  conservative: 'Savings',
  balanced: 'Growth',
  aggressive: 'High Growth',
}

// ---- Position ----
const position = ref<{ shares: bigint; value: bigint }>({ shares: 0n, value: 0n })
const loadingPosition = ref(false)

async function fetchPosition() {
  if (!strategy.value || !address.value) return
  loadingPosition.value = true
  try {
    const shares = await getShareBalance(strategy.value)
    const value = await getShareValue(strategy.value, shares)
    position.value = { shares, value }
  } catch (e) {
    console.error('[pocket detail] position fetch failed:', e)
  } finally {
    loadingPosition.value = false
  }
}

// ---- Asset price ----
const assetPrice = ref(0)

async function fetchPrice() {
  if (!strategy.value) return
  try {
    const prices = await getTokenPrices([strategy.value.assetAddress])
    assetPrice.value = prices[strategy.value.assetAddress.toLowerCase()] ?? 0
  } catch (e) {
    console.error('[pocket detail] price fetch failed:', e)
  }
}

// ---- Vault snapshot (APY) ----
const snapshot = ref<VaultSnapshot | null>(null)

async function fetchSnapshot() {
  if (!strategy.value) return
  try {
    snapshot.value = await getVaultSnapshot(strategy.value)
  } catch (e) {
    console.error('[pocket detail] snapshot fetch failed:', e)
  }
}

// ---- User performance (profit) ----
const performance = ref<UserPerformance | null>(null)

async function fetchPerformance() {
  if (!strategy.value || !address.value) return
  try {
    performance.value = await getUserPerformance(strategy.value, address.value)
  } catch (e) {
    console.error('[pocket detail] performance fetch failed:', e)
  }
}

// ---- Transaction history ----
// Combined from Supabase (local) + Yo API
interface HistoryEntry {
  type: 'deposit' | 'withdraw' | 'redeem'
  timestamp: number
  amount: string
  txHash: string
}
const history = ref<HistoryEntry[]>([])
const loadingHistory = ref(false)

async function fetchHistory() {
  if (!strategy.value || !address.value) return
  loadingHistory.value = true
  try {
    // Fetch from both sources in parallel
    const [dbTxs, apiTxs] = await Promise.all([
      getTransactions(pocketId),
      getUserHistory(strategy.value, address.value),
    ])

    // Merge: dedupe by tx_hash, prefer Supabase data
    const seen = new Set<string>()
    const merged: HistoryEntry[] = []

    // Supabase transactions first (pocket-specific)
    for (const tx of dbTxs) {
      seen.add(tx.tx_hash.toLowerCase())
      merged.push({
        type: tx.type,
        timestamp: Math.floor(new Date(tx.created_at).getTime() / 1000),
        amount: tx.amount,
        txHash: tx.tx_hash,
      })
    }

    // Yo API transactions (vault-wide, may include other pockets)
    for (const tx of apiTxs) {
      if (seen.has(tx.txHash.toLowerCase())) continue
      merged.push({
        type: tx.type,
        timestamp: tx.timestamp,
        amount: tx.assets.formatted,
        txHash: tx.txHash,
      })
    }

    // Sort by timestamp desc
    merged.sort((a, b) => b.timestamp - a.timestamp)
    history.value = merged
  } catch (e) {
    console.error('[pocket detail] history fetch failed:', e)
    history.value = []
  } finally {
    loadingHistory.value = false
  }
}

// ---- Computed values ----
const assetValue = computed(() => {
  if (position.value.value === 0n || !strategy.value) return 0
  return parseFloat(formatUnits(position.value.value, strategy.value.decimals))
})

const usdValue = computed(() => assetValue.value * assetPrice.value)

const currentValueFormatted = computed(() => {
  if (assetValue.value === 0) return '0'
  if (assetValue.value < 0.000001) return '<0.000001'
  return assetValue.value.toLocaleString('en-US', { maximumFractionDigits: 6 })
})

const progress = computed(() => {
  if (!pocket.value?.target_amount || pocket.value.target_amount === 0) return 0
  if (usdValue.value === 0) return 0
  return Math.min(Math.round((usdValue.value / pocket.value.target_amount) * 100), 100)
})

const apyFormatted = computed(() => {
  const yld = snapshot.value?.yield
  if (!yld) return null
  const val = yld['7d'] ?? yld['30d'] ?? null
  if (!val) return null
  const num = parseFloat(val)
  if (isNaN(num)) return null
  return num.toFixed(2) + '%'
})

const profitFormatted = computed(() => {
  if (!performance.value) return null
  const val = parseFloat(performance.value.unrealized.formatted)
  if (isNaN(val) || val === 0) return null
  const sign = val > 0 ? '+' : ''
  return sign + val.toLocaleString('en-US', { maximumFractionDigits: 6 })
})

const timelineDisplay = computed(() => {
  if (!pocket.value?.timeline) return null
  const target = new Date(pocket.value.timeline)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  const dateStr = target.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  if (diffDays < 0) return { date: dateStr, remaining: 'Past due', overdue: true }
  if (diffDays === 0) return { date: dateStr, remaining: 'Today', overdue: false }
  return { date: dateStr, remaining: `${diffDays} days left`, overdue: false }
})

function displayUsd(value: number): string {
  if (value === 0) return '$0.00'
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatTxDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TX_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  deposit: { label: 'Deposit', icon: 'lucide:arrow-down-to-line', color: 'text-emerald-500' },
  withdraw: { label: 'Withdraw', icon: 'lucide:arrow-up-from-line', color: 'text-orange-500' },
  redeem: { label: 'Redeem', icon: 'lucide:arrow-up-from-line', color: 'text-orange-500' },
}

// ---- Edit dialog ----
const showEditDialog = ref(false)

function handleSaved() {
  profileStore.refreshPockets()
}

// ---- Fetch all data ----
async function loadAll() {
  await Promise.all([fetchPosition(), fetchPrice(), fetchSnapshot(), fetchPerformance(), fetchHistory()])
}

watch([pocket, address], () => {
  if (pocket.value && address.value) loadAll()
}, { immediate: true })

// Redirect if not connected or pocket not found
watch([isConnected, pocket], () => {
  if (!isConnected.value) navigateTo('/app')
  // Give pockets time to load from store before redirecting
}, { immediate: true })
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
        <Button variant="ghost" size="sm" class="h-8 w-8 p-0" @click="navigateTo('/app')">
          <Icon name="lucide:arrow-left" class="w-4 h-4" />
        </Button>
        <h1 class="text-sm font-semibold truncate">{{ pocket?.name || 'Pocket' }}</h1>
        <div class="ml-auto">
          <Button variant="ghost" size="sm" class="h-8" @click="showEditDialog = true">
            <Icon name="lucide:pencil" class="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>
    </header>

    <!-- Loading state -->
    <div v-if="!pocket" class="flex items-center justify-center py-20">
      <Icon name="lucide:loader-2" class="w-6 h-6 animate-spin text-muted-foreground" />
    </div>

    <main v-else class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Hero: Current value -->
      <div class="text-center mb-8">
        <p class="text-sm text-muted-foreground mb-1">Current value</p>
        <h2 class="text-4xl font-bold tracking-tight mb-1">{{ displayUsd(usdValue) }}</h2>
        <p class="text-sm text-muted-foreground">
          {{ currentValueFormatted }} {{ strategy?.assetLabel }}
        </p>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent class="p-4 text-center">
            <p class="text-xs text-muted-foreground mb-1">APY</p>
            <p class="text-lg font-semibold">{{ apyFormatted || '—' }}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="p-4 text-center">
            <p class="text-xs text-muted-foreground mb-1">Profit</p>
            <p
              class="text-lg font-semibold"
              :class="profitFormatted && parseFloat(performance?.unrealized.formatted || '0') >= 0 ? 'text-emerald-500' : 'text-red-500'"
            >
              {{ profitFormatted ? `${profitFormatted} ${strategy?.assetSymbol}` : '—' }}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent class="p-4 text-center">
            <p class="text-xs text-muted-foreground mb-1">Strategy</p>
            <p class="text-lg font-semibold">
              {{ STRATEGY_LABELS[pocket.strategy_key] || pocket.strategy_key }}
            </p>
            <p class="text-xs" :class="RISK_LABELS[pocket.strategy_key]?.color">
              {{ RISK_LABELS[pocket.strategy_key]?.label }}
            </p>
          </CardContent>
        </Card>
      </div>

      <!-- Timeline + Progress -->
      <Card v-if="pocket.target_amount || pocket.timeline" class="mb-6">
        <CardContent class="p-5">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="text-sm font-medium">Goal</p>
              <p v-if="pocket.target_amount" class="text-xs text-muted-foreground">
                {{ displayUsd(usdValue) }} of {{ displayUsd(pocket.target_amount) }}
              </p>
            </div>
            <div v-if="timelineDisplay" class="text-right">
              <p class="text-sm font-medium">{{ timelineDisplay.date }}</p>
              <p
                class="text-xs"
                :class="timelineDisplay.overdue ? 'text-red-500' : 'text-muted-foreground'"
              >
                {{ timelineDisplay.remaining }}
              </p>
            </div>
          </div>
          <div v-if="pocket.target_amount" class="w-full">
            <div class="h-3 rounded-full bg-muted overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="{
                  'bg-emerald-500': pocket.strategy_key === 'conservative',
                  'bg-blue-500': pocket.strategy_key === 'balanced',
                  'bg-violet-500': pocket.strategy_key === 'aggressive',
                }"
                :style="{ width: `${progress}%` }"
              />
            </div>
            <p class="text-xs text-muted-foreground mt-1.5 text-center">{{ progress }}% complete</p>
          </div>
        </CardContent>
      </Card>

      <!-- Transaction history -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold mb-3">Transaction History</h3>

        <div v-if="loadingHistory" class="flex items-center justify-center py-8">
          <Icon name="lucide:loader-2" class="w-5 h-5 animate-spin text-muted-foreground" />
        </div>

        <div v-else-if="history.length === 0" class="text-center py-8">
          <p class="text-sm text-muted-foreground">No transactions yet</p>
        </div>

        <div v-else class="space-y-2">
          <Card v-for="(tx, i) in history" :key="i">
            <CardContent class="p-4 flex items-center gap-3">
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                :class="tx.type === 'deposit' ? 'bg-emerald-500/10' : 'bg-orange-500/10'"
              >
                <Icon
                  :name="TX_TYPE_CONFIG[tx.type]?.icon || 'lucide:circle'"
                  class="w-4 h-4"
                  :class="TX_TYPE_CONFIG[tx.type]?.color"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">{{ TX_TYPE_CONFIG[tx.type]?.label || tx.type }}</p>
                <p class="text-xs text-muted-foreground">{{ formatTxDate(tx.timestamp) }}</p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm font-medium font-mono">
                  {{ tx.type === 'deposit' ? '+' : '-' }}{{ tx.amount }} {{ strategy?.assetSymbol }}
                </p>
                <a
                  :href="`https://basescan.org/tx/${tx.txHash}`"
                  target="_blank"
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  @click.stop
                >
                  View tx
                  <Icon name="lucide:external-link" class="w-3 h-3 inline ml-0.5" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>

    <!-- Edit Dialog -->
    <AppEditPocketDialog
      v-if="pocket"
      v-model:open="showEditDialog"
      :pocket="pocket"
      @saved="handleSaved"
    />
  </div>
</template>
