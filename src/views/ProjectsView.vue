<script setup>
import { ref } from 'vue'

const projects = ref([
  {
    name: '画板',
    description: '基于 Canvas 的在线画板工具，支持绑定、画笔、橡皮擦等功能',
    tech: ['Canvas', 'JavaScript'],
    link: 'https://github.com/XXXXXie1997/canvasDrawingBoard-vite',
    preview: 'http://www.xie-bro.top/canvasDrawingBoard-vite'
  },
  {
    name: '记账本',
    description: '纯前端记账 Web 应用，支持记账、标签管理、数据统计等功能',
    tech: ['Vue 3', 'Vant', 'ECharts'],
    link: 'https://github.com/XXXXXie1997/money-tracker-claw',
    preview: 'http://www.xie-bro.top/money-tracker-claw'
  }
])
</script>

<template>
  <div class="projects-view">
    <h1 class="page-title">个人项目</h1>
    <div class="projects-list">
      <div v-for="project in projects" :key="project.name" class="project-card">
        <h2 class="project-name">{{ project.name }}</h2>
        <p class="project-desc">{{ project.description }}</p>
        <div class="project-tech">
          <span v-for="tech in project.tech" :key="tech" class="tech-tag">{{ tech }}</span>
        </div>
        <div class="project-links">
          <a v-if="project.link" :href="project.link" target="_blank" class="btn btn-outline">
            项目链接
          </a>
          <a v-if="project.preview" :href="project.preview" target="_blank" class="btn btn-primary">
            预览
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.projects-view {
  padding: calc(var(--header-height) + var(--spacing-xl)) var(--spacing-md) var(--spacing-xl);
  max-width: var(--max-width);
  margin: 0 auto;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  margin-bottom: var(--spacing-xl);
  color: var(--text);
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.project-card {
  padding: var(--spacing-lg);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.project-name {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text);
  margin-bottom: var(--spacing-sm);
}

.project-desc {
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  margin-bottom: var(--spacing-md);
  line-height: 1.6;
}

.project-tech {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.tech-tag {
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--bg);
  color: var(--primary);
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}

.project-links {
  display: flex;
  gap: var(--spacing-sm);
}

.btn {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-outline {
  background: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
}

.btn-outline:hover {
  background: var(--primary);
  color: white;
}
</style>
