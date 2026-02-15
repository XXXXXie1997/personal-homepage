<script setup>
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换到浅色模式' : '切换到深色模式'">
    <span class="icon" v-if="isDark">☀️</span>
    <span class="icon" v-else>🌙</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--bg-secondary);
  color: var(--text);
  transition: background-color var(--transition-fast), transform var(--transition-fast);
}

.theme-toggle:hover {
  background-color: var(--border);
  transform: scale(1.05);
}

.icon {
  font-size: 1.25rem;
  line-height: 1;
}
</style>
