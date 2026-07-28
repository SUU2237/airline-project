import { createRouter, createWebHashHistory } from 'vue-router'
import FlightView from '@/views/FlightView.vue'

const router = createRouter({
  // 💡 Hash 模式
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/flight', // 當網址只有根目錄時，自動重導向到航班頁面
    },
    {
      path: '/flight',
      name: 'flight',
      component: FlightView,
    },
    {
      path: '/map',
      name: 'map',
      component: () => import('@/views/MapView.vue'),
    },
  ],
})

export default router
