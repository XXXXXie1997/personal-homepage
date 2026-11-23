<script setup>
import ThemeToggle from './ThemeToggle.vue'
</script>
<template>
  <header class="navigation">
    <div class="container nav-content">
      <RouterLink to="/" class="wordmark" aria-label="xie-bro 首页">
        <svg width="32" height="30" viewBox="0 0 36 30" fill="none" aria-hidden="true">
          <path d="m2 25 12-20 8 13 4-7 8 14H2Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>
          <path d="m9 14 5 2 3-5M21 20l3 5" stroke="currentColor" stroke-width="2"/>
        </svg> xie-bro
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink to="/">首页</RouterLink><RouterLink to="/projects">项目</RouterLink><RouterLink to="/cv">简历</RouterLink>
        <ThemeToggle />
      </nav>
    </div>
  </header>
</template>
<style scoped>
.navigation {position:fixed;inset:0 0 auto;z-index:5;height:var(--header-height);background:color-mix(in srgb,var(--bg) 62%,transparent);backdrop-filter:blur(15px);border-bottom:1px solid #86929d44}
.nav-content {height:100%;display:flex;align-items:center;justify-content:space-between}
.wordmark {display:flex;align-items:center;gap:10px;font:700 24px Georgia,serif;letter-spacing:-1px;color:var(--text)}
nav {display:flex;align-items:center;gap:clamp(16px,3vw,44px)}
nav a {color:var(--text-secondary);font-size:14px;position:relative;line-height:var(--header-height)}
nav .router-link-exact-active {color:var(--text);font-weight:650}
nav .router-link-exact-active:after {content:"";width:16px;height:2px;background:currentColor;position:absolute;bottom:14px;left:calc(50% - 8px)}
</style>
