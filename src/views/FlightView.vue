<template>
  <main class="flight-container">
    <header class="header">
      <h1>航空即時動態與不便險監控</h1>
    </header>

    <!-- 1. 條件篩選表單卡片 -->
    <section class="filter-card">
      <div class="filter-header">
        <h2>航班條件篩選</h2>
        <button type="button" class="reset-btn" @click="resetFilters">重設條件</button>
      </div>

      <div class="grid-layout">
        <AirportSelector
          v-model="store.airportQuery"
          :airports="airports"
          @select="handleAirportSelect"
          @clear="clearAirport"
        />

        <AirlineSelector
          v-model="store.airlineQuery"
          :airlines="airlines"
          @select="handleAirlineSelect"
          @clear="clearAirline"
        />

        <div class="flight-num-col">
          <label class="selector-label">搜尋特定航班號碼 / 呼號：</label>
          <div class="input-wrapper">
            <input
              type="text"
              v-model="flightNumberQuery"
              placeholder="例如 CI521、BR7"
              class="selector-input"
            />
            <button
              v-if="flightNumberQuery"
              type="button"
              class="clear-btn"
              @click="flightNumberQuery = ''"
            >
              ✕
            </button>
          </div>
          <span class="hint-text">可單獨輸入航班號進行全臺連線搜尋</span>
        </div>
      </div>

      <div class="filter-options-group">
        <div class="option-row">
          <span class="option-title">航班類型：</span>
          <div class="radio-group">
            <label class="radio-label">
              <input
                type="radio"
                v-model="store.formFlightType"
                value="Departure"
                name="flightType"
              />
              <span>離站航班</span>
            </label>
            <label class="radio-label">
              <input
                type="radio"
                v-model="store.formFlightType"
                value="Arrival"
                name="flightType"
              />
              <span>到站航班</span>
            </label>
          </div>
        </div>

        <div class="option-row">
          <span class="option-title">時間範圍：</span>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" v-model="store.formTimeMode" value="upcoming" name="timeMode" />
              <span>僅即時/未來航班</span>
            </label>
            <label class="radio-label">
              <input type="radio" v-model="store.formTimeMode" value="all" name="timeMode" />
              <span>全天所有航班</span>
            </label>
          </div>
        </div>
      </div>

      <div class="system-notice">
        提示：本系統資料庫收錄臺灣各機場起降及往返之國際與國內航班動態。
      </div>

      <div class="action-row">
        <button
          type="button"
          class="search-btn"
          :disabled="!(store.selectedAirport || flightNumberQuery.trim()) || isLoading"
          @click="loadFlightData"
        >
          搜尋即時動態
        </button>
      </div>
    </section>

    <!-- 2. 不便險專屬監控看板 -->
    <InsuranceAlertBoard :alert-claim-items="alertClaimItems" :alert-stats="alertStats" />

    <!-- 3. 航班動態清單區塊 -->
    <section class="flight-list-section">
      <div class="section-title">
        <div class="title-left">
          <h3>
            航班動態列表
            <span v-if="store.searchedAirport" class="selected-tag">
              ({{ formattedAirportTitle }})
            </span>
            <span v-else-if="flightNumberQuery" class="selected-tag">
              (航班搜尋: {{ flightNumberQuery.toUpperCase() }})
            </span>
            <span v-if="store.searchedAirline" class="airline-tag">
              / {{ store.searchedAirline.AirlineName?.Zh_tw || store.searchedAirline.AirlineID }}
            </span>
          </h3>

          <div class="status-legend">
            <span class="legend-item normal"><i class="dot green"></i> 準點/出發</span>
            <span class="legend-item delay"><i class="dot yellow"></i> 延誤</span>
            <span class="legend-item cancel"><i class="dot red"></i> 取消</span>
          </div>
        </div>

        <span v-if="store.hasSearched" class="mode-badge">
          {{
            store.searchedTimeMode === 'upcoming' ? '模式：當前與未來航班' : '模式：全天所有航班'
          }}
        </span>
      </div>

      <div v-if="!store.hasSearched" class="empty-flights">
        請於上方選擇「機場」或輸入「航班號碼」，點擊「搜尋即時動態」按鈕開始監控。
      </div>

      <div v-else-if="isLoading" class="loading-state">正在連線數據庫載入即時航班動態...</div>

      <div v-else-if="isRateLimited" class="error-state">
        <h4>TDX 數據服務目前繁忙中 (HTTP 429)</h4>
        <p>連線較頻繁，請稍候 5~10 秒後再試。</p>
        <button type="button" class="retry-btn" @click="loadFlightData">重新載入</button>
      </div>

      <div v-else-if="filteredFlights.length === 0" class="empty-flights">
        <p>目前無符合該條件的航班動態資料。</p>
      </div>

      <div v-else>
        <div class="flight-grid">
          <FlightCard
            v-for="flight in visibleFlights"
            :key="flight.FlightNumber + flight.AirlineID"
            :flight="flight"
            :is-alert="!!checkInsuranceEligibility(flight)"
          />
        </div>

        <div v-if="displayLimit < filteredFlights.length" class="load-more-wrapper">
          <button type="button" class="load-more-btn" @click="loadMore">
            顯示更多航班 (目前顯示 {{ visibleFlights.length }} / 共 {{ filteredFlights.length }} 班)
          </button>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AirportSelector from '@/components/flight/AirportSelector.vue'
import AirlineSelector from '@/components/flight/AirlineSelector.vue'
import InsuranceAlertBoard from '@/components/flight/InsuranceAlertBoard.vue'
import FlightCard from '@/components/flight/FlightCard.vue'

import { tdxService } from '@/api/tdxService'
import { useInsurance } from '@/composables/useInsurance'
import { useFlightStore } from '@/stores/flightStore'
import type { TdxAirport, TdxAirline } from '@/types/tdx'
import type { TdxFlightFids } from '@/types/flight'

defineOptions({
  name: 'FlightView',
})

const store = useFlightStore()

const airports = ref<TdxAirport[]>([])
const airlines = ref<TdxAirline[]>([])

const isLoading = ref(false)
const isRateLimited = ref(false)
const displayLimit = ref(20)

const flightNumberQuery = ref('')

let airportTimer: number | undefined
let airlineTimer: number | undefined

//根據使用者搜尋的機場，動態生成要在畫面上顯示的標題文字
const formattedAirportTitle = computed(() => {
  if (!store.searchedAirport) return ''
  const code = store.searchedAirport.AirportCode || store.searchedAirport.AirportID || ''
  const name = store.searchedAirport.AirportName?.Zh_tw || code
  const taiwanCodes = ['TPE', 'TSA', 'KHH', 'RMQ', 'HUN', 'MZG', 'KMN']

  if (taiwanCodes.includes(code.toUpperCase())) {
    return name
  }
  //國外機場顯示
  return `臺灣 ↔ ${name}`
})

//避免每打一個字就發一次 API 導致伺服器崩潰
watch(
  () => store.airportQuery,
  (newVal) => {
    if (
      store.selectedAirport &&
      newVal !== (store.selectedAirport.AirportName?.Zh_tw || store.selectedAirport.AirportID)
    ) {
      store.selectedAirport = null
    }
    clearTimeout(airportTimer)
    //搜尋框完全沒字時，立刻把選單清空並直接結束，不浪費 API 額度去搜尋空字串
    if (!newVal.trim()) {
      airports.value = []
      return
    }
    //超過0.3秒沒再打字才去抓資料
    airportTimer = window.setTimeout(async () => {
      airports.value = await tdxService.getAirports(newVal, 30)
    }, 300)
  },
)

watch(
  () => store.airlineQuery,
  (newVal) => {
    if (
      store.selectedAirline &&
      newVal !== (store.selectedAirline.AirlineName?.Zh_tw || store.selectedAirline.AirlineID)
    ) {
      store.selectedAirline = null
    }
    clearTimeout(airlineTimer)
    if (!newVal.trim()) {
      airlines.value = []
      return
    }
    airlineTimer = window.setTimeout(async () => {
      airlines.value = await tdxService.getAirlines(newVal, 30)
    }, 300)
  },
)

//搜尋即時航班動態
const loadFlightData = async () => {
  const targetId = store.selectedAirport
    ? store.selectedAirport.AirportID || store.selectedAirport.AirportCode || 'TPE'
    : 'TPE'
  //使用者當前選好的條件
  store.searchedAirport = store.selectedAirport
  store.searchedAirline = store.selectedAirline
  store.searchedTimeMode = store.formTimeMode

  store.hasSearched = true //控制引導提示<->航班清單
  isLoading.value = true //控制載入中……
  isRateLimited.value = false //控制err429警告畫面
  displayLimit.value = 20

  try {
    let res: TdxFlightFids[] = []
    if (store.formFlightType === 'Departure') {
      res = await tdxService.getDepartureFlights(targetId)
    } else {
      res = await tdxService.getArrivalFlights(targetId)
    }
    store.rawFlights = res
  } catch (err: any) {
    if (err?.response?.status === 429 || err?.status === 429) {
      isRateLimited.value = true
    }
  } finally {
    //最後不論成功還是失敗，都一定會執行 finally
    isLoading.value = false
  }
}

const filteredFlights = computed(() => {
  let list = [...store.rawFlights]
  // 1. 篩選航空公司
  if (store.searchedAirline) {
    const targetCode = store.searchedAirline.AirlineIATA || store.searchedAirline.AirlineID
    list = list.filter((f) => f.AirlineID === targetCode)
  }
  // 2. 篩選特定航班號碼 / 呼號
  if (flightNumberQuery.value.trim()) {
    const query = flightNumberQuery.value.trim().toUpperCase()
    list = list.filter((f) => {
      const num = (f.FlightNumber || '').toString().toUpperCase()
      const combined = `${f.AirlineID || ''}${num}`
      return num.includes(query) || combined.includes(query)
    })
  }
  // 3. 篩選時間範圍 (過濾掉 30 分鐘以前的舊航班)
  if (store.searchedTimeMode === 'upcoming') {
    const nowThreshold = Date.now() - 30 * 60 * 1000
    list = list.filter((f) => {
      const timeStr = f.ScheduleDepartureTime || f.ScheduleArrivalTime
      if (!timeStr) return true
      const flightTime = new Date(timeStr).getTime()
      return !isNaN(flightTime) && flightTime >= nowThreshold
    })
  }
  // 4. 按出發時間從小到大排序 (timeA - timeB)
  list.sort((a, b) => {
    const timeA = new Date(a.ScheduleDepartureTime || a.ScheduleArrivalTime || 0).getTime()
    const timeB = new Date(b.ScheduleDepartureTime || b.ScheduleArrivalTime || 0).getTime()
    return timeA - timeB
  })

  return list
})

//顯示前20筆
const visibleFlights = computed(() => {
  return filteredFlights.value.slice(0, displayLimit.value)
})

const loadMore = () => {
  displayLimit.value += 20
}

//alertClaimItems 與 alertStats 統計數字，直接送進 <InsuranceAlertBoard> 呈現
//傳回的 checkInsuranceEligibility 則傳給 <FlightCard> 決定要不要亮紅框
const { checkInsuranceEligibility, alertClaimItems, alertStats } = useInsurance(filteredFlights)

const handleAirportSelect = (airport: TdxAirport) => {
  store.selectedAirport = airport
  store.airportQuery = airport.AirportName?.Zh_tw || airport.AirportID
  airports.value = []
}

const handleAirlineSelect = (airline: TdxAirline) => {
  store.selectedAirline = airline
  store.airlineQuery = airline.AirlineName?.Zh_tw || airline.AirlineID
  airlines.value = []
}

const clearAirport = () => {
  store.selectedAirport = null
  store.airportQuery = ''
  airports.value = []
}

const clearAirline = () => {
  store.selectedAirline = null
  store.airlineQuery = ''
  airlines.value = []
}

const resetFilters = () => {
  store.clearStore()
  flightNumberQuery.value = ''
  clearAirport()
  clearAirline()
}
</script>

<style scoped>
.flight-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

.header h1 {
  font-size: 1.8rem;
  color: #1e293b;
}

.filter-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.reset-btn {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.flight-num-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  width: 100%;
}

.selector-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.selector-input {
  width: 100%;
  padding: 10px 36px 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  background-color: #ffffff;
}

.selector-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 50%;
}

.clear-btn:hover {
  color: #4b5563;
  background-color: #f3f4f6;
}

.hint-text {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 2px;
}

.system-notice {
  font-size: 0.8rem;
  color: #475569;
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 6px;
  border-left: 3px solid #2563eb;
  margin-bottom: 1rem;
}

.filter-options-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem 0;
  border-top: 1px dashed #e2e8f0;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.option-title {
  font-weight: bold;
  color: #475569;
  font-size: 0.9rem;
  min-width: 80px;
}

.radio-group {
  display: flex;
  gap: 1.5rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
}

.action-row {
  margin-top: 1rem;
  text-align: right;
}

.search-btn {
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 10px 28px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
}

.search-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.title-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.selected-tag {
  color: #2563eb;
}
.airline-tag {
  color: #059669;
}

.mode-badge {
  background: #f1f5f9;
  color: #475569;
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 6px;
  font-weight: 600;
}

.status-legend {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: #64748b;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot.green {
  background-color: #22c55e;
}
.dot.yellow {
  background-color: #eab308;
}
.dot.red {
  background-color: #ef4444;
}

.flight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.load-more-wrapper {
  text-align: center;
  margin-top: 1.5rem;
}

.load-more-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #334155;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.loading-state,
.empty-flights {
  text-align: center;
  padding: 3rem;
  background: #ffffff;
  border-radius: 8px;
  color: #64748b;
  border: 1px dashed #cbd5e1;
}

.error-state {
  text-align: center;
  padding: 2.5rem;
  background: #fef2f2;
  border-radius: 12px;
  color: #991b1b;
  border: 1px solid #fca5a5;
  margin: 1rem 0;
}

.retry-btn {
  background: #ef4444;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
}
</style>
