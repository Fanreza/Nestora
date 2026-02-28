<script setup lang="ts">
import { formatUnits } from 'viem'
import { STRATEGIES, type StrategyKey } from '~/config/strategies'
import type { DbPocket } from '~/types/database'

const props = defineProps<{
  pocket: DbPocket
  position: { shares: bigint; value: bigint }
  assetPrice: number
  apy: string | null
  profit: string | null
}>()

defineEmits<{
  click: []
  deposit: []
  withdraw: []
  delete: []
}>()

const RISK_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  conservative: { label: 'Low risk', icon: 'lucide:shield', color: 'text-emerald-400' },
  balanced: { label: 'Medium risk', icon: 'lucide:scale', color: 'text-blue-400' },
  aggressive: { label: 'High risk', icon: 'lucide:zap', color: 'text-violet-400' },
}

const STRATEGY_LABELS: Record<string, string> = {
  conservative: 'Savings',
  balanced: 'Growth',
  aggressive: 'High Growth',
}

const strategy = computed(() => STRATEGIES[props.pocket.strategy_key as StrategyKey])
const risk = computed(() => RISK_LABELS[props.pocket.strategy_key])

const assetValue = computed(() => {
  if (!props.position || props.position.value === 0n || !strategy.value) return 0
  return parseFloat(formatUnits(props.position.value, strategy.value.decimals))
})

const currentValueFormatted = computed(() => {
  if (assetValue.value === 0) return '0'
  if (assetValue.value < 0.000001) return '<0.000001'
  return assetValue.value.toLocaleString('en-US', { maximumFractionDigits: 4 })
})

const usdValue = computed(() => assetValue.value * props.assetPrice)

const progress = computed(() => {
  if (!props.pocket.target_amount || props.pocket.target_amount === 0) return 0
  if (usdValue.value === 0) return 0
  return Math.min(Math.round((usdValue.value / props.pocket.target_amount) * 100), 100)
})

const apyFormatted = computed(() => {
  if (!props.apy) return null
  const val = parseFloat(props.apy)
  if (isNaN(val)) return null
  return val.toFixed(2) + '%'
})

const profitFormatted = computed(() => {
  if (!props.profit) return null
  const val = parseFloat(props.profit)
  if (isNaN(val) || val === 0) return null
  const sign = val > 0 ? '+' : ''
  const formatted = Math.abs(val) < 0.0001
    ? (val > 0 ? '<+0.0001' : '<-0.0001')
    : sign + val.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return formatted
})

const timelineDisplay = computed(() => {
  if (!props.pocket.timeline) return null
  const target = new Date(props.pocket.timeline)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  const dateStr = target.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  if (diffDays < 0) return { date: dateStr, remaining: 'Past due' }
  if (diffDays === 0) return { date: dateStr, remaining: 'Today' }
  return { date: dateStr, remaining: `${diffDays}d left` }
})

function displayUsd(value: number): string {
  if (value === 0) return '$0'
  return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
</script>

<template>
  <Card
    class="group cursor-pointer border-transparent hover:border-green-500/40 hover:shadow-lg transition-all duration-300"
    @click="$emit('click')"
  >
    <CardContent class="p-5">
      <!-- Top: Icon + Name + Strategy + APY -->
      <div class="flex items-center gap-3 mb-4">
        <div
          class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          :class="{
            'bg-emerald-500/10': pocket.strategy_key === 'conservative',
            'bg-blue-500/10': pocket.strategy_key === 'balanced',
            'bg-violet-500/10': pocket.strategy_key === 'aggressive',
          }"
        >
          <Icon
            :name="risk?.icon || 'lucide:wallet'"
            class="w-5 h-5"
            :class="risk?.color"
          />
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="font-semibold text-sm truncate">{{ pocket.name }}</h3>
          <p class="text-xs text-muted-foreground">
            {{ STRATEGY_LABELS[pocket.strategy_key] || pocket.strategy_key }}
            · {{ risk?.label }}
          </p>
        </div>
        <Badge
          v-if="apyFormatted"
          variant="secondary"
          class="shrink-0 text-xs font-medium"
        >
          {{ apyFormatted }} APY
        </Badge>
      </div>

      <!-- Middle: USD hero value + profit -->
      <div class="mb-4">
        <div class="flex items-baseline gap-2">
          <p class="text-2xl font-bold tracking-tight">
            {{ displayUsd(usdValue) }}
          </p>
          <span
            v-if="profitFormatted"
            class="text-xs font-medium"
            :class="parseFloat(profit || '0') >= 0 ? 'text-emerald-500' : 'text-red-500'"
          >
            {{ profitFormatted }} {{ strategy?.assetLabel }}
          </span>
        </div>
        <p class="text-xs text-muted-foreground mt-0.5">
          {{ currentValueFormatted }} {{ strategy?.assetLabel }}
          <span v-if="pocket.target_amount">
            · {{ displayUsd(pocket.target_amount) }} target
          </span>
        </p>
      </div>

      <!-- Timeline -->
      <div v-if="timelineDisplay" class="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
        <Icon name="lucide:calendar" class="w-3.5 h-3.5" />
        <span>{{ timelineDisplay.date }}</span>
        <span class="text-foreground/60">·</span>
        <span :class="timelineDisplay.remaining === 'Past due' ? 'text-red-500' : ''">
          {{ timelineDisplay.remaining }}
        </span>
      </div>

      <!-- Progress bar -->
      <div v-if="pocket.target_amount" class="mb-4">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs text-muted-foreground">Progress</span>
          <span class="text-xs font-medium">{{ progress }}%</span>
        </div>
        <div class="h-2.5 rounded-full bg-muted overflow-hidden">
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
      </div>

      <!-- Actions (always visible) -->
      <div class="flex items-center gap-2 pt-2 border-t border-border/50">
        <Button
          size="sm"
          variant="outline"
          class="h-8 text-xs flex-1"
          @click.stop="$emit('deposit')"
        >
          <Icon name="lucide:arrow-down-to-line" class="w-3.5 h-3.5 mr-1" />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          class="h-8 text-xs flex-1"
          @click.stop="$emit('withdraw')"
        >
          <Icon name="lucide:arrow-up-from-line" class="w-3.5 h-3.5 mr-1" />
          Cash Out
        </Button>
        <Button
          size="sm"
          variant="ghost"
          class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          @click.stop="$emit('delete')"
        >
          <Icon name="lucide:trash-2" class="w-3.5 h-3.5" />
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
