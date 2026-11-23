import { onMounted, ref } from 'vue'

const isDark=ref(false)
let transitionTimer

function toggleTheme() {
  clearTimeout(transitionTimer)
  document.body.classList.add('theme-changing')
  isDark.value=!isDark.value
  document.body.classList.toggle('dark',isDark.value)
  transitionTimer=setTimeout(()=>document.body.classList.remove('theme-changing'),750)
  try { localStorage.setItem('theme',isDark.value ? 'dark' : 'light') } catch {}
}

export function useTheme() {
  onMounted(() => { isDark.value=document.body.classList.contains('dark') })
  return { isDark, toggleTheme }
}
