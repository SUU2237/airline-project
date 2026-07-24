<template>
  <div class="insurance-dashboard" :class="{ 'has-alerts': alertStats.totalAlerts > 0 }">
    <div class="dashboard-header">
      <div class="title-group">
        <h3>不便險即時監控看板 (Insurance Alert Dashboard)</h3>
      </div>
      <div class="badge-count" :class="{ alert: alertStats.totalAlerts > 0 }">
        符合理賠標的：<strong>{{ alertStats.totalAlerts }}</strong> 班
      </div>
    </div>

    <div v-if="alertStats.totalAlerts === 0" class="empty-state">
      <p>目前無班機達不便險標準（無延誤滿 4 小時或取消之航班）</p>
    </div>

    <div v-else class="alert-content">
      <div class="stats-summary">
        <span class="stat-item cancel">班機取消：{{ alertStats.cancelledCount }} 班</span>
        <span class="stat-item delay">嚴重延誤 (滿 4 小時)：{{ alertStats.delayedCount }} 班</span>
      </div>

      <div class="claim-list">
        <div
          v-for="item in alertClaimItems"
          :key="item.flight.FlightNumber + item.flight.AirlineID"
          class="claim-card"
          :class="item.reason.toLowerCase()"
        >
          <div class="claim-header">
            <span class="flight-code"
              >{{ item.flight.AirlineID }}{{ item.flight.FlightNumber }}</span
            >
            <span class="reason-tag">
              {{ item.reason === 'FLIGHT_CANCELLED' ? '班機取消' : '嚴重延誤' }}
            </span>
          </div>
          <div class="claim-body">
            <p>
              <strong>航線：</strong>{{ item.flight.DepartureAirportID }} →
              {{ item.flight.ArrivalAirportID }}
            </p>
            <p><strong>原因說明：</strong>{{ item.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { InsuranceClaimItem } from '@/types/flight'

interface Props {
  alertClaimItems: InsuranceClaimItem[]
  alertStats: {
    totalAlerts: number
    cancelledCount: number
    delayedCount: number
  }
}

defineProps<Props>()
</script>

<style scoped>
.insurance-dashboard {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s ease;
}

.insurance-dashboard.has-alerts {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
}

.title-group h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1e293b;
}

.badge-count {
  background: #f1f5f9;
  color: #475569;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
}

.badge-count.alert {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.empty-state {
  text-align: center;
  padding: 1rem 0;
  color: #059669;
  font-weight: 500;
}

.stats-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 1rem;
}

.stat-item {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
}

.stat-item.cancel {
  background: #fee2e2;
  color: #991b1b;
}

.stat-item.delay {
  background: #fef3c7;
  color: #92400e;
}

.claim-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.claim-card {
  background: #ffffff;
  border-left: 4px solid #ef4444;
  border-radius: 6px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.claim-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.flight-code {
  font-weight: bold;
  font-size: 1.1rem;
  color: #1e293b;
}

.reason-tag {
  background: #ef4444;
  color: white;
  font-size: 0.75rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.claim-body p {
  margin: 2px 0;
  font-size: 0.825rem;
  color: #475569;
}
</style>
