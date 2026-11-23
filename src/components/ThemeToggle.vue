<script setup>
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button class="theme-toggle" @click="toggleTheme" :aria-label="isDark ? '切换到白昼' : '切换到月夜'" :title="isDark ? '切换到白昼' : '切换到月夜'">
    <span class="icon" aria-hidden="true"></span>
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
  display:grid;
  font-size: 1.25rem;
  line-height: 1;
}
.icon::before,.icon::after {grid-area:1/1}
.icon::before {content:'🌙';opacity:1}
.icon::after {content:'☀️';opacity:0}
:global(body.dark .theme-toggle .icon::before) {opacity:0}
:global(body.dark .theme-toggle .icon::after) {opacity:1}
@media (prefers-reduced-motion:no-preference) {
  .icon::before,.icon::after {transition:opacity .7s ease-in-out}
}
</style>
