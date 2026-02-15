import { createApp } from 'vue'
import './styles/reset.css'
import './styles/variables.css'
import './styles/main.css'
import App from './App.vue'
import router from './router'

// Import highlight.js styles
import 'highlight.js/styles/github.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
