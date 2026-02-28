<script setup lang="ts">
import type { DbPocket } from '~/types/database'

const props = defineProps<{
  pocket: DbPocket
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  saved: []
}>()

const name = ref('')
const targetAmount = ref<number | undefined>()
const timeline = ref('')
const saving = ref(false)

const profileStore = useProfileStore()

watch(open, (v) => {
  if (v) {
    name.value = props.pocket.name
    targetAmount.value = props.pocket.target_amount ?? undefined
    timeline.value = props.pocket.timeline ?? ''
  }
})

async function handleSave() {
  if (!name.value.trim()) return
  saving.value = true
  try {
    const ok = await profileStore.updatePocket(props.pocket.id, {
      name: name.value.trim(),
      target_amount: targetAmount.value || undefined,
      timeline: timeline.value || undefined,
    })
    if (ok) {
      open.value = false
      emit('saved')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Edit Pocket</DialogTitle>
        <DialogDescription>
          Update your pocket details.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <label class="text-sm font-medium">Name</label>
          <Input v-model="name" placeholder="e.g. Emergency Fund" />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Target amount (USD)</label>
          <Input
            v-model.number="targetAmount"
            type="number"
            placeholder="e.g. 1000"
            min="0"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium">Timeline</label>
          <Input
            v-model="timeline"
            type="date"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">
          Cancel
        </Button>
        <Button
          class="bg-primary text-primary-foreground hover:bg-primary/90"
          :disabled="!name.trim() || saving"
          @click="handleSave"
        >
          <Icon v-if="saving" name="lucide:loader-2" class="w-4 h-4 mr-1.5 animate-spin" />
          Save
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
