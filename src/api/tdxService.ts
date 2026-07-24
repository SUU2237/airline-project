import tdxClient from './tdxClient'
import type { TdxAirport, TdxAirline } from '@/types/tdx'
import type { TdxFlightFids } from '@/types/flight'

let airportsCache: TdxAirport[] | null = null
let airlinesCache: TdxAirline[] | null = null

const flightCache = new Map<string, { data: TdxFlightFids[]; timestamp: number }>()
const CACHE_TTL_MS = 60 * 1000

// 臺灣常見本土機場 ID 列表
const TAIWAN_AIRPORT_IDS = [
  'TPE',
  'TSA',
  'KHH',
  'RMQ',
  'HUN',
  'MZG',
  'KMN',
  'TTT',
  'CYI',
  'PIF',
  'LZN',
]

export const tdxService = {
  async getAirports(keyword = '', top = 30): Promise<TdxAirport[]> {
    const trimmed = keyword.trim()
    if (!airportsCache) {
      try {
        const raw = await tdxClient.get<unknown, TdxAirport[]>('/v2/Air/Airport', {
          params: { $top: 1000 },
        })
        airportsCache = Array.isArray(raw) ? raw : []
      } catch {
        airportsCache = []
      }
    }
    if (!trimmed) return airportsCache.slice(0, top)
    return airportsCache
      .filter((item) =>
        [
          item.AirportID,
          item.AirportCode,
          item.AirportIATA,
          item.AirportName?.Zh_tw,
          item.AirportName?.En,
        ].some((f) => f?.toString().toLowerCase().includes(trimmed.toLowerCase())),
      )
      .slice(0, top)
  },

  async getAirlines(keyword = '', top = 30): Promise<TdxAirline[]> {
    const trimmed = keyword.trim()
    if (!airlinesCache) {
      try {
        const raw = await tdxClient.get<unknown, TdxAirline[]>('/v2/Air/Airline', {
          params: { $top: 1000 },
        })
        airlinesCache = Array.isArray(raw) ? raw : []
      } catch {
        airlinesCache = []
      }
    }
    if (!trimmed) return airlinesCache.slice(0, top)
    return airlinesCache
      .filter((item) =>
        [
          item.AirlineID,
          item.AirlineIATA,
          item.AirlineICAO,
          item.AirlineName?.Zh_tw,
          item.AirlineName?.En,
        ].some((f) => f?.toString().toLowerCase().includes(trimmed.toLowerCase())),
      )
      .slice(0, top)
  },

  /**
   * 取得離站航班 (含國外機場自動轉譯與型別安全機制)
   */
  async getDepartureFlights(airportID: string): Promise<TdxFlightFids[]> {
    if (!airportID) return []
    const cleanId = airportID.trim().toUpperCase()

    // 💡 國外機場智慧判定：若搜尋的是國外機場 (如 NRT)，轉為向 TPE (桃園) 查詢
    const isTaiwanAirport = TAIWAN_AIRPORT_IDS.includes(cleanId)
    const requestTarget = isTaiwanAirport ? cleanId : 'TPE'

    const cacheKey = `DEP_${cleanId}`
    const cached = flightCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const defaultTop = 1000

    try {
      const res = await tdxClient.get<unknown, TdxFlightFids[]>(
        `/v2/Air/FIDS/Airport/Departure/${requestTarget}`,
        {
          params: {
            $top: defaultTop,
            $filter: `ScheduleDepartureTime ge ${todayStr}`,
          },
        },
      )
      let result = Array.isArray(res) ? res : []

      // 💡 修正型別報錯：透過 safely 獲取 ArrivalAirportID 欄位
      if (!isTaiwanAirport) {
        result = result.filter((f) => {
          const destCode = f.ArrivalAirportID || (f as any).DestinationAirportID || ''
          return destCode.toUpperCase() === cleanId
        })
      }

      flightCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    } catch (err: any) {
      if (err?.response?.status === 500 || err?.status === 500) {
        console.warn(`[TDX Warning] ${requestTarget} 請求 500 錯誤，降級重試...`)
        try {
          const fallbackRes = await tdxClient.get<unknown, TdxFlightFids[]>(
            `/v2/Air/FIDS/Airport/Departure/${requestTarget}`,
            {
              params: {
                $top: 300,
                $filter: `ScheduleDepartureTime ge ${todayStr}`,
              },
            },
          )
          let fallbackResult = Array.isArray(fallbackRes) ? fallbackRes : []
          if (!isTaiwanAirport) {
            fallbackResult = fallbackResult.filter((f) => {
              const destCode = f.ArrivalAirportID || (f as any).DestinationAirportID || ''
              return destCode.toUpperCase() === cleanId
            })
          }
          flightCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() })
          return fallbackResult
        } catch (fallbackErr) {
          throw fallbackErr
        }
      }
      throw err
    }
  },

  /**
   * 取得到站航班 (含國外機場自動轉譯與型別安全機制)
   */
  async getArrivalFlights(airportID: string): Promise<TdxFlightFids[]> {
    if (!airportID) return []
    const cleanId = airportID.trim().toUpperCase()

    const isTaiwanAirport = TAIWAN_AIRPORT_IDS.includes(cleanId)
    const requestTarget = isTaiwanAirport ? cleanId : 'TPE'

    const cacheKey = `ARR_${cleanId}`
    const cached = flightCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const defaultTop = 1000

    try {
      const res = await tdxClient.get<unknown, TdxFlightFids[]>(
        `/v2/Air/FIDS/Airport/Arrival/${requestTarget}`,
        {
          params: {
            $top: defaultTop,
            $filter: `ScheduleArrivalTime ge ${todayStr}`,
          },
        },
      )
      let result = Array.isArray(res) ? res : []

      // 💡 修正型別報錯：透過 safely 獲取 DepartureAirportID 欄位
      if (!isTaiwanAirport) {
        result = result.filter((f) => {
          const originCode = f.DepartureAirportID || (f as any).OriginAirportID || ''
          return originCode.toUpperCase() === cleanId
        })
      }

      flightCache.set(cacheKey, { data: result, timestamp: Date.now() })
      return result
    } catch (err: any) {
      if (err?.response?.status === 500 || err?.status === 500) {
        console.warn(`[TDX Warning] ${requestTarget} 請求 500 錯誤，降級重試...`)
        try {
          const fallbackRes = await tdxClient.get<unknown, TdxFlightFids[]>(
            `/v2/Air/FIDS/Airport/Arrival/${requestTarget}`,
            {
              params: {
                $top: 300,
                $filter: `ScheduleArrivalTime ge ${todayStr}`,
              },
            },
          )
          let fallbackResult = Array.isArray(fallbackRes) ? fallbackRes : []
          if (!isTaiwanAirport) {
            fallbackResult = fallbackResult.filter((f) => {
              const originCode = f.DepartureAirportID || (f as any).OriginAirportID || ''
              return originCode.toUpperCase() === cleanId
            })
          }
          flightCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() })
          return fallbackResult
        } catch (fallbackErr) {
          throw fallbackErr
        }
      }
      throw err
    }
  },
}
