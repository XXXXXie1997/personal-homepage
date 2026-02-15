<script setup>
</script>

<template>
  <div class="social-links">
    <a href="https://github.com/XXXXXie1997" target="_blank" rel="noopener noreferrer" class="social-link" title="GitHub">
      <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    </a>
    <a href="https://juejin.cn/user/958429872790680" target="_blank" rel="noopener noreferrer" class="social-link juejin" title="稀土掘金">
      <svg class="icon juejin-icon" viewBox="0 0 1316 1024">
        <path d="M643.181714 247.698286l154.916572-123.172572L643.181714 0.256 643.072 0l-154.660571 124.269714 154.660571 123.245715 0.109714 0.182857z m0 388.461714h0.109715l399.579428-315.245714-108.361143-87.04-291.218285 229.888h-0.146286l-0.109714 0.146285L351.817143 234.093714l-108.251429 87.04 399.433143 315.136 0.146286-0.146285z m-0.146285 215.552l0.146285-0.146286 534.893715-422.034285 108.397714 87.04-243.309714 192L643.145143 1024 10.422857 525.056 0 516.754286l108.251429-86.893715L643.035429 851.748571z"/>
      </svg>
    </a>
  </div>
</template>

<style scoped>
.social-links {
  display: flex;
  justify-content: center;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
}

.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background-color: var(--bg-secondary);
  color: var(--text);
  transition: background-color var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}

.social-link:hover {
  background-color: var(--primary);
  color: white;
  transform: translateY(-2px);
}

.icon {
  width: 24px;
  height: 24px;
}

/* 掘金图标颜色 */
.juejin-icon {
  fill: #1E80FF;
  transition: fill var(--transition-fast);
}

/* 深色模式下掘金图标变白 */
:global(body.dark) .juejin-icon {
  fill: white;
}
</style>
