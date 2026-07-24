import { createRouter, createWebHistory } from 'vue-router'
import FlightView from '@/views/FlightView.vue'
import MapView from '@/views/MapView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/flights',
    },
    {
      path: '/flights',
      name: 'flights',
      component: FlightView,
    },
    {
      path: '/map',
      name: 'map',
      component: MapView,
    },
  ],
})

export default router
