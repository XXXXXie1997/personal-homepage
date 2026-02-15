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
    <footer class="footer">
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
        蒙ICP备2024018901号-1
      </a>
    </footer>
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

.footer {
  text-align: center;
  padding: var(--spacing md) var(--spacing-lg);
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--bg);
  border-top: 1px solid var(--border);
  position: sticky;
  bottom: 0;
  z-index: 50;
}

.footer a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.footer a:hover {
  color: var(--primary);
}

.theme-toggle-btn {
  position: fixed;
  bottom: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 100;
  box-shadow: var(--shadow-md);
}
</style>
