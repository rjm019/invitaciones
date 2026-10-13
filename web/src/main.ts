import './assets/main.css'
import './themes/tokens.css'
import './effects/effects.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
