import { ref, watch, onMounted } from 'vue'

const isDark = ref(false)

export function useTheme() {
  // Initialize theme from localStorage or system preference
  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      isDark.value = savedTheme === 'dark'
    } else {
      // Check system preference
      isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    applyTheme()
  }

  // Apply theme to body
  const applyTheme = () => {
    if (isDark.value) {
      document.body.classList.add('dark')
    } else {
      document.body.classList.remove('dark')
    }
  }

  // Toggle theme
  const toggleTheme = () => {
    isDark.value = !isDark.value
    applyTheme()
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  // Watch for changes
  watch(isDark, () => {
    applyTheme()
  })

  // Initialize on mount
  onMounted(() => {
    initTheme()
  })

  return {
    isDark,
    toggleTheme
  }
}
