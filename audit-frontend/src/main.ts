import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// 导入Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 导入全局样式
import './styles/global.css'

const app = createApp(App)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
