<script setup>
import { ref } from 'vue'

const projects = ref([
  {
    name: 'Drawer',
    description: '支持 Windows 和 macOS 的二维内容抽屉，可从屏幕边缘随时呼出，自由整理文本、文件、文件夹和截图，并跨应用复制或拖放取用。支持多个独立抽屉、文字编辑、画布缩放、全局快捷键和本地自动保存。',
    tech: ['Windows', 'macOS', '桌面工具', '本地存储'],
    link: 'https://github.com/XXXXXie1997/drawer-website',
    website: 'http://www.xie-bro.top/drawer/'
  },
  {
    name: 'ALCode AI低代码生成引擎',
    description: '面向低代码平台的 Headless AI 生成服务，支持生成 PageDocument 与增量 Patch。',
    tech: ['TypeScript', 'Fastify', 'AI'],
    link: 'https://github.com/XXXXXie1997/ALCode'
  },
  {
    name: 'MoUI 低代码平台',
    description: 'Schema 驱动的低代码 UI 平台，包含组件注册、可视化编辑器、节点树、画布和属性面板。',
    tech: ['React', 'TypeScript', 'Vite'],
    link: 'https://github.com/XXXXXie1997/mo-ui',
    preview: '/mo-ui/'
  },
  {
    name: '日报及考勤审批系统',
    description: '企业内部打卡、日报提交、多级审批和消息通知管理系统。',
    tech: ['Next.js', 'Prisma', 'MySQL'],
    link: 'https://github.com/XXXXXie1997/checkin-app',
    preview: '/checkin-app'
  },
  {
    name: '记账本',
    description: '纯前端记账 Web 应用，支持记账、标签管理、数据统计等功能',
    tech: ['Vue 3', 'Vant', 'ECharts'],
    link: 'https://github.com/XXXXXie1997/money-tracker-claw',
    preview: '/money-tracker/'
  },
  {
    name: '画板一张',
    description: '基于 Canvas 的在线绘图工具，支持笔刷配置、图层操作、撤销重做和画布导出。',
    tech: ['Vue 3', 'TypeScript', 'Canvas'],
    link: 'https://github.com/XXXXXie1997/canvasDrawingBoard-vite',
    preview: '/canvas-drawing-board-vite/'
  },
  {
    name: 'Mo-UI 组件库',
    description: '早期 Vue 2 UI 组件库，包含 Button、Collapse、Popover、Toast 等基础组件。',
    tech: ['Vue 2', 'JavaScript'],
    link: 'https://github.com/XXXXXie1997/Mo-UI-Demo1'
  },
  {
    name: '任意门导航',
    description: 'HTML、CSS、JavaScript 学习项目，实现简易导航页面的增删改查。',
    tech: ['HTML', 'CSS', 'JavaScript'],
    link: 'https://github.com/XXXXXie1997/guide-demo',
    preview: '/guide-demo/'
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
          <a v-if="project.website" :href="project.website" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
            官方网站
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
