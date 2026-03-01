<template>
  <div class="absolute inset-0 flex items-center justify-center" style="z-index:50;">
    <div class="absolute inset-0 backdrop-blur-sm" style="background:rgba(42,36,32,0.7);" @click="store.setOverlay('none')" />

    <div class="relative w-full max-w-2xl mx-4 border overflow-hidden animate-fade-in-up" :style="panelStyle">
      <div :style="decoTop" />
      <div :style="decoTopThin" />

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4" :style="headerBorder">
        <div class="flex items-center gap-3">
          <div class="stamp-effect">
            <span style="color:var(--rust); font-size:0.75rem; font-weight:bold; letter-spacing:0.15em;">LOG</span>
          </div>
          <h2 class="text-lg font-bold tracking-widest" style="color:rgba(212,197,160,0.9);">历史记录</h2>
        </div>
        <button class="w-8 h-8 flex items-center justify-center cursor-pointer" style="color:var(--vn-muted);" @click="store.setOverlay('none')">
          <i class="fa-solid fa-xmark" />
        </button>
      </div>

      <!-- Tab Navigation -->
      <div class="flex items-center px-6 py-2" :style="{ borderBottom:'1px solid rgba(90,79,64,0.2)' }">
        <button
          class="px-3 py-1 text-xs transition-all"
          :style="{
            color: activeTab === 'dialogue' ? 'var(--rust)' : 'var(--vn-muted)',
            borderBottom: activeTab === 'dialogue' ? '2px solid var(--rust)' : '2px solid transparent',
            fontWeight: activeTab === 'dialogue' ? 'bold' : 'normal',
          }"
          @click="activeTab = 'dialogue'"
        >
          对话记录
        </button>
        <button
          class="px-3 py-1 text-xs transition-all"
          :style="{
            color: activeTab === 'summary' ? 'var(--rust)' : 'var(--vn-muted)',
            borderBottom: activeTab === 'summary' ? '2px solid var(--rust)' : '2px solid transparent',
            fontWeight: activeTab === 'summary' ? 'bold' : 'normal',
          }"
          @click="activeTab = 'summary'"
        >
          总结
        </button>
        <div class="flex-1" />
        <div v-if="activeTab === 'dialogue'" style="font-size:9px; color:var(--vn-muted); font-family:monospace;">
          共 {{ dialogueLines.length }} 条
        </div>
        <div v-else style="font-size:9px; color:var(--vn-muted); font-family:monospace;">
          大总结 {{ store.summaryData.big.length }} / 小总结 {{ store.summaryData.small.length }}
        </div>
      </div>

      <!-- Dialogue Tab -->
      <div v-if="activeTab === 'dialogue'" ref="scrollRef" class="px-6 py-4 overflow-y-auto no-scrollbar" style="max-height:calc(85vh - 180px);">
        <div
          v-for="(line, index) in dialogueLines"
          :key="line.id"
          :data-line="index"
          class="py-2.5 cursor-pointer transition-colors duration-150"
          :style="{
            borderBottom: '1px solid rgba(90,79,64,0.1)',
            background: index === currentLineIndex ? 'rgba(139,69,19,0.1)' : 'transparent',
          }"
          @click="$emit('goToLine', index)"
        >
          <div class="flex items-start gap-3">
            <span class="text-right shrink-0 pt-0.5" style="font-size:9px; color:rgba(139,125,107,0.5); font-family:monospace; width:1.5rem;">
              {{ String(index + 1).padStart(3, '0') }}
            </span>
            <div class="flex-1 min-w-0">
              <template v-if="line.speaker">
                <span style="color:var(--rust); font-size:0.75rem; font-weight:bold; letter-spacing:0.1em;">{{ line.speaker }}</span>
                <p class="text-sm mt-0.5 leading-relaxed" style="color:rgba(212,197,160,0.8);">{{ line.text }}</p>
              </template>
              <p v-else class="text-sm italic leading-relaxed" style="color:rgba(212,197,160,0.6); padding-left:2em;">{{ line.text }}</p>
            </div>
            <div
              v-if="index === currentLineIndex"
              class="shrink-0 mt-1.5"
              style="width:6px; height:6px; background:var(--rust); transform:rotate(45deg);"
            />
          </div>
        </div>
      </div>

      <!-- Summary Tab -->
      <div v-else class="px-6 py-4 overflow-y-auto no-scrollbar" style="max-height:calc(85vh - 180px);">
        <!-- Summary Config -->
        <div class="mb-4 p-3 border" :style="{ borderColor: 'rgba(90,79,64,0.3)', background: 'rgba(42,36,32,0.3)' }">
          <div class="text-xs mb-2" style="color:var(--rust); font-weight:bold;">总结配置</div>
          <div class="grid grid-cols-2 gap-2 text-xs" style="color:rgba(212,197,160,0.8);">
            <div>小总结间隔: {{ store.settings.summarySmallInterval }} 轮</div>
            <div>大总结阈值: {{ store.settings.summaryBigThreshold }} 个</div>
            <div>当前轮数: {{ store.summaryData.currentRound }}</div>
            <div>自动总结: {{ store.settings.summaryAutoEnabled ? '开启' : '关闭' }}</div>
          </div>
        </div>

        <!-- Big Summaries -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs" style="color:var(--rust); font-weight:bold;">大总结 ({{ store.summaryData.big.length }})</div>
            <button
              v-if="store.summaryData.small.length > 0"
              class="px-2 py-1 text-xs border transition-all"
              :style="{ borderColor: 'rgba(90,79,64,0.4)', color: 'var(--vn-muted)' }"
              @click="store.manualTriggerBigSummary()"
            >
              手动触发大总结
            </button>
          </div>
          <div v-if="store.summaryData.big.length === 0" class="text-xs italic" style="color:var(--vn-muted);">
            暂无大总结
          </div>
          <div v-for="(summary, index) in store.summaryData.big" :key="summary.id" class="mb-3 p-3 border" :style="{ borderColor: 'rgba(90,79,64,0.3)' }">
            <div class="flex items-start justify-between mb-2">
              <div class="text-xs" style="color:rgba(139,125,107,0.7); font-family:monospace;">
                #{{ store.summaryData.big.length - index }} [{{ summary.rounds }}轮] {{ new Date(summary.timestamp).toLocaleString() }}
              </div>
              <div class="flex gap-1">
                <button
                  class="px-1.5 py-0.5 text-xs"
                  :style="{ color: 'var(--vn-muted)' }"
                  @click="editingSummary = { type: 'big', id: summary.id, content: summary.content }"
                >
                  <i class="fa-solid fa-pen" />
                </button>
                <button
                  class="px-1.5 py-0.5 text-xs"
                  :style="{ color: 'var(--rust)' }"
                  @click="store.deleteSummary('big', summary.id)"
                >
                  <i class="fa-solid fa-trash" />
                </button>
              </div>
            </div>
            <p class="text-sm leading-relaxed" style="color:rgba(212,197,160,0.8);">{{ summary.content }}</p>
          </div>
        </div>

        <!-- Small Summaries -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs" style="color:var(--rust); font-weight:bold;">小总结 ({{ store.summaryData.small.length }})</div>
            <button
              class="px-2 py-1 text-xs"
              :style="{ color: 'var(--vn-muted)' }"
              @click="smallSummariesExpanded = !smallSummariesExpanded"
            >
              {{ smallSummariesExpanded ? '收起' : '展开' }}
              <i :class="smallSummariesExpanded ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" class="ml-1" />
            </button>
          </div>
          <div v-if="store.summaryData.small.length === 0" class="text-xs italic" style="color:var(--vn-muted);">
            暂无小总结
          </div>
          <div v-if="smallSummariesExpanded">
            <div v-for="(summary, index) in store.summaryData.small" :key="summary.id" class="mb-2 p-2 border" :style="{ borderColor: 'rgba(90,79,64,0.2)' }">
              <div class="flex items-start justify-between mb-1">
                <div class="text-xs" style="color:rgba(139,125,107,0.6); font-family:monospace;">
                  #{{ store.summaryData.small.length - index }} [{{ summary.rounds }}轮]
                </div>
                <div class="flex gap-1">
                  <button
                    class="px-1 py-0.5 text-xs"
                    :style="{ color: 'var(--vn-muted)' }"
                    @click="editingSummary = { type: 'small', id: summary.id, content: summary.content }"
                  >
                    <i class="fa-solid fa-pen" />
                  </button>
                  <button
                    class="px-1 py-0.5 text-xs"
                    :style="{ color: 'var(--rust)' }"
                    @click="store.deleteSummary('small', summary.id)"
                  >
                    <i class="fa-solid fa-trash" />
                  </button>
                </div>
              </div>
              <p class="text-xs leading-relaxed" style="color:rgba(212,197,160,0.7);">{{ summary.content }}</p>
            </div>
          </div>
        </div>
      </div>

      <div :style="decoBottomThin" />
      <div :style="decoBottom" />
    </div>

    <!-- Edit Summary Modal -->
    <div
      v-if="editingSummary"
      class="absolute inset-0 flex items-center justify-center"
      style="z-index:60; background:rgba(0,0,0,0.5);"
      @click.self="editingSummary = null"
    >
      <div class="w-full max-w-lg mx-4 p-4 border" :style="{ background: 'var(--vn-panel-bg)', borderColor: 'rgba(90,79,64,0.6)' }">
        <div class="text-sm mb-3" style="color:var(--rust); font-weight:bold;">编辑总结</div>
        <textarea
          v-model="editingSummary.content"
          class="w-full p-2 text-sm border resize-none"
          :style="{ background: 'rgba(42,36,32,0.5)', borderColor: 'rgba(90,79,64,0.4)', color: 'rgba(212,197,160,0.9)', minHeight: '150px' }"
          rows="6"
        />
        <div class="flex gap-2 mt-3">
          <button
            class="flex-1 px-3 py-2 text-xs border transition-all"
            :style="{ borderColor: 'rgba(90,79,64,0.4)', color: 'var(--vn-muted)' }"
            @click="editingSummary = null"
          >
            取消
          </button>
          <button
            class="flex-1 px-3 py-2 text-xs border transition-all"
            :style="{ borderColor: 'var(--rust)', color: 'var(--rust)' }"
            @click="saveEditingSummary"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVNStore, type DialogueLine } from './store';

defineProps<{
  dialogueLines: DialogueLine[];
  currentLineIndex: number;
}>();

defineEmits<{
  goToLine: [index: number];
}>();

const store = useVNStore();
const scrollRef = ref<HTMLDivElement | null>(null);
const activeTab = ref<'dialogue' | 'summary'>('dialogue');
const smallSummariesExpanded = ref(false);
const editingSummary = ref<{ type: 'small' | 'big'; id: string; content: string } | null>(null);

function saveEditingSummary() {
  if (!editingSummary.value) return;
  store.editSummary(editingSummary.value.type, editingSummary.value.id, editingSummary.value.content);
  editingSummary.value = null;
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
