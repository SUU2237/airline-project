<template>
  <main class="map-view-container">
    <header class="page-header">
      <button type="button" class="back-btn" @click="goBack">← 返回</button>
      <h2>空中雷達與即時航跡</h2>
    </header>

    <!-- 航班數據狀態卡片 -->
    <section class="flight-status-card">
      <div class="card-title">
        <h3>航班呼號：{{ currentCallsign }}</h3>
        <span class="mode-tag" :class="{ simulated: isSimulated }">
          {{ isSimulated ? '系統備案平滑航跡模式' : 'OpenSky 即時連線模式' }}
        </span>
      </div>

      <div class="metrics-grid">
        <div class="metric-item">
          <span class="label">航線航段</span>
          <span class="value">{{ depCode }} → {{ arrCode }}</span>
        </div>
        <div class="metric-item">
          <span class="label">緯經度座標</span>
          <span class="value">
            {{ currentPosition?.latitude.toFixed(4) || '--' }},
            {{ currentPosition?.longitude.toFixed(4) || '--' }}
          </span>
        </div>
        <div class="metric-item">
          <span class="label">飛行高度</span>
          <span class="value">{{
            currentPosition?.baroAltitude ? currentPosition.baroAltitude + ' m' : '--'
          }}</span>
        </div>
        <div class="metric-item">
          <span class="label">飛行速度</span>
          <span class="value">{{
            currentPosition?.velocity ? Math.round(currentPosition.velocity * 3.6) + ' km/h' : '--'
          }}</span>
        </div>
        <div class="metric-item">
          <span class="label">航向角</span>
          <span class="value">{{
            currentPosition?.trueTrack ? currentPosition.trueTrack + '°' : '--'
          }}</span>
        </div>
      </div>
    </section>

    <!-- Leaflet 地圖展示區 -->
    <section class="map-section">
      <div v-if="isLoading" class="loading-box">正在接收空中雷達座標數據...</div>

      <FlightMap
        v-else
        :current-position="currentPosition"
        :path="flightPath"
        :dep-airport="depAirport"
        :arr-airport="arrAirport"
      />
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FlightMap from '@/components/flight/FlightMap.vue'
import { openSkyService, getAirportCoordinates } from '@/api/openSkyService'
import type { OpenSkyState, FlightPathPoint } from '@/types/flight'

const route = useRoute()
const router = useRouter()

const currentCallsign = ref<string>('CI123')
const depCode = ref<string>('TPE')
const arrCode = ref<string>('NRT')

const currentPosition = ref<OpenSkyState | null>(null)
const flightPath = ref<FlightPathPoint[]>([])
const isSimulated = ref(false)
const isLoading = ref(true)

// 機場座標預設值
const depAirport = ref({ lat: 25.0797, lng: 121.2342, name: '桃園國際機場' })
const arrAirport = ref({ lat: 35.772, lng: 140.3929, name: '東京成田機場' })

const loadRadarData = async () => {
  isLoading.value = true

  // 1. 解析網址帶入的參數
  if (route.query.callsign) currentCallsign.value = route.query.callsign as string
  if (route.query.dep) depCode.value = route.query.dep as string
  if (route.query.arr) arrCode.value = route.query.arr as string

  // 2. 去全球 28,000+ 機場資料庫抓取正確座標與生成軌跡
  const {
    path,
    currentPosition: simPos,
    dep,
    arr,
  } = await openSkyService.generateSimulatedPath(depCode.value, arrCode.value)

  depAirport.value = dep
  arrAirport.value = arr

  // 3. 嘗試從 OpenSky 抓取空中真實飛機座標
  const realState = await openSkyService.getFlightState(currentCallsign.value)

  if (realState) {
    isSimulated.value = false
    currentPosition.value = realState
    flightPath.value = [
      { lat: depAirport.value.lat, lng: depAirport.value.lng },
      { lat: realState.latitude, lng: realState.longitude },
      { lat: arrAirport.value.lat, lng: arrAirport.value.lng },
    ]
  } else {
    //系統備案平滑航跡模式
    isSimulated.value = true
    flightPath.value = path
    currentPosition.value = simPos
  }

  isLoading.value = false
}

const goBack = () => {
  router.push('/flight')
}

//當這個地圖頁面載入完成後，立刻自動執行 loadRadarData() 開始抓資料
onMounted(() => {
  loadRadarData()
})
</script>

<style scoped>
.map-view-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.back-btn {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1e293b;
}

.flight-status-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
}

.card-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
}

.card-title h3 {
  margin: 0;
  color: #2563eb;
}

.mode-tag {
  background: #dcfce7;
  color: #15803d;
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: bold;
}

.mode-tag.simulated {
  background: #fef3c7;
  color: #b45309;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.metric-item .label {
  font-size: 0.8rem;
  color: #64748b;
}

.metric-item .value {
  font-size: 1rem;
  font-weight: bold;
  color: #1e293b;
}

.loading-box {
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
  color: #64748b;
}
</style>
