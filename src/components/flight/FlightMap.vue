<template>
  <div class="map-wrapper">
    <div ref="mapContainer" class="leaflet-map-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css' // 確保有載入 CSS
import type { OpenSkyState, FlightPathPoint } from '@/types/flight'

// 修正 Vite/Webpack 打包時 Leaflet 預設 Marker 圖片遺失問題
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

interface Props {
  currentPosition: OpenSkyState | null
  path: FlightPathPoint[]
  depAirport: { lat: number; lng: number; name: string }
  arrAirport: { lat: number; lng: number; name: string }
}

const props = defineProps<Props>()

const mapContainer = ref<HTMLDivElement | null>(null)
let mapInstance: L.Map | null = null
let planeMarker: L.Marker | null = null
let polylineLayer: L.Polyline | null = null
let airportMarkers: L.Marker[] = []

//動態角度的小飛機
const createPlaneIcon = (angle: number = 0) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" style="transform: rotate(${angle}deg); transform-origin: center;">
      <path fill="#2563eb" stroke="#ffffff" stroke-width="1.5" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: 'custom-plane-icon',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

//初始化 Leaflet 地圖
const initMap = () => {
  if (!mapContainer.value) return

  mapInstance = L.map(mapContainer.value, {
    worldCopyJump: true, //地圖參數：當使用者滑動地圖、跨過世界地圖東經西經邊界時，地圖不會斷掉，大頭針跟線條會自動平滑接上去。
  }).setView([24.5, 121.5], 3)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(mapInstance)

  updateMapElements()
}

const updateMapElements = () => {
  if (!mapInstance) return

  //大頭針與舊圖層清理
  airportMarkers.forEach((m) => m.remove())
  airportMarkers = []
  if (polylineLayer) polylineLayer.remove()
  if (planeMarker) planeMarker.remove()

  // 1. 標註機場標籤
  const depMarker = L.marker([props.depAirport.lat, props.depAirport.lng])
    .bindPopup(`起飛：${props.depAirport.name}`) //綁定提示文字
    .addTo(mapInstance)

  const arrMarker = L.marker([props.arrAirport.lat, props.arrAirport.lng])
    .bindPopup(`到達：${props.arrAirport.name}`)
    .addTo(mapInstance)

  airportMarkers.push(depMarker, arrMarker)

  // 2. 畫出連續大圓航線 Polyline
  if (props.path && props.path.length > 0) {
    const latLngs: [number, number][] = props.path
      .filter((p): p is FlightPathPoint => !!p)
      .map((p) => [p.lat, p.lng])
    //畫虛綫
    polylineLayer = L.polyline(latLngs, {
      color: '#3b82f6',
      weight: 3,
      dashArray: '6, 6',
      opacity: 0.85,
    }).addTo(mapInstance)
    //自動縮放地圖視野
    try {
      const bounds = polylineLayer.getBounds()
      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds, { padding: [50, 50] })
      }
    } catch {
      // 忽略邊界異常
    }
  }

  // 3. 畫出飛機位置
  if (props.currentPosition) {
    const { latitude, longitude, trueTrack } = props.currentPosition
    const icon = createPlaneIcon(trueTrack || 0)

    planeMarker = L.marker([latitude, longitude], { icon })
      .bindPopup(
        `呼號：${props.currentPosition.callsign}<br>高度：${props.currentPosition.baroAltitude || '--'}m`,
      )
      .addTo(mapInstance)
  }
}

//畫面完全印出來之後才做
onMounted(() => {
  initMap()
})

//監聽：當 MapView 發生改變，立刻呼叫 updateMapElements() 重新繪製地圖
watch(
  () => [props.currentPosition, props.path],
  () => {
    updateMapElements()
  },
  { deep: true },
)

//資源釋放
onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 500px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.leaflet-map-container {
  width: 100%;
  height: 100%;
}
</style>

<style>
.custom-plane-icon {
  background: transparent;
  border: none;
}
</style>
