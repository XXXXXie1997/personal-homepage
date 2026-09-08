import { createApp } from 'vue'
import './styles/reset.css'
import './styles/variables.css'
import './styles/main.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
