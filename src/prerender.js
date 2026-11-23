import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory } from 'vue-router'
import { createSiteRouter } from './router'
import App from './App.vue'

export async function renderPage(path, base) {
  const router = createSiteRouter(createMemoryHistory(base))
  const app = createSSRApp(App)
  app.use(router)
  await router.push(path)
  await router.isReady()
  return renderToString(app)
}
