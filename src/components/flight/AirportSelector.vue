<template>
  <div class="airport-selector" ref="containerRef">
    <label v-if="label" class="selector-label">{{ label }}</label>

    <div class="input-wrapper">
      <input
        type="text"
        :value="modelValue"
        :placeholder="placeholder"
        class="selector-input"
        @input="onInput"
        @focus="onFocus"
        @click="onFocus"
      />
      <button
        v-if="modelValue"
        type="button"
        class="clear-btn"
        title="清空關鍵字"
        @click="clearInput"
      >
        ✕
      </button>

      <!-- 懸浮彈窗：貼緊 input-wrapper -->
      <div v-if="showPresets" class="preset-section">
        <span class="preset-title">熱門推薦機場（點擊選擇）：</span>
        <div class="preset-tags">
          <button
            v-for="preset in PRESET_AIRPORTS"
            :key="preset.AirportID"
            type="button"
            class="preset-tag"
            @click="selectAirport(preset)"
          >
            {{ preset.AirportName.Zh_tw }} ({{ preset.AirportCode || preset.AirportID }})
          </button>
        </div>
      </div>

      <!-- 搜尋結果選單列表 -->
      <ul v-if="airports.length > 0 && modelValue" class="airport-list">
        <li
          v-for="airport in airports"
          :key="airport.AirportID"
          class="airport-item"
          @click="selectAirport(airport)"
        >
          <span class="code"
            >[{{ airport.AirportCode || airport.AirportIATA || airport.AirportID }}]</span
          >
          <span class="name">{{ airport.AirportName?.Zh_tw || airport.AirportName?.En }}</span>
        </li>
      </ul>
    </div>

    <span class="hint-text">選擇國外機場將自動篩選與臺灣往返之航班</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { PRESET_AIRPORTS, type TdxAirport } from '@/types/tdx'

interface Props {
  modelValue: string //目前輸入框的文字
  airports?: TdxAirport[] //搜尋到的機場陣列
  label?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  airports: () => [],
  label: '搜尋機場',
  placeholder: '請點擊選擇或輸入機場 (如 桃園、TPE)',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', airport: TdxAirport): void
  (e: 'clear'): void
}>()

/*
 ** 熱門機場彈窗條件判斷
 */
const isFocused = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)

const showPresets = computed(() => isFocused.value && !props.modelValue.trim())

const onFocus = () => {
  isFocused.value = true
}

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const clearInput = () => {
  emit('update:modelValue', '')
  emit('clear')
  isFocused.value = false
}

const selectAirport = (airport: TdxAirport) => {
  emit('select', airport)
  isFocused.value = false
}

//點擊空白處自動關閉選單
const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isFocused.value = false
  }
}

//生命週期管理（防止記憶體洩漏）
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.airport-selector {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.selector-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.selector-input {
  width: 100%;
  padding: 10px 36px 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  background-color: #ffffff;
}

.selector-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 50%;
}

.clear-btn:hover {
  color: #4b5563;
  background-color: #f3f4f6;
}

.preset-section {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  padding: 10px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.preset-title {
  font-size: 0.8rem;
  font-weight: bold;
  color: #475569;
  display: block;
  margin-bottom: 8px;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-tag {
  background: #f8fafc;
  border: 1px solid #94a3b8;
  color: #1e293b;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.preset-tag:hover {
  background: #eff6ff;
  border-color: #2563eb;
  color: #1d4ed8;
}

.airport-list {
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  list-style: none;
  padding: 0;
  background-color: #ffffff;
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

.airport-item {
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
}

.airport-item:hover {
  background-color: #eff6ff;
}

.code {
  font-weight: bold;
  color: #2563eb;
}

.name {
  color: #1f2937;
}

.hint-text {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 2px;
}
</style>
