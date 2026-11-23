import { createApp, createSSRApp } from 'vue'
import { createWebHistory } from 'vue-router'
import './styles/reset.css'
import './styles/variables.css'
import './styles/main.css'
import App from './App.vue'
import { createSiteRouter } from './router'

const root = document.getElementById('app')
const router = createSiteRouter(createWebHistory(import.meta.env.BASE_URL))
const path = router.resolve(router.options.history.location).path.replace(/\/$/, '') || '/'
const app = root.dataset.route === path ? createSSRApp(App) : createApp(App)
app.use(router)
router.isReady().then(() => app.mount(root))
