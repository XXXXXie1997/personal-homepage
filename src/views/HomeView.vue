<script setup>
import HeroSection from '../components/HeroSection.vue'
import SocialLinks from '../components/SocialLinks.vue'
</script>

<template>
  <div class="home-view">
    <HeroSection />
    <SocialLinks />
  </div>
</template>

<style scoped>
.home-view {
  min-height: calc(100vh - var(--header-height));
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: var(--spacing-xl) var(--spacing-md);
}
</style>
