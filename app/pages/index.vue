<script setup lang="ts">
import { STRATEGY_LIST } from '~/config/strategies'

useHead({
  title: 'Nestora — Smart Savings on Base',
  meta: [
    { name: 'description', content: 'Earn yield on your savings with Nestora. Simple, non-custodial DeFi savings on Base network.' },
  ],
})
</script>

<template>
  <div class="dark">
    <div class="bg-background text-foreground min-h-screen">
      <LandingNav />

      <main>
        <LandingHero />

        <!-- Separator -->
        <div class="w-full h-px bg-white/6" />

        <LandingFeatures />

        <!-- Separator -->
        <div class="w-full h-px bg-white/6" />

        <LandingStrategies :strategies="STRATEGY_LIST" />

        <!-- Separator -->
        <div class="w-full h-px bg-white/6" />

        <LandingHowItWorks />

        <!-- Separator -->
        <div class="w-full h-px bg-white/6" />

        <LandingTrust />
      </main>

      <LandingFooter />
    </div>
  </div>
</template>
