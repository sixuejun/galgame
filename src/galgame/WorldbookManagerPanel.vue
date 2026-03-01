<template>
  <div class="absolute inset-0 flex items-center justify-center" style="z-index:50;">
    <div class="absolute inset-0 backdrop-blur-sm" style="background:rgba(42,36,32,0.7);" @click="$emit('close')" />

    <div class="relative w-full max-w-3xl mx-4 border overflow-hidden animate-fade-in-up" :style="panelStyle">
      <div :style="decoTop" />
      <div :style="decoTopThin" />

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4" :style="headerBorder">
        <div class="flex items-center gap-3">
          <div class="stamp-effect">
            <span style="color:var(--rust); font-size:0.75rem; font-weight:bold; letter-spacing:0.15em;">WORLDBOOK</span>
          </div>
          <h2 class="text-lg font-bold tracking-widest" style="color:rgba(212,197,160,0.9);">世界书管理</h2>
        </div>
        <button class="w-8 h-8 flex items-center justify-center cursor-pointer" style="color:var(--vn-muted);" @click="$emit('close')">
          <i class="fa-solid fa-xmark" />
        </button>
      </div>

      <!-- Info Banner -->
      <div class="px-6 py-3" :style="{ borderBottom: '1px solid rgba(90,79,64,0.2)', background: 'rgba(139,69,19,0.1)' }">
        <div class="text-xs" style="color:rgba(212,197,160,0.8);">
          <i class="fa-solid fa-circle-info mr-2" style="color:var(--rust);" />
          管理世界书条目的启用状态、API 分配和自动控制。自动控制的条目会根据功能开关自动启用/禁用。
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 py-4 overflow-y-auto no-scrollbar" style="max-height:calc(85vh - 180px);">
        <div v-if="entries.length === 0" class="text-center py-8">
          <i class="fa-solid fa-book-open text-4xl mb-3" style="color:rgba(90,79,64,0.3);" />
          <p class="text-sm" style="color:var(--vn-muted);">暂无世界书条目</p>
          <p class="text-xs mt-1" style="color:rgba(139,125,107,0.5);">请在酒馆中添加世界书条目</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="entry in entries"
            :key="entry.uid"
            class="p-4 border transition-all"
            :style="{ 
              borderColor: entry.enabled ? 'rgba(139,69,19,0.4)' : 'rgba(90,79,64,0.2)',
              background: entry.enabled ? 'rgba(139,69,19,0.05)' : 'transparent',
              opacity: entry.enabled ? 1 : 0.6
            }"
          >
            <!-- Entry Header -->
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1 min-w-0 mr-3">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-sm font-bold" style="color:rgba(212,197,160,0.9);">
                    {{ entry.key || entry.comment || `条目 #${entry.uid}` }}
                  </span>
                  <span
                    v-if="entry.linkedFeature"
                    class="px-2 py-0.5 text-xs"
                    :style="{ 
                      background: getFeatureColor(entry.linkedFeature),
                      color: 'rgba(42,36,32,0.9)',
                      fontWeight: 'bold'
                    }"
                  >
                    {{ getFeatureLabel(entry.linkedFeature) }}
                  </span>
                </div>
                <p v-if="entry.comment" class="text-xs truncate" style="color:var(--vn-muted);">
                  {{ entry.comment }}
                </p>
              </div>
              <button
                class="shrink-0 px-3 py-1.5 text-xs border transition-all"
                :style="{ 
                  borderColor: entry.enabled ? 'var(--rust)' : 'rgba(90,79,64,0.4)',
                  color: entry.enabled ? 'var(--rust)' : 'var(--vn-muted)',
                  fontWeight: entry.enabled ? 'bold' : 'normal'
                }"
                @click="toggleEntry(entry.uid)"
              >
                {{ entry.enabled ? '已启用' : '已禁用' }}
              </button>
            </div>

            <!-- Entry Controls -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Target API -->
              <div>
                <label class="block text-xs mb-1.5" style="color:rgba(212,197,160,0.7);">发送给</label>
                <select
                  :value="entry.targetApi"
                  class="w-full px-2 py-1.5 text-xs border cursor-pointer"
                  :style="{ 
                    background: 'rgba(42,36,32,0.5)', 
                    borderColor: 'rgba(90,79,64,0.4)', 
                    color: 'rgba(212,197,160,0.9)' 
                  }"
                  @change="updateEntry(entry.uid, { targetApi: ($event.target as HTMLSelectElement).value as any })"
                >
                  <option value="main">主 API</option>
                  <option value="second">第二 API</option>
                  <option value="both">两者都发送</option>
                </select>
              </div>

              <!-- Linked Feature -->
              <div>
                <label class="block text-xs mb-1.5" style="color:rgba(212,197,160,0.7);">关联功能</label>
                <select
                  :value="entry.linkedFeature || ''"
                  class="w-full px-2 py-1.5 text-xs border cursor-pointer"
                  :style="{ 
                    background: 'rgba(42,36,32,0.5)', 
                    borderColor: 'rgba(90,79,64,0.4)', 
                    color: 'rgba(212,197,160,0.9)' 
                  }"
                  @change="updateEntry(entry.uid, { linkedFeature: ($event.target as HTMLSelectElement).value || undefined })"
                >
                  <option value="">无</option>
                  <option value="danmaku">弹幕</option>
                  <option value="imageGen">生图</option>
                  <option value="summary">总结</option>
                </select>
              </div>
            </div>

            <!-- Auto Control -->
            <div class="mt-3 pt-3" :style="{ borderTop: '1px solid rgba(90,79,64,0.15)' }">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  :checked="entry.autoControl"
                  class="cursor-pointer"
                  @change="updateEntry(entry.uid, { autoControl: ($event.target as HTMLInputElement).checked })"
                />
                <span class="text-xs" style="color:rgba(212,197,160,0.8);">
                  自动控制（根据关联功能的开关自动启用/禁用此条目）
                </span>
              </label>
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
import { useVNStore, type WorldbookEntryEnhanced } from './store';

defineEmits<{
  close: [];
}>();

const store = useVNStore();

const entries = ref<WorldbookEntryEnhanced[]>([]);

function loadEntries() {
  entries.value = store.getEnhancedWorldbook();
}

function toggleEntry(uid: number) {
  const entry = entries.value.find(e => e.uid === uid);
  if (entry) {
    store.updateWorldbookEntry(uid, { enabled: !entry.enabled });
    loadEntries();
  }
}

function updateEntry(uid: number, updates: Partial<WorldbookEntryEnhanced>) {
  store.updateWorldbookEntry(uid, updates);
  loadEntries();
}

function getFeatureLabel(feature: string): string {
  const labels: Record<string, string> = {
    danmaku: '弹幕',
    imageGen: '生图',
    summary: '总结',
  };
  return labels[feature] || feature;
}

function getFeatureColor(feature: string): string {
  const colors: Record<string, string> = {
    danmaku: 'rgba(139,69,19,0.6)',
    imageGen: 'rgba(212,197,160,0.6)',
    summary: 'rgba(90,79,64,0.6)',
  };
  return colors[feature] || 'rgba(90,79,64,0.6)';
}

onMounted(() => {
  loadEntries();
});

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
