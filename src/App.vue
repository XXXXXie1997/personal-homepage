<script setup>
import { RouterView } from 'vue-router'
import TabNavigation from './components/TabNavigation.vue'
import ThemeToggle from './components/ThemeToggle.vue'
</script>

<template>
  <div class="app">
    <TabNavigation />
    <main class="main-content">
      <RouterView />
    </main>
    <ThemeToggle class="theme-toggle-btn" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  max-width: var(--max-width);
  margin: 0 auto;
  width: 100%;
}

.theme-toggle-btn {
  position: fixed;
  bottom: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 100;
  box-shadow: var(--shadow-md);
}
</style>
