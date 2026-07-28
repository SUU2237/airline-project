import type { TdxAirline } from './tdx'

// 航班 FIDS 列表單項型別別名 (相容兩者)
export type FlightFIDSItem = TdxFlightFids

// TDX FIDS 航班即時動態資料結構 (依據 TDX 官方 Schema)
export interface TdxFlightFids {
  FlightNumber: string
  AirlineID: string
  Airline?: TdxAirline
  DepartureAirportID: string
  ArrivalAirportID: string
  FlightDate?: string
  ScheduleDepartureTime?: string
  EstimatedDepartureTime?: string
  ActualDepartureTime?: string
  ScheduleArrivalTime?: string
  EstimatedArrivalTime?: string
  ActualArrivalTime?: string
  DepartureRemark?: string
  ArrivalRemark?: string
  Terminal?: string
  Gate?: string
}

// 不便險判定結果資料結構
export interface InsuranceClaimItem {
  flight: TdxFlightFids
  reason: 'DELAY_EXCEEDED' | 'FLIGHT_CANCELLED'
  delayMinutes: number
  description: string
}

// 💡 OpenSky 飛機狀態型別
export interface OpenSkyState {
  icao24: string
  callsign: string
  originCountry: string
  longitude: number
  latitude: number
  baroAltitude: number | null // 高度 (米)
  velocity: number | null // 速度 (m/s)
  trueTrack: number | null // 航向角 (0~360度)
  onGround: boolean
}

// 地圖軌跡點位型別
export interface FlightPathPoint {
  lat: number
  lng: number
  altitude?: number
}
