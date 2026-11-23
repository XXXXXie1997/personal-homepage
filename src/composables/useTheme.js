import { ref } from 'vue'

const saved=localStorage.getItem('theme')
const isDark=ref(saved ? saved==='dark' : matchMedia('(prefers-color-scheme: dark)').matches)
document.body.classList.toggle('dark',isDark.value)

function toggleTheme() {
  isDark.value=!isDark.value
  document.body.classList.toggle('dark',isDark.value)
  localStorage.setItem('theme',isDark.value ? 'dark' : 'light')
}

export function useTheme() {
  return { isDark, toggleTheme }
}
