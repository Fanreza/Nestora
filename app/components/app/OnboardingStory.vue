<script setup lang="ts">
import { useTour } from '~/composables/useTour'

const { showDashboardTour } = useTour()

onMounted(() => {
  showDashboardTour()
})
</script>

<template>
  <div />
</template>

<style>
/* Custom styling for the tour popover */
.driver-popover.nestora-tour {
  background-color: hsl(150 10% 10%);
  border: 1px solid hsl(150 5% 20%);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  max-width: 320px;
}

.driver-popover.nestora-tour .driver-popover-title {
  font-size: 16px;
  font-weight: 700;
  color: hsl(140 8% 94%);
  font-family: 'Plus Jakarta Sans', sans-serif;
  margin-bottom: 4px;
}

.driver-popover.nestora-tour .driver-popover-description {
  font-size: 13px;
  color: hsl(140 5% 55%);
  line-height: 1.6;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.driver-popover.nestora-tour .driver-popover-progress-text {
  font-size: 11px;
  color: hsl(140 5% 40%);
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.driver-popover.nestora-tour .driver-popover-navigation-btns {
  gap: 8px;
}

.driver-popover.nestora-tour .driver-popover-next-btn,
.driver-popover.nestora-tour .driver-popover-prev-btn {
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  padding: 8px 16px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  border: none;
  text-shadow: none;
}

.driver-popover.nestora-tour .driver-popover-next-btn {
  background-color: hsl(152 40% 44%);
  color: white;
}

.driver-popover.nestora-tour .driver-popover-next-btn:hover {
  background-color: hsl(152 40% 38%);
}

.driver-popover.nestora-tour .driver-popover-prev-btn {
  background-color: transparent;
  color: hsl(140 5% 55%);
}

.driver-popover.nestora-tour .driver-popover-prev-btn:hover {
  color: hsl(140 8% 94%);
}

.driver-popover.nestora-tour .driver-popover-close-btn {
  color: hsl(140 5% 55%);
}

.driver-popover.nestora-tour .driver-popover-close-btn:hover {
  color: hsl(140 8% 94%);
}

.driver-popover.nestora-tour .driver-popover-arrow-side-left.driver-popover-arrow,
.driver-popover.nestora-tour .driver-popover-arrow-side-right.driver-popover-arrow,
.driver-popover.nestora-tour .driver-popover-arrow-side-top.driver-popover-arrow,
.driver-popover.nestora-tour .driver-popover-arrow-side-bottom.driver-popover-arrow {
  border-color: hsl(150 10% 10%);
}
</style>
