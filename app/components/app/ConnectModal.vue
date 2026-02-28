<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineEmits<{
  wallet: []
  smartAccount: []
}>()
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-90 p-0 gap-0 overflow-hidden">
      <div class="px-6 pt-6 pb-4 text-center">
        <div class="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
          <Icon name="lucide:lock-keyhole" class="w-6 h-6 text-white" />
        </div>
        <DialogHeader class="space-y-1">
          <DialogTitle class="text-center">Sign In</DialogTitle>
          <DialogDescription class="text-center">
            Choose how you'd like to sign in
          </DialogDescription>
        </DialogHeader>
      </div>

      <div class="px-6 pb-6 space-y-2">
        <button
          class="w-full flex items-center gap-3 p-3.5 rounded-xl bg-muted/50 border border-border
                 hover:bg-muted hover:border-primary/30 transition-all active:scale-[0.98] group"
          @click="$emit('wallet')"
        >
          <div class="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center group-hover:border-primary/30">
            <Icon name="lucide:wallet" class="w-4.5 h-4.5 text-foreground" />
          </div>
          <div class="text-left flex-1">
            <p class="font-medium text-sm">I have a wallet</p>
            <p class="text-[11px] text-muted-foreground">MetaMask, Rabby, or other apps</p>
          </div>
          <Icon name="lucide:chevron-right" class="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>

        <div class="flex items-center gap-3 px-2">
          <div class="flex-1 h-px bg-border" />
          <span class="text-[11px] text-muted-foreground">or</span>
          <div class="flex-1 h-px bg-border" />
        </div>

        <button
          class="w-full flex items-center gap-3 p-3.5 rounded-xl bg-muted/50 border border-border
                 hover:bg-muted hover:border-blue-500/30 transition-all active:scale-[0.98] group"
          @click="$emit('smartAccount')"
        >
          <div class="w-9 h-9 rounded-lg bg-background border border-border flex items-center justify-center group-hover:border-blue-500/30">
            <Icon name="lucide:fingerprint" class="w-4.5 h-4.5 text-foreground" />
          </div>
          <div class="text-left flex-1">
            <p class="font-medium text-sm">Email or Passkey</p>
            <p class="text-[11px] text-muted-foreground">No wallet needed — powered by Coinbase</p>
          </div>
          <Icon name="lucide:chevron-right" class="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
