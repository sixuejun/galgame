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

      <!-- Info bar -->
      <div class="flex items-center px-6 py-2" :style="{ borderBottom:'1px solid rgba(90,79,64,0.2)' }">
        <div style="font-size:9px; color:var(--vn-muted); font-family:monospace;">
          共 {{ historyLines.length }} 条
        </div>
      </div>

      <!-- Dialogue list -->
      <div ref="scrollRef" class="px-6 py-4 overflow-y-auto no-scrollbar" style="max-height:calc(85vh - 180px);">
        <div
          v-for="(line, index) in historyLines"
          :key="index"
          :data-line="index"
          class="py-2.5 cursor-pointer transition-colors duration-150"
          :style="{
            borderBottom: '1px solid rgba(90,79,64,0.1)',
            background: index === store.currentDialogueIndex ? 'rgba(139,69,19,0.1)' : 'transparent',
          }"
          @click="goToLine(index)"
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
              v-if="index === store.currentDialogueIndex"
              class="shrink-0 mt-1.5"
              style="width:6px; height:6px; background:var(--rust); transform:rotate(45deg);"
            />
          </div>
        </div>
        <div v-if="historyLines.length === 0" class="text-center py-8" style="color:var(--vn-muted); font-size:0.75rem;">
          暂无对话记录
        </div>
      </div>

      <div :style="decoBottomThin" />
      <div :style="decoBottom" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageBlock } from './types/message';
import { useVNStore } from './store';

const emit = defineEmits<{
  goToLine: [index: number];
}>();

const store = useVNStore();
const scrollRef = ref<HTMLDivElement | null>(null);

interface HistoryLine {
  speaker?: string;
  text: string;
}

const historyLines = computed<HistoryLine[]>(() => {
  return store.currentMessageBlocks.map((block: MessageBlock) => {
    if (block.type === 'character') {
      return { speaker: block.character, text: block.text ?? '' };
    }
    return { text: block.message ?? '' };
  });
});

function goToLine(index: number) {
  emit('goToLine', index);
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
