<template>
  <div id="app">
    <!-- 使用 Component + KeepAlive 讓 FlightView 在路由切換時凍結狀態 -->
    <router-view v-slot="{ Component }">
      <keep-alive include="FlightView">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup lang="ts">
// 無須特別宣告，keep-alive 自動依據組件 name 暫存
</script>

<style>
/* 全域基本樣式重置 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background-color: #f8fafc;
  color: #0f172a;
}
</style>
