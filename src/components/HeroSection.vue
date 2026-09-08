<script setup>
</script>

<template>
  <section class="hero">
    <div class="avatar">🦀</div>
    <h1 class="name">xie-bro</h1>
    <p class="tagline">一般路过前端开发</p>
  </section>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: var(--spacing-2xl) 0;
}

.avatar {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.name {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  margin-bottom: var(--spacing-sm);
  color: var(--text);
}

.tagline {
  font-size: var(--font-size-lg);
  color: var(--text-secondary);
  margin: 0;
}
</style>
