<template>
  <main class="home-container">
    <header class="header">
      <h1>✈️ 航空即時動態與不便險監控系統</h1>
      <p>階段一：基礎 API 串接與組件篩選測試</p>
    </header>

    <section class="filter-card">
      <div class="filter-header">
        <h2>航班條件篩選</h2>
        <button type="button" class="reset-btn" @click="resetAllFilters">🔄 全域重設條件</button>
      </div>

      <div class="grid-layout">
        <!-- 機場選擇器 -->
        <AirportSelector
          v-model="airportQuery"
          :airports="airports"
          @select="handleAirportSelect"
          @clear="airports = []"
        />

        <!-- 航空公司選擇器 -->
        <AirlineSelector
          v-model="airlineQuery"
          :airlines="airlines"
          @select="handleAirlineSelect"
          @clear="airlines = []"
        />
      </div>
    </section>

    <!-- 狀態訊息或選取結果顯示 -->
    <section class="status-card">
      <h3>目前選擇狀態</h3>
      <div class="selected-info">
        <p>
          <strong>已選機場：</strong>
          {{
            selectedAirport
              ? `${selectedAirport.AirportName?.Zh_tw || selectedAirport.AirportID} (${selectedAirport.AirportCode || selectedAirport.AirportID})`
              : '未選擇'
          }}
        </p>
        <p>
          <strong>已選航空公司：</strong>
          {{
            selectedAirline
              ? `${selectedAirline.AirlineName?.Zh_tw || selectedAirline.AirlineID} (${selectedAirline.AirlineIATA || selectedAirline.AirlineID})`
              : '未選擇'
          }}
        </p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AirportSelector from '@/components/flight/AirportSelector.vue'
import AirlineSelector from '@/components/flight/AirlineSelector.vue'
import { tdxService } from '@/api/tdxService'
import type { TdxAirport, TdxAirline } from '@/types/tdx'

// State
const airportQuery = ref('')
const airlineQuery = ref('')

const airports = ref<TdxAirport[]>([])
const airlines = ref<TdxAirline[]>([])

const selectedAirport = ref<TdxAirport | null>(null)
const selectedAirline = ref<TdxAirline | null>(null)

// 防抖搜尋 (Debounce)
let airportTimer: number | undefined
let airlineTimer: number | undefined

watch(airportQuery, (newVal) => {
  // 如果是點選設定的文字，不觸發重複搜尋
  if (
    selectedAirport.value &&
    newVal === (selectedAirport.value.AirportName?.Zh_tw || selectedAirport.value.AirportID)
  ) {
    return
  }

  clearTimeout(airportTimer)
  if (!newVal.trim()) {
    airports.value = []
    return
  }

  airportTimer = window.setTimeout(async () => {
    airports.value = await tdxService.getAirports(newVal, 30)
  }, 300)
})

watch(airlineQuery, (newVal) => {
  if (
    selectedAirline.value &&
    newVal === (selectedAirline.value.AirlineName?.Zh_tw || selectedAirline.value.AirlineID)
  ) {
    return
  }

  clearTimeout(airlineTimer)
  if (!newVal.trim()) {
    airlines.value = []
    return
  }

  airlineTimer = window.setTimeout(async () => {
    airlines.value = await tdxService.getAirlines(newVal, 30)
  }, 300)
})

// Event Handlers
const handleAirportSelect = (airport: TdxAirport) => {
  selectedAirport.value = airport
  airportQuery.value = airport.AirportName?.Zh_tw || airport.AirportID
  airports.value = []
}

const handleAirlineSelect = (airline: TdxAirline) => {
  selectedAirline.value = airline
  airlineQuery.value = airline.AirlineName?.Zh_tw || airline.AirlineID
  airlines.value = []
}

// 全域一鍵重設
const resetAllFilters = () => {
  airportQuery.value = ''
  airlineQuery.value = ''
  selectedAirport.value = null
  selectedAirline.value = null
  airports.value = []
  airlines.value = []
}
</script>

<style scoped>
.home-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

.header {
  margin-bottom: 2rem;
  text-align: center;
}

.header h1 {
  font-size: 1.8rem;
  color: #1e293b;
}

.header p {
  color: #64748b;
  margin-top: 0.5rem;
}

.filter-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  margin-bottom: 1.5rem;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.filter-header h2 {
  font-size: 1.2rem;
  color: #334155;
  margin: 0;
}

.reset-btn {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.reset-btn:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .grid-layout {
    grid-template-columns: 1fr 1fr;
  }
}

.status-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem 1.5rem;
}

.status-card h3 {
  font-size: 1rem;
  color: #475569;
  margin-bottom: 0.5rem;
}

.selected-info p {
  margin: 0.25rem 0;
  color: #1e293b;
  font-size: 0.95rem;
}
</style>
