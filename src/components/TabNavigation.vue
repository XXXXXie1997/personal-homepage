<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const menuOpen = ref(false)

const tabs = [
  { name: '首页', path: '/' },
  { name: '博客', path: '/blog' },
  { name: '项目', path: '/projects' }
]

const isActive = (path) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}
</script>

<template>
  <nav class="tab-navigation">
    <div class="nav-container">
      <router-link to="/" class="logo" @click="closeMenu">
        <span class="logo-icon">🦀</span>
        <span class="logo-text">xxxxxie</span>
      </router-link>
      
      <!-- 桌面端导航 -->
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

      <!-- 移动端汉堡按钮 -->
      <button class="menu-toggle" @click="toggleMenu" :class="{ open: menuOpen }">
        <span class="menu-bar"></span>
        <span class="menu-bar"></span>
        <span class="menu-bar"></span>
      </button>
    </div>

    <!-- 移动端下拉菜单 -->
    <div class="mobile-menu" :class="{ open: menuOpen }">
      <router-link
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="mobile-nav-link"
        :class="{ active: isActive(tab.path) }"
        @click="closeMenu"
      >
        {{ tab.name }}
      </router-link>
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
  text-decoration: none;
}

.logo:hover {
  opacity: 0.8;
}

.logo-icon {
  font-size: 1.5rem;
}

/* 桌面端导航 */
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
  text-decoration: none;
}

.nav-link:hover {
  color: var(--text);
  background-color: var(--bg-secondary);
}

.nav-link.active {
  color: var(--primary);
  background-color: var(--bg-secondary);
}

/* 汉堡按钮 */
.menu-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  gap: 5px;
}

.menu-bar {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
  transition: all var(--transition-fast);
}

.menu-toggle.open .menu-bar:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.menu-toggle.open .menu-bar:nth-child(2) {
  opacity: 0;
}

.menu-toggle.open .menu-bar:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* 移动端下拉菜单 */
.mobile-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing-md);
  flex-direction: column;
  gap: var(--spacing-sm);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: translateY(-10px);
  transition: opacity var(--transition-fast), transform var(--transition-fast), visibility var(--transition-fast);
}

.mobile-menu.open {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transform: translateY(0);
}

.mobile-nav-link {
  color: var(--text-secondary);
  font-weight: 500;
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  color: var(--primary);
  background-color: var(--bg-secondary);
}

/* 移动端适配 */
@media (max-width: 640px) {
  .nav-links {
    display: none;
  }

  .menu-toggle {
    display: flex;
  }

  .mobile-menu {
    display: flex;
  }

  .nav-container {
    padding: 0 var(--spacing-sm);
  }

  .logo-text {
    font-size: var(--font-size-base);
  }
}
</style>
