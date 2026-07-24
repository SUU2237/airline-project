import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TdxAirport, TdxAirline } from '@/types/tdx'
import type { TdxFlightFids } from '@/types/flight'

export const useFlightStore = defineStore('flight', () => {
  // 1. 表單當前輸入狀態
  const airportQuery = ref('')
  const airlineQuery = ref('')
  const selectedAirport = ref<TdxAirport | null>(null)
  const selectedAirline = ref<TdxAirline | null>(null)
  const formFlightType = ref<'Departure' | 'Arrival'>('Departure')
  const formTimeMode = ref<'upcoming' | 'all'>('upcoming')

  // 2. 按下搜尋後生效的快照狀態
  const searchedAirport = ref<TdxAirport | null>(null)
  const searchedAirline = ref<TdxAirline | null>(null)
  const searchedTimeMode = ref<'upcoming' | 'all'>('upcoming')
  const hasSearched = ref(false)
  const rawFlights = ref<TdxFlightFids[]>([])

  // 3. 重設表單與搜尋狀態
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
