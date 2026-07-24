<template>
  <div class="airline-selector" ref="containerRef">
    <label v-if="label" class="selector-label">{{ label }}</label>

    <!-- 把 relative 定位改在 input-wrapper 身上 -->
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
        <span class="preset-title">常見航空公司（點擊選擇）：</span>
        <div class="preset-tags">
          <button
            v-for="preset in PRESET_AIRLINES"
            :key="preset.AirlineID"
            type="button"
            class="preset-tag"
            @click="selectAirline(preset)"
          >
            {{ preset.AirlineName.Zh_tw }} ({{ preset.AirlineIATA || preset.AirlineID }})
          </button>
        </div>
      </div>

      <!-- 搜尋結果選單列表 -->
      <ul v-if="airlines.length > 0 && modelValue" class="airline-list">
        <li
          v-for="airline in airlines"
          :key="airline.AirlineID"
          class="airline-item"
          @click="selectAirline(airline)"
        >
          <span class="code"
            >[{{ airline.AirlineIATA || airline.AirlineICAO || airline.AirlineID }}]</span
          >
          <span class="name">{{ airline.AirlineName?.Zh_tw || airline.AirlineName?.En }}</span>
        </li>
      </ul>
    </div>

    <!-- 補齊三欄對齊的小提示字 -->
    <span class="hint-text">可依航空公司篩選，或留空搜尋全航司</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { PRESET_AIRLINES, type TdxAirline } from '@/types/tdx'

interface Props {
  modelValue: string
  airlines?: TdxAirline[]
  label?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  airlines: () => [],
  label: '搜尋航空公司',
  placeholder: '請點擊選擇或輸入航空公司 (如 華航、CI)',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', airline: TdxAirline): void
  (e: 'clear'): void
}>()

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

const selectAirline = (airline: TdxAirline) => {
  emit('select', airline)
  isFocused.value = false
}

const handleClickOutside = (event: MouseEvent) => {
  if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
    isFocused.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.airline-selector {
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
  border-color: #059669;
  box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
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
  border: 1px solid #a7f3d0;
  border-radius: 6px;
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.1),
    0 4px 6px -2px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.preset-title {
  font-size: 0.8rem;
  font-weight: bold;
  color: #047857;
  display: block;
  margin-bottom: 8px;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.preset-tag {
  background: #f0fdf4;
  border: 1px solid #059669;
  color: #065f46;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
}

.preset-tag:hover {
  background: #dcfce7;
  color: #047857;
}

.airline-list {
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

.airline-item {
  padding: 10px 12px;
  display: flex;
  gap: 8px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
}

.airline-item:hover {
  background-color: #f0fdf4;
}

.code {
  font-weight: bold;
  color: #059669;
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
