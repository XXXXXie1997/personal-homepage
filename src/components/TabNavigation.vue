<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { name: '首页', path: '/' },
  { name: '博客', path: '/blog' }
]

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <nav class="tab-navigation">
    <div class="nav-container">
      <router-link to="/" class="logo">
        <span class="logo-icon">🦀</span>
        <span class="logo-text">xxxxxie</span>
      </router-link>
      
      <div class="nav-links">
        <router-link
          v-for="tab in tabs"
          :key="tab.path"
          :to="tab.path"
          class="nav-link"
          :class="{ active: isActive(tab.path) }"
        >
          {{ tab.name }}
        </router-link>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.tab-navigation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  background-color: var(--bg);
  border-bottom: 1px solid var(--border);
  z-index: 100;
  transition: background-color var(--transition-normal), border-color var(--transition-normal);
}

.nav-container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--spacing-md);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-weight: 600;
  font-size: var(--font-size-lg);
  color: var(--text);
  transition: opacity var(--transition-fast);
}

.logo:hover {
  opacity: 0.8;
}

.logo-icon {
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: var(--spacing-lg);
}

.nav-link {
  color: var(--text-secondary);
  font-weight: 500;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.nav-link:hover {
  color: var(--text);
  background-color: var(--bg-secondary);
}

.nav-link.active {
  color: var(--primary);
  background-color: var(--bg-secondary);
}
</style>
