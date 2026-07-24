<template>
  <div class="flight-card" :class="{ 'is-insurance-alert': isAlert }">
    <div v-if="isAlert" class="alert-badge">不便險標的</div>

    <div class="card-header">
      <div class="airline-info">
        <span class="flight-code">{{ flight.AirlineID }}{{ flight.FlightNumber }}</span>
      </div>
      <div class="status-badge" :class="statusClass">
        {{ cleanStatusText }}
      </div>
    </div>

    <div class="card-body">
      <div class="route">
        <span class="airport">{{ flight.DepartureAirportID }}</span>
        <span class="arrow">→</span>
        <span class="airport">{{ flight.ArrivalAirportID }}</span>
      </div>

      <div class="time-info">
        <p>
          <strong>預定時間：</strong
          >{{ formatTime(flight.ScheduleDepartureTime || flight.ScheduleArrivalTime) }}
        </p>
        <p v-if="flight.EstimatedDepartureTime || flight.EstimatedArrivalTime">
          <strong>預估時間：</strong
          >{{ formatTime(flight.EstimatedDepartureTime || flight.EstimatedArrivalTime) }}
        </p>
      </div>

      <!-- 💡 使用 margin-top: auto 使按鈕永遠齊平貼齊底部 -->
      <button type="button" class="radar-btn" @click="goToMap">查看空中即時雷達</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { TdxFlightFids } from '@/types/flight'

interface Props {
  flight: TdxFlightFids
  isAlert?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isAlert: false,
})

const router = useRouter()

const delayMinutes = computed(() => {
  const scheduleStr = props.flight.ScheduleDepartureTime || props.flight.ScheduleArrivalTime
  const estimatedStr =
    props.flight.EstimatedDepartureTime ||
    props.flight.ActualDepartureTime ||
    props.flight.EstimatedArrivalTime
  if (!scheduleStr || !estimatedStr) return 0

  const s = new Date(scheduleStr).getTime()
  const e = new Date(estimatedStr).getTime()
  const diff = Math.round((e - s) / (1000 * 60))
  return diff > 0 ? diff : 0
})

const cleanStatusText = computed(() => {
  const rawRemark = props.flight.DepartureRemark || props.flight.ArrivalRemark || ''

  if (rawRemark.includes('取消') || rawRemark.toLowerCase().includes('cancel')) {
    return '取消'
  }
  if (delayMinutes.value > 0 || rawRemark.includes('延遲') || rawRemark.includes('延誤')) {
    return `延誤 ${delayMinutes.value > 0 ? delayMinutes.value + '分' : ''}`
  }
  if (rawRemark.includes('出發') || rawRemark.includes('起飛')) {
    return '出發'
  }
  if (rawRemark.includes('到達') || rawRemark.includes('到站')) {
    return '到達'
  }
  return rawRemark.replace(/[a-zA-Z]/g, '').trim() || '準點'
})

const statusClass = computed(() => {
  const text = cleanStatusText.value
  if (text.includes('取消')) return 'cancel'
  if (text.includes('延誤') || delayMinutes.value > 0) return 'delay'
  return 'normal'
})

const formatTime = (timeStr?: string) => {
  if (!timeStr) return '--:--'
  try {
    const date = new Date(timeStr)
    return date.toTimeString().substring(0, 5)
  } catch {
    return timeStr
  }
}

const goToMap = () => {
  const callsign = `${props.flight.AirlineID}${props.flight.FlightNumber}`
  router.push({
    path: '/map',
    query: {
      callsign,
      dep: props.flight.DepartureAirportID,
      arr: props.flight.ArrivalAirportID,
    },
  })
}
</script>

<style scoped>
.flight-card {
  position: relative;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  height: 100%; /* 填滿 Grid 等高 */
}

.flight-card.is-insurance-alert {
  border: 2px solid #ef4444;
  background-color: #fff5f5;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.alert-badge {
  position: absolute;
  top: -10px;
  right: 12px;
  background: #ef4444;
  color: #ffffff;
  font-size: 0.75rem;
  font-weight: bold;
  padding: 2px 8px;
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
  margin-bottom: 8px;
}

.flight-code {
  font-weight: bold;
  font-size: 1.1rem;
  color: #2563eb;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.status-badge.normal {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.delay {
  background: #fef3c7;
  color: #b45309;
}

.status-badge.cancel {
  background: #fee2e2;
  color: #b91c1c;
}

.card-body {
  display: flex;
  flex-direction: column;
  flex: 1; /* 吃滿剩餘空間 */
}

.route {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1.1rem;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 8px;
}

.arrow {
  color: #94a3b8;
}

.time-info p {
  margin: 2px 0;
  font-size: 0.85rem;
  color: #64748b;
}

.radar-btn {
  width: 100%;
  margin-top: auto; /* 💡 關鍵：自動向最下方推擠齊平 */
  padding-top: 8px;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #2563eb;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.radar-btn:hover {
  background: #eff6ff;
  border-color: #2563eb;
}
</style>
