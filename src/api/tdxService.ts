//快取與記憶體管理、搜尋與過濾

import tdxClient from './tdxClient'
import type { TdxAirport, TdxAirline } from '@/types/tdx'
import type { TdxFlightFids } from '@/types/flight'

//全臺灣機場&航空公司資料變動極低，所以第一次抓完後存入 airportsCache，之後搜尋關鍵字，不需要再發網路請求
let airportsCache: TdxAirport[] | null = null
let airlinesCache: TdxAirline[] | null = null

//10 秒內連續點擊兩次「搜尋」，第二次會直接退回 Cache，防止被 TDX 限流（Rate Limit / HTTP 429）
const flightCache = new Map<string, { data: TdxFlightFids[]; timestamp: number }>()
const CACHE_TTL_MS = 60 * 1000 //一分鐘

// 臺灣常見本土機場 ID 列表，方便後續判讀是否為台灣機場用
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

/**
 * 搜尋快取列表通用 Helper（供 getAirports 與 getAirlines 共用）
 */
async function searchCacheList<T>(
  cache: T[] | null,
  fetcher: () => Promise<T[]>, //萬一快取是 null，就去要資料
  setCache: (data: T[]) => void, //抓完資料存入cache（函式）
  keyword: string,
  top: number,
  getFields: (item: T) => (string | undefined)[], //欄位提取規則（函式）
): Promise<T[]> {
  //最後回傳的結果，會是一個包在 Promise 號碼牌裡面的陣列

  const trimmed = keyword.trim()

  if (!cache) {
    try {
      const raw = await fetcher()
      cache = Array.isArray(raw) ? raw : [] //防爆：是陣列才存；不是就給空陣列防爆
    } catch {
      cache = []
    }
    setCache(cache)
  }

  //沒有輸入時，預設前30筆
  if (!trimmed) return cache.slice(0, top)

  return cache
    .filter(
      (item) =>
        //把每一個機場的 ID 與名稱等抓出來組成一個小陣列，比對陣列裡有沒有包含keyword
        getFields(item).some((f) => f?.toString().toLowerCase().includes(trimmed.toLowerCase())), //防爆：如果有這個屬性才繼續往下讀取；沒有的話就直接回傳 undefined，不要報錯崩潰
    )
    .slice(0, top)
}

/**
 * 國外機場資料二次過濾 Helper
 */
function filterForeignAirport(
  flights: TdxFlightFids[],
  targetCleanId: string,
  isDep: boolean,
): TdxFlightFids[] {
  return flights.filter((f) => {
    const code = isDep
      ? f.ArrivalAirportID || (f as any).DestinationAirportID || '' // API版本差異
      : f.DepartureAirportID || (f as any).OriginAirportID || ''
    return code.toUpperCase() === targetCleanId
  })
}

/**
 * 離站 / 到站 航班 FIDS 通用請求 Helper (重構版)
 */
async function fetchFlightFids(
  type: 'Departure' | 'Arrival',
  airportID: string,
): Promise<TdxFlightFids[]> {
  if (!airportID) return []
  const cleanId = airportID.trim().toUpperCase()

  const isTaiwanAirport = TAIWAN_AIRPORT_IDS.includes(cleanId)
  const isDep = type === 'Departure'

  // 如果是國外機場，對 TDX 來說 API 的「離站/到站」型別必須反轉！
  const actualApiType = isTaiwanAirport ? type : isDep ? 'Arrival' : 'Departure'
  //是國外機場就查TPE
  const requestTarget = isTaiwanAirport ? cleanId : 'TPE'
  const todayStr = new Date().toISOString().split('T')[0]

  // 1. 檢查快取，60 秒內查過同一個機場/航空，有就直接return
  const cacheKey = `${type}_${cleanId}`
  const cached = flightCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  //API工具
  const executeApiCall = async (top: number) => {
    const filterTimeField =
      actualApiType === 'Departure' ? 'ScheduleDepartureTime' : 'ScheduleArrivalTime'

    const res = await tdxClient.get<unknown, TdxFlightFids[]>(
      `/v2/Air/FIDS/Airport/${actualApiType}/${requestTarget}`,
      {
        params: {
          $top: top,
          $filter: `${filterTimeField} ge ${todayStr}`,
        },
      },
    )
    return Array.isArray(res) ? res : []
  }

  // 2. 發送 API 請求 (國外機場使用反轉後的 actualApiType)
  //減少資料數量重試
  let rawFlights: TdxFlightFids[] = []
  try {
    rawFlights = await executeApiCall(1000) //抓1000筆
  } catch (err: any) {
    if (err?.response?.status === 500 || err?.status === 500) {
      console.warn(`[TDX Warning] ${requestTarget} 請求 500 錯誤，降級重試...`)
      rawFlights = await executeApiCall(300)
    } else {
      throw err
    }
  }

  // 3. 資料加工：若為國外機場，做過濾
  let finalResult = rawFlights
  if (!isTaiwanAirport) {
    finalResult = rawFlights.filter((f) => {
      // 因為 API 型別反轉了，所以要判斷要看的是「出發地」還是「目的地」
      const code = isDep
        ? f.DepartureAirportID || (f as any).OriginAirportID || ''
        : f.ArrivalAirportID || (f as any).DestinationAirportID || ''
      //符合該機場的資料被放行
      return code.toUpperCase() === cleanId
    })
  }

  // 4. 寫入快取並回傳
  flightCache.set(cacheKey, { data: finalResult, timestamp: Date.now() })
  return finalResult
}

export const tdxService = {
  // 取得機場
  async getAirports(keyword = '', top = 30): Promise<TdxAirport[]> {
    return searchCacheList(
      airportsCache,
      () =>
        tdxClient.get<unknown, TdxAirport[]>('/v2/Air/Airport', {
          // unknown：代表發送 GET 請求時，不帶任何 Body 請求資料（因為是 GET，所以 Body 型別未知/不需要）。
          params: { $top: 1000 },
        }),
      (data) => (airportsCache = data),
      keyword,
      top, //把過濾後的結果前top筆列出來
      (item) => [
        item.AirportID,
        item.AirportCode,
        item.AirportIATA,
        item.AirportName?.Zh_tw,
        item.AirportName?.En,
      ],
    )
  },

  // 取得航空
  async getAirlines(keyword = '', top = 30): Promise<TdxAirline[]> {
    return searchCacheList(
      airlinesCache,
      () =>
        tdxClient.get<unknown, TdxAirline[]>('/v2/Air/Airline', {
          params: { $top: 1000 },
        }),
      (data) => (airlinesCache = data),
      keyword,
      top,
      (item) => [
        item.AirlineID,
        item.AirlineIATA,
        item.AirlineICAO,
        item.AirlineName?.Zh_tw,
        item.AirlineName?.En,
      ],
    )
  },

  // 取得離站航班
  getDepartureFlights(airportID: string): Promise<TdxFlightFids[]> {
    return fetchFlightFids('Departure', airportID)
  },

  // 取得到站航班
  getArrivalFlights(airportID: string): Promise<TdxFlightFids[]> {
    return fetchFlightFids('Arrival', airportID)
  },
}
