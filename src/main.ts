//Vue 3 專案的唯一入口點

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import 'leaflet/dist/leaflet.css'

const app = createApp(App)

//讓全專案可以使用 flightStore
app.use(createPinia())
app.use(router)

app.mount('#app')
