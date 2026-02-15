<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
// 按需引入 highlight.js 常用语言
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'

// 注册语言
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('html', html)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('css', css)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)

const route = useRoute()
const router = useRouter()

const post = ref(null)
const loading = ref(true)
const error = ref(false)

// Configure marked with highlight.js
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (e) {
        console.error(e)
      }
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})

// Fetch post content
const fetchPost = async (slug) => {
  loading.value = true
  error.value = false
  
  try {
    const response = await fetch(`/posts/${slug}.md`)
    if (!response.ok) {
      throw new Error('Post not found')
    }
    
    const content = await response.text()
    const { frontmatter, body } = parseMarkdown(content)
    
    post.value = {
      ...frontmatter,
      content: marked(body)
    }
  } catch (e) {
    error.value = true
    console.error('Error fetching post:', e)
  } finally {
    loading.value = false
  }
}

// Parse markdown with frontmatter
const parseMarkdown = (content) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  
  if (!match) {
    return {
      frontmatter: {},
      body: content
    }
  }
  
  const frontmatterStr = match[1]
  const body = match[2]
  const frontmatter = {}
  
  frontmatterStr.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length) {
      frontmatter[key.trim()] = valueParts.join(':').trim()
    }
  })
  
  return { frontmatter, body }
}

// Watch for route changes
watch(() => route.params.slug, (newSlug) => {
  if (newSlug) {
    fetchPost(newSlug)
  }
}, { immediate: true })
</script>

<template>
  <article class="blog-post">
    <div v-if="loading" class="loading">
      加载中...
    </div>
    
    <div v-else-if="error" class="error">
      <h1>文章未找到</h1>
      <p>抱歉，这篇文章不存在或已被删除。</p>
      <router-link to="/blog" class="back-link">← 返回博客列表</router-link>
    </div>
    
    <template v-else-if="post">
      <header class="post-header">
        <router-link to="/blog" class="back-link">← 返回</router-link>
        <h1 class="post-title">{{ post.title }}</h1>
        <time class="post-date">{{ post.date }}</time>
      </header>
      
      <div class="post-content" v-html="post.content"></div>
    </template>
  </article>
</template>

<style scoped>
.blog-post {
  padding: calc(var(--header-height) + var(--spacing-xl)) var(--spacing-md) var(--spacing-xl);
  max-width: var(--max-width);
  margin: 0 auto;
}

.loading,
.error {
  text-align: center;
  padding: var(--spacing-xl);
}

.error h1 {
  color: var(--text);
  margin-bottom: var(--spacing-sm);
}

.error p {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
}

.back-link {
  display: inline-block;
  color: var(--primary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-lg);
  transition: opacity var(--transition-fast);
}

.back-link:hover {
  opacity: 0.8;
}

.post-header {
  margin-bottom: var(--spacing-2xl);
}

.post-title {
  font-size: var(--font-size-2xl);
  font-weight: 700;
  color: var(--text);
  margin-bottom: var(--spacing-sm);
}

.post-date {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.post-content {
  line-height: 1.8;
  color: var(--text);
}

.post-content :deep(h1),
.post-content :deep(h2),
.post-content :deep(h3),
.post-content :deep(h4),
.post-content :deep(h5),
.post-content :deep(h6) {
  margin-top: var(--spacing-xl);
  margin-bottom: var(--spacing-md);
  font-weight: 600;
}

.post-content :deep(h2) {
  font-size: var(--font-size-xl);
  border-bottom: 1px solid var(--border);
  padding-bottom: var(--spacing-sm);
}

.post-content :deep(h3) {
  font-size: var(--font-size-lg);
}

.post-content :deep(p) {
  margin-bottom: var(--spacing-md);
  color: var(--text);
}

.post-content :deep(a) {
  color: var(--primary);
  text-decoration: underline;
}

.post-content :deep(code) {
  background-color: var(--bg-secondary);
  padding: 0.2em 0.4em;
  border-radius: var(--radius-sm);
  font-size: 0.9em;
}

.post-content :deep(pre) {
  background-color: var(--bg-secondary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin-bottom: var(--spacing-md);
}

.post-content :deep(pre code) {
  background: none;
  padding: 0;
  font-size: var(--font-size-sm);
}

.post-content :deep(ul),
.post-content :deep(ol) {
  padding-left: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}

.post-content :deep(li) {
  margin-bottom: var(--spacing-xs);
}

.post-content :deep(blockquote) {
  border-left: 4px solid var(--primary);
  padding-left: var(--spacing-md);
  margin: var(--spacing-md) 0;
  color: var(--text-secondary);
  font-style: italic;
}

.post-content :deep(img) {
  border-radius: var(--radius-md);
  margin: var(--spacing-md) 0;
}

.post-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: var(--spacing-xl) 0;
}

.post-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: var(--spacing-md);
}

.post-content :deep(th),
.post-content :deep(td) {
  border: 1px solid var(--border);
  padding: var(--spacing-sm);
  text-align: left;
}

.post-content :deep(th) {
  background-color: var(--bg-secondary);
  font-weight: 600;
}
</style>
