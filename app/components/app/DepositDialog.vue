<script setup lang="ts">
import { parseUnits, formatUnits } from 'viem'
import { STRATEGIES, type StrategyKey } from '~/config/strategies'
import type { DbPocket } from '~/types/database'
import type { TxState } from '~/composables/useVault'
import type { ZapQuote } from '~/composables/useEnso'
import type { WalletToken } from '~/composables/useWalletTokens'

// ---- Props ----
const props = defineProps<{
  pocket: DbPocket | null
  position: { shares: bigint; value: bigint }
  txState: TxState
  txHash: `0x${string}` | null
  txError: string
  walletTokens: WalletToken[]
  loadingTokens: boolean
  loadingPosition: boolean
  fetchingQuote: boolean
  zapQuote: ZapQuote | null
  nativeToken: string
  assetPrice: number
}>()

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  deposit: [payload: { tokenIn: `0x${string}`; amount: string; isDirect: boolean }]
  withdraw: [amount: string]
  reset: []
  fetchTokens: []
  fetchPosition: []
  selectToken: [token: `0x${string}`]
  updateAmount: [amount: string]
  changeMode: [mode: 'deposit' | 'withdraw']
}>()

// ---- Local state ----
const mode = ref<'deposit' | 'withdraw'>('deposit')
const view = ref<'select-token' | 'amount'>('select-token')
const amount = ref('')
const selectedTokenAddr = ref<`0x${string}` | null>(null)
const tokenSearch = ref('')

// ---- Computed ----
const strategy = computed(() =>
  props.pocket ? STRATEGIES[props.pocket.strategy_key as StrategyKey] : null,
)

const riskLabel = computed(() => {
  const labels: Record<string, string> = {
    conservative: 'Low risk',
    balanced: 'Medium risk',
    aggressive: 'High risk',
  }
  return labels[props.pocket?.strategy_key || ''] || ''
})

const strategyLabel = computed(() => {
  const labels: Record<string, string> = {
    conservative: 'Savings',
    balanced: 'Growth',
    aggressive: 'High Growth',
  }
  return labels[props.pocket?.strategy_key || ''] || ''
})

const selectedTokenBalance = computed<WalletToken | null>(() => {
  if (!selectedTokenAddr.value) return null
  return props.walletTokens.find(
    t => t.token?.toLowerCase() === selectedTokenAddr.value?.toLowerCase(),
  ) ?? null
})

function isDirectToken(tokenAddr: string): boolean {
  if (!strategy.value) return false
  const vaultAsset = strategy.value.type === 'native'
    ? props.nativeToken
    : strategy.value.assetAddress
  return tokenAddr.toLowerCase() === vaultAsset.toLowerCase()
}

const isDirectDeposit = computed(() => {
  if (!selectedTokenAddr.value || !strategy.value) return true
  const vaultAsset = strategy.value.type === 'native'
    ? props.nativeToken
    : strategy.value.assetAddress
  return selectedTokenAddr.value.toLowerCase() === vaultAsset.toLowerCase()
})

const isVaultToken = (tokenAddr: string): boolean => {
  if (!strategy.value) return false
  return tokenAddr.toLowerCase() === strategy.value.vaultAddress.toLowerCase()
}

const availableTokens = computed(() =>
  props.walletTokens.filter(t => !isVaultToken(t.token)),
)

const directDepositTokens = computed(() =>
  availableTokens.value.filter(t => isDirectToken(t.token)),
)

const filteredTokens = computed(() => {
  const q = tokenSearch.value.toLowerCase().trim()
  if (!q) return availableTokens.value
  return availableTokens.value.filter(t =>
    t.symbol.toLowerCase().includes(q)
    || t.name.toLowerCase().includes(q)
    || t.token.toLowerCase().includes(q),
  )
})

const parsedAmount = computed(() => {
  if (!strategy.value || !amount.value) return 0n
  try { return parseUnits(amount.value, strategy.value.decimals) }
  catch { return 0n }
})

const canSubmit = computed(() => {
  if (props.txState !== 'idle') return false
  if (!amount.value) return false
  if (mode.value === 'withdraw') return parsedAmount.value > 0n
  if (isDirectDeposit.value) return parsedAmount.value > 0n
  return !!props.zapQuote
})

const isTxActive = computed(() =>
  !['idle', 'confirmed', 'failed'].includes(props.txState),
)

const withdrawableFormatted = computed(() => {
  if (!strategy.value || props.position.shares === 0n) return 0
  return Number(props.position.shares) / Math.pow(10, strategy.value.decimals)
})

const withdrawValueFormatted = computed(() => {
  if (!strategy.value || props.position.value === 0n) return 0
  return Number(props.position.value) / Math.pow(10, strategy.value.decimals)
})

const positionUsdValue = computed(() => {
  if (!strategy.value || props.position.value === 0n) return 0
  const val = parseFloat(formatUnits(props.position.value, strategy.value.decimals))
  return val * props.assetPrice
})

const TX_STATUS_LABEL: Record<TxState, string> = {
  idle: '',
  preparing: 'Getting things ready...',
  approving: 'Preparing your account...',
  awaiting_signature: 'Please confirm in your app',
  pending: 'Processing your transaction...',
  confirmed: 'All done!',
  failed: 'Something went wrong',
}

// ---- Methods ----
function formatTokenBal(t: TokenBalance): string {
  const raw = BigInt(t.amount)
  const formatted = Number(raw) / Math.pow(10, t.decimals)
  if (formatted < 0.000001) return '<0.000001'
  if (formatted < 1) return formatted.toPrecision(4)
  return formatted.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

function formatUsd(v: number): string {
  if (v < 0.01) return '<$0.01'
  return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function formatCompactBal(val: number): string {
  if (val === 0) return '0'
  if (val < 0.0001) return val.toPrecision(2)
  if (val < 1) return val.toPrecision(4)
  if (val < 1000) return val.toFixed(2)
  return val.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function displayNum(value: string, maxDec = 6): string {
  const n = parseFloat(value)
  if (isNaN(n) || n === 0) return '0'
  if (n < 1 / Math.pow(10, maxDec)) return n.toPrecision(2)
  return n.toLocaleString('en-US', { maximumFractionDigits: maxDec })
}

function selectToken(token: WalletToken) {
  selectedTokenAddr.value = token.token as `0x${string}`
  amount.value = ''
  view.value = 'amount'
  emit('selectToken', token.token as `0x${string}`)
}

function setMaxAmount() {
  if (!selectedTokenBalance.value) return
  amount.value = selectedTokenBalance.value.formattedBal.toString()
}

function setPercentAmount(pct: number) {
  if (!selectedTokenBalance.value) return
  amount.value = (selectedTokenBalance.value.formattedBal * (pct / 100)).toString()
}

function setWithdrawMax() {
  if (!strategy.value || props.position.shares === 0n) return
  amount.value = formatUnits(props.position.shares, strategy.value.decimals)
}

function setWithdrawPercent(pct: number) {
  if (!strategy.value || props.position.shares === 0n) return
  const total = Number(props.position.shares)
  const portion = BigInt(Math.floor(total * (pct / 100)))
  amount.value = formatUnits(portion, strategy.value.decimals)
}

function resetForm() {
  mode.value = 'deposit'
  view.value = 'select-token'
  amount.value = ''
  selectedTokenAddr.value = null
  tokenSearch.value = ''
}

watch(open, (v) => {
  if (!v) {
    resetForm()
    emit('reset')
  }
})

function switchMode(newMode: 'deposit' | 'withdraw') {
  mode.value = newMode
  amount.value = ''
  selectedTokenAddr.value = null
  view.value = newMode === 'deposit' ? 'select-token' : 'amount'
  emit('changeMode', newMode)
  emit('reset')
}

function handleAction() {
  if (props.txState === 'confirmed' || props.txState === 'failed') {
    emit('reset')
    return
  }
  if (mode.value === 'withdraw') {
    emit('withdraw', amount.value)
  } else {
    emit('deposit', {
      tokenIn: selectedTokenAddr.value!,
      amount: amount.value,
      isDirect: isDirectDeposit.value,
    })
  }
}

// Emit amount changes for zap quote debouncing in parent
watch(amount, (v) => emit('updateAmount', v))

// ---- Expose open method for parent ----
function openFor(pocket: DbPocket, openMode: 'deposit' | 'withdraw' = 'deposit') {
  mode.value = openMode
  view.value = openMode === 'deposit' ? 'select-token' : 'amount'
  amount.value = ''
  selectedTokenAddr.value = null
  tokenSearch.value = ''
  open.value = true
}

defineExpose({ openFor })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md p-0 gap-0 overflow-hidden">
      <!-- Header -->
      <div class="px-6 pt-6 pb-3">
        <DialogHeader>
          <DialogTitle>{{ pocket?.name }}</DialogTitle>
          <DialogDescription>
            {{ strategyLabel }} · {{ riskLabel }}
          </DialogDescription>
        </DialogHeader>

        <!-- Current position -->
        <div v-if="loadingPosition" class="mt-3 p-3 bg-muted rounded-lg">
          <Skeleton class="h-3 w-24 mb-1.5" />
          <Skeleton class="h-6 w-36 mb-1" />
          <Skeleton class="h-4 w-16" />
        </div>
        <div v-else-if="position.value > 0n && strategy" class="mt-3 p-3 bg-muted rounded-lg">
          <p class="text-xs text-muted-foreground mb-0.5">Currently earning</p>
          <p class="text-lg font-semibold font-mono">
            {{ displayNum(formatUnits(position.value, strategy.decimals), 4) }}
            {{ strategy.assetLabel }}
          </p>
          <p v-if="positionUsdValue > 0" class="text-sm text-muted-foreground font-mono">
            {{ formatUsd(positionUsdValue) }}
          </p>
        </div>

        <!-- Mode tabs -->
        <Tabs class="mt-4" :default-value="mode" @update:model-value="(v: any) => switchMode(v)">
          <TabsList class="w-full">
            <TabsTrigger value="deposit" class="flex-1">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw" class="flex-1">Withdraw</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <!-- ===== VIEW: SELECT TOKEN (deposit mode) ===== -->
      <div v-if="mode === 'deposit' && view === 'select-token'" class="px-6 pb-6">
        <h3 class="text-base font-bold mb-3 text-center">Select your asset</h3>

        <!-- Search -->
        <div class="relative mb-4">
          <Icon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            v-model="tokenSearch"
            placeholder="Search token name or paste address"
            class="pl-9 h-10"
          />
        </div>

        <!-- Loading -->
        <div v-if="loadingTokens" class="space-y-4">
          <div>
            <Skeleton class="h-3.5 w-32 mb-2" />
            <div class="flex gap-2">
              <Skeleton class="h-9 w-24 rounded-lg" />
            </div>
          </div>
          <div>
            <Skeleton class="h-3.5 w-24 mb-2" />
            <div class="space-y-1">
              <div v-for="i in 3" :key="i" class="flex items-center gap-3 px-3 py-2.5">
                <Skeleton class="w-8 h-8 rounded-full shrink-0" />
                <div class="flex-1">
                  <Skeleton class="h-4 w-16 mb-1" />
                  <Skeleton class="h-3 w-10" />
                </div>
                <div class="text-right">
                  <Skeleton class="h-4 w-14 mb-1 ml-auto" />
                  <Skeleton class="h-3 w-20 ml-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <template v-else>
          <!-- Direct deposit tokens -->
          <div v-if="directDepositTokens.length > 0 && !tokenSearch" class="mb-4">
            <p class="text-xs font-medium text-muted-foreground mb-2">Direct deposit tokens</p>
            <div class="flex gap-2 flex-wrap">
              <button
                v-for="t in directDepositTokens"
                :key="t.token"
                class="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all"
                @click="selectToken(t)"
              >
                <img
                  v-if="t.logoUri"
                  :src="t.logoUri"
                  :alt="t.symbol"
                  class="w-5 h-5 rounded-full"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                >
                <span class="text-sm font-medium">{{ t.symbol }}</span>
                <span class="text-[11px] text-muted-foreground">Base</span>
              </button>
            </div>
          </div>

          <!-- Your tokens -->
          <div>
            <p class="text-xs font-medium text-muted-foreground mb-2">Your tokens</p>
            <div class="space-y-1 max-h-64 overflow-y-auto -mx-1 px-1">
              <button
                v-for="token in filteredTokens"
                :key="token.token"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-muted/60"
                @click="selectToken(token)"
              >
                <img
                  v-if="token.logoUri"
                  :src="token.logoUri"
                  :alt="token.symbol"
                  class="w-8 h-8 rounded-full"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                >
                <div v-else class="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <span class="text-xs font-bold text-muted-foreground">{{ token.symbol?.charAt(0) }}</span>
                </div>
                <div class="flex-1 text-left min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-semibold">{{ token.symbol }}</p>
                    <Badge
                      v-if="isDirectToken(token.token)"
                      variant="outline"
                      class="text-[10px] px-1.5 py-0 h-4 border-primary/40 text-primary"
                    >
                      Direct deposit
                    </Badge>
                  </div>
                  <p class="text-[11px] text-muted-foreground">Base</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-sm font-semibold">{{ formatUsd(token.usdValue) }}</p>
                  <p class="text-[11px] text-muted-foreground font-mono">{{ formatTokenBal(token) }}</p>
                </div>
              </button>

              <p v-if="filteredTokens.length === 0" class="text-xs text-muted-foreground text-center py-6">
                {{ tokenSearch ? 'No tokens match your search' : 'No tokens found in your wallet' }}
              </p>
            </div>
          </div>
        </template>
      </div>

      <!-- ===== VIEW: AMOUNT INPUT ===== -->
      <div v-else class="px-6 pb-6 space-y-4">
        <!-- Selected token display + amount (deposit mode) -->
        <div v-if="mode === 'deposit' && selectedTokenBalance" class="space-y-3">
          <p class="text-xs font-medium text-muted-foreground text-center">Select the asset you want to deposit</p>
          <div class="flex items-center gap-3 p-3 rounded-xl border">
            <!-- Token selector trigger -->
            <button
              class="flex items-center gap-2.5 min-w-0 shrink-0"
              @click="view = 'select-token'; tokenSearch = ''"
            >
              <img
                v-if="selectedTokenBalance.logoUri"
                :src="selectedTokenBalance.logoUri"
                :alt="selectedTokenBalance.symbol"
                class="w-9 h-9 rounded-full"
                @error="($event.target as HTMLImageElement).style.display = 'none'"
              >
              <div v-else class="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <span class="text-xs font-bold">{{ selectedTokenBalance.symbol?.charAt(0) }}</span>
              </div>
              <div class="text-left">
                <p class="text-sm font-semibold">{{ selectedTokenBalance.symbol }}</p>
                <p class="text-[11px] text-muted-foreground">Base</p>
              </div>
              <Icon name="lucide:chevron-down" class="w-4 h-4 text-muted-foreground" />
            </button>

            <!-- Amount input -->
            <div class="flex-1 text-right">
              <input
                v-model="amount"
                type="text"
                inputmode="decimal"
                placeholder="0"
                class="w-full text-right font-semibold font-mono bg-transparent outline-none placeholder:text-muted-foreground"
                :class="amount && amount.length > 12 ? 'text-sm' : 'text-xl'"
                :disabled="txState !== 'idle'"
              >
              <p class="text-[11px] text-muted-foreground font-mono">
                {{ amount ? formatUsd(Number(amount || 0) * (selectedTokenBalance.usdPrice || 0)) : '$0.00' }}
              </p>
            </div>
          </div>

          <!-- Percentage buttons -->
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="pct in [10, 25, 50, 75]"
              :key="pct"
              class="py-2 rounded-lg border text-xs font-medium transition-all hover:border-primary/30 hover:bg-primary/5"
              :disabled="txState !== 'idle'"
              @click="setPercentAmount(pct)"
            >
              {{ pct }}%
            </button>
            <button
              class="py-2 rounded-lg border text-xs font-medium transition-all hover:border-primary/30 hover:bg-primary/5 flex flex-col items-center"
              :disabled="txState !== 'idle'"
              @click="setMaxAmount"
            >
              <span class="font-bold">MAX</span>
              <span class="text-[10px] text-muted-foreground font-mono">{{ formatCompactBal(selectedTokenBalance.formattedBal) }}</span>
            </button>
          </div>
        </div>

        <!-- Withdraw amount input -->
        <div v-if="mode === 'withdraw' && strategy" class="space-y-3">
          <p class="text-xs font-medium text-muted-foreground text-center">How much do you want to withdraw?</p>

          <!-- Loading position -->
          <div v-if="loadingPosition" class="space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-xl border">
              <Skeleton class="w-9 h-9 rounded-full shrink-0" />
              <div>
                <Skeleton class="h-4 w-20 mb-1" />
                <Skeleton class="h-3 w-14" />
              </div>
              <div class="flex-1 text-right">
                <Skeleton class="h-7 w-16 ml-auto mb-1" />
                <Skeleton class="h-3 w-24 ml-auto" />
              </div>
            </div>
            <div class="grid grid-cols-5 gap-2">
              <Skeleton v-for="i in 5" :key="i" class="h-10 rounded-lg" />
            </div>
          </div>

          <!-- Vault token + amount input -->
          <div v-else class="flex items-center gap-3 p-3 rounded-xl border">
            <div class="flex items-center gap-2.5 shrink-0">
              <img
                v-if="strategy.vaultLogo"
                :src="strategy.vaultLogo"
                :alt="strategy.vaultSymbol"
                class="w-9 h-9 rounded-full"
                @error="($event.target as HTMLImageElement).style.display = 'none'"
              >
              <div v-else class="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <Icon :name="strategy.icon" class="w-5 h-5" />
              </div>
              <div class="text-left">
                <p class="text-sm font-semibold">{{ strategy.assetLabel }}</p>
                <p class="text-[11px] text-muted-foreground">{{ strategy.vaultSymbol }}</p>
              </div>
            </div>

            <div class="flex-1 text-right">
              <input
                v-model="amount"
                type="text"
                inputmode="decimal"
                placeholder="0"
                class="w-full text-right font-semibold font-mono bg-transparent outline-none placeholder:text-muted-foreground"
                :class="amount && amount.length > 12 ? 'text-sm' : 'text-xl'"
                :disabled="txState !== 'idle'"
              >
              <p class="text-[11px] text-muted-foreground font-mono">
                {{ withdrawableFormatted > 0 ? displayNum(withdrawValueFormatted.toString(), 4) + ' ' + strategy.assetSymbol : '0' }}
              </p>
            </div>
          </div>

          <!-- Percentage buttons -->
          <div v-if="!loadingPosition" class="grid grid-cols-5 gap-2">
            <button
              v-for="pct in [10, 25, 50, 75]"
              :key="pct"
              class="py-2 rounded-lg border text-xs font-medium transition-all hover:border-primary/30 hover:bg-primary/5"
              :disabled="txState !== 'idle' || position.shares === 0n"
              @click="setWithdrawPercent(pct)"
            >
              {{ pct }}%
            </button>
            <button
              class="py-2 rounded-lg border text-xs font-medium transition-all hover:border-primary/30 hover:bg-primary/5 flex flex-col items-center"
              :disabled="txState !== 'idle' || position.shares === 0n"
              @click="setWithdrawMax"
            >
              <span class="font-bold">MAX</span>
              <span class="text-[10px] text-muted-foreground font-mono">{{ formatCompactBal(withdrawableFormatted) }}</span>
            </button>
          </div>

          <!-- No balance notice -->
          <p v-if="!loadingPosition && position.shares === 0n" class="text-xs text-muted-foreground text-center py-2">
            No funds to withdraw yet. Deposit first to start earning.
          </p>
        </div>

        <!-- Zap route preview -->
        <div
          v-if="zapQuote && !isDirectDeposit && mode === 'deposit'"
          class="p-3 bg-muted rounded-lg space-y-1"
        >
          <p class="text-xs text-muted-foreground">Route preview</p>
          <p class="text-sm">
            Swap → deposit into {{ strategy?.assetLabel }} vault
          </p>
          <p class="text-xs text-muted-foreground font-mono">
            Expected: ~{{ displayNum(formatUnits(BigInt(zapQuote.amountOut), strategy?.decimals ?? 18), 4) }}
            {{ strategy?.vaultSymbol }}
          </p>
        </div>

        <div v-if="fetchingQuote" class="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon name="lucide:loader-2" class="w-3.5 h-3.5 animate-spin" />
          Finding best route...
        </div>

        <!-- Confetti on success -->
        <div v-if="txState === 'confirmed'" class="relative flex justify-center -mb-2">
          <div class="absolute inset-x-0 flex justify-center pointer-events-none">
            <span
              v-for="i in 12"
              :key="i"
              class="absolute w-2 h-2 rounded-full animate-confetti"
              :class="[
                ['bg-primary', 'bg-emerald-400', 'bg-blue-400', 'bg-violet-400', 'bg-amber-400', 'bg-pink-400'][i % 6],
              ]"
              :style="{
                left: `${15 + (i * 70 / 12)}%`,
                animationDelay: `${i * 0.08}s`,
                transform: `rotate(${i * 30}deg)`,
              }"
            />
          </div>
        </div>

        <!-- Action button -->
        <Button
          class="w-full h-12 text-base"
          :class="txState !== 'failed' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''"
          :variant="txState === 'failed' ? 'destructive' : 'default'"
          :disabled="!canSubmit && txState === 'idle'"
          @click="handleAction"
        >
          <template v-if="isTxActive">
            <Icon name="lucide:loader-2" class="w-4 h-4 mr-2 animate-spin" />
            {{ TX_STATUS_LABEL[txState] }}
          </template>
          <template v-else-if="txState === 'confirmed'">
            <Icon name="lucide:check-circle" class="w-4 h-4 mr-2" />
            All done!
          </template>
          <template v-else-if="txState === 'failed'">
            <Icon name="lucide:rotate-ccw" class="w-4 h-4 mr-2" />
            Try again
          </template>
          <template v-else>
            {{ mode === 'deposit' ? 'Add Money' : 'Cash Out' }}
          </template>
        </Button>

        <!-- TX STATUS -->
        <div v-if="txState !== 'idle'" class="space-y-2 pt-1">
          <div class="flex items-center gap-2 text-sm">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :class="{
                'bg-amber-400 animate-pulse': isTxActive,
                'bg-primary': txState === 'confirmed',
                'bg-destructive': txState === 'failed',
              }"
            />
            <span
              :class="{
                'text-muted-foreground': isTxActive,
                'text-primary': txState === 'confirmed',
                'text-destructive': txState === 'failed',
              }"
            >
              {{ TX_STATUS_LABEL[txState] }}
            </span>
          </div>

          <p v-if="txError" class="text-xs text-destructive">
            {{ txError }}
          </p>

          <a
            v-if="txHash"
            :href="`https://basescan.org/tx/${txHash}`"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View receipt
            <Icon name="lucide:external-link" class="w-3 h-3" />
          </a>
        </div>

        <!-- Trust micro-copy -->
        <div class="flex items-center justify-center gap-1.5 pt-3 text-[11px] text-muted-foreground/50">
          <Icon name="lucide:shield-check" class="w-3 h-3" />
          Self custody · Smart routed by Enso · Yield by YO
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
