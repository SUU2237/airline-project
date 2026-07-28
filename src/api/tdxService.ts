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
        //把所有文字欄位抓出來組成一個小陣列
        getFields(item).some((f) => f?.toString().toLowerCase().includes(trimmed.toLowerCase())), //防爆：如果有這個屬性才繼續往下讀取；沒有的話就直接回傳 undefined，不要報錯崩潰
    )
    .slice(0, top)
}

/**
 *  離站 / 到站 航班 FIDS 通用請求 Helper
 */
async function fetchFlightFids(
  type: 'Departure' | 'Arrival',
  airportID: string,
): Promise<TdxFlightFids[]> {
  if (!airportID) return []
  const cleanId = airportID.trim().toUpperCase()

  // 國外機場判定：若搜尋的是國外機場 (如 NRT)，轉為向 TPE (桃園) 查詢
  const isTaiwanAirport = TAIWAN_AIRPORT_IDS.includes(cleanId)
  const requestTarget = isTaiwanAirport ? cleanId : 'TPE'

  const cacheKey = `${type === 'Departure' ? 'DEP' : 'ARR'}_${cleanId}`
  const cached = flightCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    //用「現在時間」減去「當初抓資料的時間」。如果相差小於 60 秒，代表資料還很新鮮，直接回傳暫存檔，不浪費 API 額度！
    return cached.data
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const isDep = type === 'Departure'

  // 通用發送請求邏輯
  const doRequest = async (top: number) => {
    const res = await tdxClient.get<unknown, TdxFlightFids[]>(
      `/v2/Air/FIDS/Airport/${type}/${requestTarget}`,
      {
        params: {
          $top: top,
          $filter: `${isDep ? 'ScheduleDepartureTime' : 'ScheduleArrivalTime'} ge ${todayStr}`, // 過濾掉今天以前的資料（ge 代表大於等於今日）
        },
      },
    )
    let result = Array.isArray(res) ? res : []

    // 如果使用者原本查的是「國外機場 (如 NRT)」，在此做二次篩選
    if (!isTaiwanAirport) {
      result = result.filter((f) => {
        const code = isDep
          ? f.ArrivalAirportID || (f as any).DestinationAirportID || '' //API版本差所以有兩種目的地寫法==
          : f.DepartureAirportID || (f as any).OriginAirportID || ''
        return code.toUpperCase() === cleanId
      })
    }
    return result
  }

  try {
    const result = await doRequest(1000)
    flightCache.set(cacheKey, { data: result, timestamp: Date.now() })
    return result
  } catch (err: any) {
    if (err?.response?.status === 500 || err?.status === 500) {
      // Server Error
      console.warn(`[TDX Warning] ${requestTarget} 請求 500 錯誤，降級重試...`)
      // 降級重試：把原本請求的 $top: 1000 改為 $top: 300
      try {
        const fallbackResult = await doRequest(300)
        flightCache.set(cacheKey, { data: fallbackResult, timestamp: Date.now() })
        return fallbackResult
      } catch (fallbackErr) {
        throw fallbackErr
      }
    }
    throw err
  }
}

export const tdxService = {
  // 取得機場
  async getAirports(keyword = '', top = 30): Promise<TdxAirport[]> {
    return searchCacheList(
      airportsCache,
      () =>
        tdxClient.get<unknown, TdxAirport[]>('/v2/Air/Airport', {
          // unknown：代表發送 GET 請求時，不帶任何 Body 請求資料（因為是 GET，所以 Body 型別未知/不需要）。
          params: { $top: 1000 }, // TdxAirport[]：代表預期伺服器回傳的 Response 資料結構是一個 TdxAirport 陣列
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
