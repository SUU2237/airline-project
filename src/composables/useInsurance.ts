import { computed, type Ref } from 'vue'
import type { TdxFlightFids, InsuranceClaimItem } from '@/types/flight'

// 正式情況 240（分鐘），測試用暫時設定60
const DELAY_THRESHOLD_MINUTES = 60

export function useInsurance(flights: Ref<TdxFlightFids[]>) {
  /**
   * 計算單一航班的延誤分鐘數 (相容 UTC 時間與本地時區)
   */
  const calculateDelayMinutes = (flight: TdxFlightFids): number => {
    const scheduleStr = flight.ScheduleDepartureTime || flight.ScheduleArrivalTime
    const estimatedStr =
      flight.EstimatedDepartureTime ||
      flight.ActualDepartureTime ||
      flight.EstimatedArrivalTime ||
      flight.ActualArrivalTime

    if (!scheduleStr || !estimatedStr) return 0

    const scheduleTime = new Date(scheduleStr).getTime()
    const estimatedTime = new Date(estimatedStr).getTime()

    if (isNaN(scheduleTime) || isNaN(estimatedTime)) return 0

    const diffMinutes = Math.round((estimatedTime - scheduleTime) / (1000 * 60)) //換算分鐘
    return diffMinutes > 0 ? diffMinutes : 0
  }

  /**
   * 檢查單一航班符合哪種理賠
   */
  const checkInsuranceEligibility = (flight: TdxFlightFids): InsuranceClaimItem | null => {
    const delayMinutes = calculateDelayMinutes(flight)
    const remark = (flight.DepartureRemark || flight.ArrivalRemark || '').toLowerCase()

    // 條件 1：航班取消
    if (remark.includes('取消') || remark.includes('cancel')) {
      return {
        flight,
        reason: 'FLIGHT_CANCELLED',
        delayMinutes,
        description: '班機已取消（符合不便險理賠資格）',
      }
    }

    // 條件 2：延誤時間 >= 門檻
    if (delayMinutes >= DELAY_THRESHOLD_MINUTES) {
      const hours = (delayMinutes / 60).toFixed(1)
      return {
        flight,
        reason: 'DELAY_EXCEEDED',
        delayMinutes,
        description: `班機延誤 ${delayMinutes} 分鐘 (${hours} 小時)，達不便險門檻`,
      }
    }

    return null
  }

  // 篩選出所有符合理賠的航班
  const alertClaimItems = computed<InsuranceClaimItem[]>(() => {
    const list: InsuranceClaimItem[] = []
    for (const flight of flights.value) {
      const claim = checkInsuranceEligibility(flight)
      if (claim) {
        list.push(claim)
      }
    }
    return list
  })

  // 不便險警示統計數據
  const alertStats = computed(() => {
    const totalAlerts = alertClaimItems.value.length
    const cancelledCount = alertClaimItems.value.filter(
      (i) => i.reason === 'FLIGHT_CANCELLED',
    ).length
    const delayedCount = alertClaimItems.value.filter((i) => i.reason === 'DELAY_EXCEEDED').length

    return {
      totalAlerts,
      cancelledCount,
      delayedCount,
    }
  })

  return {
    calculateDelayMinutes,
    checkInsuranceEligibility,
    alertClaimItems,
    alertStats,
  }
}
