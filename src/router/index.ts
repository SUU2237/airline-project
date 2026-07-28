import { createRouter, createWebHashHistory } from 'vue-router'
import FlightView from '@/views/FlightView.vue'

const router = createRouter({
  // Hash 模式，網址會帶有 #
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
      //地圖元件只有在使用者真正點擊進入 /map 時才會被下載
      component: () => import('@/views/MapView.vue'),
    },
  ],
})

export default router
