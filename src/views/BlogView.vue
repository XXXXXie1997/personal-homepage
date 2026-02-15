<script setup>
import { ref, onMounted } from 'vue'

const posts = ref([])
const loading = ref(true)

// Fetch posts list
const fetchPosts = async () => {
  try {
    // Import.meta.glob to get all markdown files
    const modules = import.meta.glob('/public/posts/*.md', { query: '?raw', eager: true })
    const postList = []
    
    for (const path in modules) {
      const content = modules[path].default
      const slug = path.split('/').pop().replace('.md', '')
      const frontmatter = parseFrontmatter(content)
      
      if (frontmatter) {
        postList.push({
          slug,
          ...frontmatter
        })
      }
    }
    
    // Sort by date descending
    posts.value = postList.sort((a, b) => new Date(b.date) - new Date(a.date))
  } catch (error) {
    console.error('Error fetching posts:', error)
  } finally {
    loading.value = false
  }
}

// Parse frontmatter from markdown content
const parseFrontmatter = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return null
  
  const frontmatterStr = match[1]
  const frontmatter = {}
  
  frontmatterStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length) {
      frontmatter[key.trim()] = valueParts.join(':').trim()
    }
  })
  
  return frontmatter
}

onMounted(() => {
  fetchPosts()
})
</script>

<template>
  <div class="blog-view">
    <h1>博客</h1>
    
    <div v-if="loading" class="loading">
      加载中...
    </div>
    
    <div v-else-if="posts.length === 0" class="empty">
      暂无文章
    </div>
    
    <div v-else class="post-list">
      <router-link
        v-for="post in posts"
        :key="post.slug"
        :to="`/blog/${post.slug}`"
        class="post-item"
      >
        <div class="post-content">
          <h2 class="post-title">{{ post.title }}</h2>
          <p class="post-summary">{{ post.summary }}</p>
          <time class="post-date">{{ post.date }}</time>
        </div>
        <span class="post-arrow">→</span>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.blog-view {
  padding: calc(var(--header-height) + var(--spacing-xl)) var(--spacing-md) var(--spacing-xl);
}

h1 {
  font-size: var(--font-size-2xl);
  margin-bottom: var(--spacing-xl);
  color: var(--text);
}

.loading,
.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: var(--spacing-xl);
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.post-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg);
  background-color: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid transparent;
  transition: all var(--transition-fast);
}

.post-item:hover {
  border-color: var(--border-hover);
  transform: translateX(4px);
}

.post-content {
  flex: 1;
}

.post-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text);
  margin-bottom: var(--spacing-xs);
}

.post-summary {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-sm);
}

.post-date {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  opacity: 0.7;
}

.post-arrow {
  font-size: var(--font-size-xl);
  color: var(--primary);
  opacity: 0;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.post-item:hover .post-arrow {
  opacity: 1;
  transform: translateX(4px);
}
</style>
