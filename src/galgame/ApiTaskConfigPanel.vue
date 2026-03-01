<template>
  <div class="absolute inset-0 flex items-center justify-center" style="z-index:50;">
    <div class="absolute inset-0 backdrop-blur-sm" style="background:rgba(42,36,32,0.7);" @click="$emit('close')" />

    <div class="relative w-full max-w-2xl mx-4 border overflow-hidden animate-fade-in-up" :style="panelStyle">
      <div :style="decoTop" />
      <div :style="decoTopThin" />

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4" :style="headerBorder">
        <div class="flex items-center gap-3">
          <div class="stamp-effect">
            <span style="color:var(--rust); font-size:0.75rem; font-weight:bold; letter-spacing:0.15em;">API</span>
          </div>
          <h2 class="text-lg font-bold tracking-widest" style="color:rgba(212,197,160,0.9);">API 任务配置</h2>
        </div>
        <button class="w-8 h-8 flex items-center justify-center cursor-pointer" style="color:var(--vn-muted);" @click="$emit('close')">
          <i class="fa-solid fa-xmark" />
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 overflow-y-auto no-scrollbar" style="max-height:calc(85vh - 130px);">
        <!-- Task Assignment -->
        <div class="mb-6">
          <div class="text-sm mb-3" style="color:var(--rust); font-weight:bold;">功能 API 分配</div>
          <div class="space-y-3">
            <div v-for="task in tasks" :key="task.key" class="flex items-center justify-between p-3 border" :style="{ borderColor: 'rgba(90,79,64,0.3)' }">
              <div>
                <div class="text-sm" style="color:rgba(212,197,160,0.9);">{{ task.label }}</div>
                <div class="text-xs mt-0.5" style="color:var(--vn-muted);">{{ task.description }}</div>
              </div>
              <select
                :value="store.settings[task.key]"
                class="px-3 py-1.5 text-xs border cursor-pointer"
                :style="{ 
                  background: 'rgba(42,36,32,0.5)', 
                  borderColor: 'rgba(90,79,64,0.4)', 
                  color: 'rgba(212,197,160,0.9)' 
                }"
                @change="updateTaskApi(task.key, ($event.target as HTMLSelectElement).value as 'main' | 'second' | 'disabled')"
              >
                <option value="main">主 API</option>
                <option value="second">第二 API</option>
                <option value="disabled">禁用</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Summary Config -->
        <div class="mb-6">
          <div class="text-sm mb-3" style="color:var(--rust); font-weight:bold;">总结配置</div>
          <div class="p-3 border space-y-3" :style="{ borderColor: 'rgba(90,79,64,0.3)' }">
            <div class="flex items-center justify-between">
              <span class="text-xs" style="color:rgba(212,197,160,0.9);">小总结间隔（轮数）</span>
              <input
                type="number"
                :value="store.settings.summarySmallInterval"
                min="1"
                max="50"
                class="w-20 px-2 py-1 text-xs border text-center"
                :style="{ 
                  background: 'rgba(42,36,32,0.5)', 
                  borderColor: 'rgba(90,79,64,0.4)', 
                  color: 'rgba(212,197,160,0.9)' 
                }"
                @input="store.updateSettings({ summarySmallInterval: Number(($event.target as HTMLInputElement).value) })"
              />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs" style="color:rgba(212,197,160,0.9);">大总结阈值（小总结数）</span>
              <input
                type="number"
                :value="store.settings.summaryBigThreshold"
                min="2"
                max="20"
                class="w-20 px-2 py-1 text-xs border text-center"
                :style="{ 
                  background: 'rgba(42,36,32,0.5)', 
                  borderColor: 'rgba(90,79,64,0.4)', 
                  color: 'rgba(212,197,160,0.9)' 
                }"
                @input="store.updateSettings({ summaryBigThreshold: Number(($event.target as HTMLInputElement).value) })"
              />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-xs" style="color:rgba(212,197,160,0.9);">自动生成总结</span>
              <button
                class="px-3 py-1 text-xs border transition-all"
                :style="{ 
                  borderColor: store.settings.summaryAutoEnabled ? 'var(--rust)' : 'rgba(90,79,64,0.4)',
                  color: store.settings.summaryAutoEnabled ? 'var(--rust)' : 'var(--vn-muted)'
                }"
                @click="store.updateSettings({ summaryAutoEnabled: !store.settings.summaryAutoEnabled })"
              >
                {{ store.settings.summaryAutoEnabled ? '开启' : '关闭' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div :style="decoBottomThin" />
      <div :style="decoBottom" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVNStore } from './store';

defineEmits<{
  close: [];
}>();

const store = useVNStore();

const tasks = [
  { key: 'apiTaskDanmaku' as const, label: '弹幕生成', description: '生成弹幕文案' },
  { key: 'apiTaskSummary' as const, label: '总结生成', description: '生成小总结和大总结' },
  { key: 'apiTaskImageTag' as const, label: '生图 Tag', description: '根据场景生成图片标签' },
  { key: 'apiTaskVariable' as const, label: '变量更新', description: '更新游戏变量（预留）' },
];

function updateTaskApi(key: typeof tasks[number]['key'], value: 'main' | 'second' | 'disabled') {
  store.updateSettings({ [key]: value });
}

const panelStyle = {
  maxHeight: '85vh',
  borderColor: 'rgba(90,79,64,0.6)',
  background: 'var(--vn-panel-bg)',
  backdropFilter: 'blur(12px)',
};
const headerBorder = { borderBottom: '1px solid rgba(90,79,64,0.3)' };
const decoTop = { height: '3px', background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.6), transparent)' };
const decoTopThin = { height: '1px', marginTop: '1px', background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.3), transparent)' };
const decoBottomThin = { height: '1px', background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.3), transparent)' };
const decoBottom = { height: '2px', marginTop: '1px', background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.5), transparent)' };
</script>

<style scoped>
.flash-highlight {
  animation: flash 0.5s ease-in-out 3;
}

@keyframes flash {
  0%, 100% { background: transparent; }
  50% { background: rgba(139,69,19,0.3); }
}
</style>
