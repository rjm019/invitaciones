import './assets/main.css'
import './themes/tokens.css'
import './effects/effects.css'
import './effects/options.css'
import './effects/buttons.css'
import './components/sections/variants/skins.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { bootTheme, setBoot } from './services/bootService'
import { loadTheme } from './themes'

// Datos que el servidor ya puso en la página: el tema empieza a cargar de inmediato.
setBoot((window as Window & { __BOOT__?: unknown }).__BOOT__)
const theme = bootTheme()
if (theme) void loadTheme(theme)

createApp(App).use(router).mount('#app')
