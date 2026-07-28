import axios from 'axios'
import type { OpenSkyState, FlightPathPoint } from '@/types/flight'

export interface AirportGeoInfo {
  lat: number
  lng: number
  name: string
  iata: string
}

let globalAirportsCache: Record<string, AirportGeoInfo> | null = null

//把機場代碼（如 TPE、NRT）轉成經緯度
export async function getAirportCoordinates(iataCode: string): Promise<AirportGeoInfo> {
  const code = iataCode.trim().toUpperCase()

  //把 GitHub 上的全球機場 JSON 全抓下來存進globalAirportsCache
  if (!globalAirportsCache) {
    try {
      const res = await axios.get<Record<string, any>>(
        'https://raw.githubusercontent.com/mwgg/Airports/master/airports.json',
        { timeout: 8000 },
      )
      const rawData = res.data || {}
      const mapped: Record<string, AirportGeoInfo> = {}

      Object.values(rawData).forEach((item: any) => {
        if (item?.iata && item?.lat !== undefined && item?.lon !== undefined) {
          mapped[item.iata.toUpperCase()] = {
            iata: item.iata.toUpperCase(),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            name: item.name || `${item.iata} Airport`,
          }
        }
      })
      globalAirportsCache = mapped
    } catch {
      globalAirportsCache = {}
    }
  }

  if (globalAirportsCache[code]) {
    return globalAirportsCache[code]
  }

  return {
    iata: code,
    lat: 25.0797,
    lng: 121.2342,
    name: `${code} 機場`,
  }
}

//向 OpenSky 平台查詢飛機現在飛到哪裡了
export const openSkyService = {
  async getFlightState(callsign: string): Promise<OpenSkyState | null> {
    if (!callsign) return null
    const cleanCallsign = callsign.trim().toUpperCase()

    //targetUrl 限制搜尋範圍：臺灣上空的經緯度範圍
    const targetUrl =
      'https://opensky-network.org/api/states/all?lamin=20.0&lamax=28.0&lomin=118.0&lomax=124.0'
    //proxyUrl 解決 CORS 跨域
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}` //因為 OpenSky 的官方 API 會有跨域（CORS）阻擋，所以透過 allorigins.win 代理伺服器傳輸

    try {
      const response = await axios.get(proxyUrl, { timeout: 6000 })
      const states = response.data?.states
      if (!Array.isArray(states)) return null //因為 OpenSky 有時候如果沒抓到任何飛機，會回傳奇怪的格式或空值。先做格式驗證，可以防止程式直接爆掉崩潰

      // /在飛機清單裡尋找對應班機
      const matched = states.find((item: any[]) => {
        const itemCallsign = (item[1] || '').toString().trim().toUpperCase()
        return itemCallsign.includes(cleanCallsign)
      })

      if (matched) {
        return {
          //原本回傳的是很抽象的陣列索引，閱讀性很差，我們把它轉換成有語意的欄位
          icao24: matched[0],
          callsign: matched[1].trim(),
          originCountry: matched[2],
          longitude: matched[5],
          latitude: matched[6],
          baroAltitude: matched[7],
          onGround: matched[8],
          velocity: matched[9],
          trueTrack: matched[10],
        }
      }
    } catch {
      console.warn('[OpenSky API] 切換至平滑航跡模擬模式。')
    }

    return null
  },

  /**
   * 航線生成器 (不拆斷線條，保持太平洋連續性)
   */
  async generateSimulatedPath(
    depCode: string,
    arrCode: string,
    progress: number = 0.55,
  ): Promise<{
    path: FlightPathPoint[]
    currentPosition: OpenSkyState
    dep: AirportGeoInfo
    arr: AirportGeoInfo
  }> {
    const rawDep = await getAirportCoordinates(depCode)
    const rawArr = await getAirportCoordinates(arrCode)

    const dep = { ...rawDep }
    const arr = { ...rawArr }

    // 1. 計算跨換日線最短經度差，並直接調整到達機場的連續經度
    let deltaLng = arr.lng - dep.lng
    if (deltaLng > 180) {
      deltaLng -= 360
      arr.lng -= 360 // 連續延伸經度
    } else if (deltaLng < -180) {
      deltaLng += 360
      arr.lng += 360 // 連續延伸經度
    }

    const steps = 60
    const path: FlightPathPoint[] = []
    const deltaLat = arr.lat - dep.lat
    const totalDist = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng)

    // 2. 依總距離推算高緯度大圓曲率弧度
    const arcHeight = Math.min(totalDist * 0.15, 12)

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const lat = dep.lat + deltaLat * t + Math.sin(t * Math.PI) * arcHeight
      const lng = dep.lng + deltaLng * t // 保持連續經度，不進行 wrap 截斷！
      path.push({ lat, lng })
    }

    const currIndex = Math.floor(progress * steps)
    const fallbackPoint = path[0] || { lat: dep.lat, lng: dep.lng }
    const currPoint = path[currIndex] || path[Math.floor(steps / 2)] || fallbackPoint

    // 3. 航向角度算術
    const rad = Math.atan2(deltaLng, deltaLat)
    const trueTrack = Math.round(((rad * 180) / Math.PI + 360) % 360)

    const currentPosition: OpenSkyState = {
      icao24: 'SIMULATED',
      callsign: `${depCode}-${arrCode}`,
      originCountry: 'International',
      latitude: currPoint.lat,
      longitude: currPoint.lng,
      baroAltitude: 10600,
      velocity: 250,
      trueTrack,
      onGround: false,
    }

    return { path, currentPosition, dep, arr }
  },
}
