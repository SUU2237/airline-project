//儲存當前搜尋到的航班，避免使用者切換頁面時資料丟失
//把「使用者正在輸入的草稿」跟「已經按下搜尋的結果」分開保存

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TdxAirport, TdxAirline } from '@/types/tdx'
import type { TdxFlightFids } from '@/types/flight'

export const useFlightStore = defineStore('flight', () => {
  // 1. 使用者目前在輸入框裡面打的文字
  const airportQuery = ref('')
  const airlineQuery = ref('')
  const selectedAirport = ref<TdxAirport | null>(null)
  const selectedAirline = ref<TdxAirline | null>(null)
  const formFlightType = ref<'Departure' | 'Arrival'>('Departure')
  const formTimeMode = ref<'upcoming' | 'all'>('upcoming')

  // 2. 快取狀態：按下搜尋按鈕後才生效（避免使用者先查了A按下搜尋，又改查B但還沒按下搜尋，所以畫面不應該直接顯示B，所以需要先把A存起來，渲染A就好）
  //正式搜尋的、已經按下搜尋鍵的内容
  const searchedAirport = ref<TdxAirport | null>(null)
  const searchedAirline = ref<TdxAirline | null>(null)
  const searchedTimeMode = ref<'upcoming' | 'all'>('upcoming')
  const hasSearched = ref(false)
  const rawFlights = ref<TdxFlightFids[]>([]) //搜尋到的航班資料（避免切換頁面就不見）

  // 3. 重設按鈕：重設表單與搜尋狀態
  const clearStore = () => {
    airportQuery.value = ''
    airlineQuery.value = ''
    selectedAirport.value = null
    selectedAirline.value = null
    searchedAirport.value = null
    searchedAirline.value = null
    hasSearched.value = false
    rawFlights.value = []
  }

  return {
    airportQuery,
    airlineQuery,
    selectedAirport,
    selectedAirline,
    formFlightType,
    formTimeMode,
    searchedAirport,
    searchedAirline,
    searchedTimeMode,
    hasSearched,
    rawFlights,
    clearStore,
  }
})
