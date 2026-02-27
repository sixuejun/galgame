<template>
  <div class="px-5 py-4">
    <!-- Personality selector -->
    <div class="mb-4">
      <div class="text-xs mb-2" style="color: rgba(212,197,160,0.5); letter-spacing:0.1em; font-family:monospace;">
        --- 系统人格 ---
      </div>
      <div class="flex gap-1.5 flex-wrap">
        <button
          v-for="p in personalities"
          :key="p.id"
          class="px-2.5 py-1 border text-xs cursor-pointer transition-all"
          :style="{
            borderColor: store.settings.systemPersonality === p.id ? 'var(--rust)' : 'rgba(90,79,64,0.3)',
            background: store.settings.systemPersonality === p.id ? 'rgba(139,69,19,0.15)' : 'transparent',
            color: store.settings.systemPersonality === p.id ? 'var(--vn-fg)' : 'var(--vn-muted)',
            borderRadius: '2px',
          }"
          @click="store.updateSettings({ systemPersonality: p.id as any })"
        >
          {{ p.name }}
        </button>
      </div>
    </div>

    <!-- Chat history -->
    <div ref="chatEl" class="mb-3 overflow-y-auto no-scrollbar" style="max-height: 220px;">
      <div v-if="currentHistory.length === 0" class="text-center py-8">
        <i class="fa-solid fa-microchip" style="font-size:1.5rem; color:rgba(139,125,107,0.2); margin-bottom:8px; display:block;" />
        <p style="font-size:11px; color:var(--vn-muted);">系统已上线。有什么想说的？</p>
      </div>

      <div
        v-for="(msg, i) in currentHistory"
        :key="i"
        class="mb-2"
        :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
      >
        <div :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'">
          <div
            v-if="msg.role === 'proactive'"
            style="font-size:9px; color:var(--rust); margin-bottom:3px; font-family:monospace; letter-spacing:0.08em;"
          >
            [ SYS ]
          </div>
          <p class="text-xs" style="line-height:1.6;">{{ msg.text }}</p>
        </div>
      </div>

      <div v-if="store.systemLoading" class="flex justify-start mb-2">
        <div class="chat-bubble-ai">
          <p class="text-xs" style="color:var(--vn-muted);">
            <i class="fa-solid fa-ellipsis fa-beat-fade" /> 系统处理中…
          </p>
        </div>
      </div>
    </div>

    <!-- Input -->
    <div class="flex gap-2">
      <input
        v-model="userInput"
        class="vn-input flex-1"
        placeholder="对系统说些什么…"
        :disabled="store.systemLoading"
        @keydown.enter="handleSend"
      />
      <button
        class="px-3 border cursor-pointer transition-all"
        :style="{
          borderColor: canSend ? 'var(--rust)' : 'rgba(90,79,64,0.2)',
          color: canSend ? 'var(--rust)' : 'var(--vn-muted)',
          borderRadius: '2px',
          opacity: canSend ? 1 : 0.4,
        }"
        :disabled="!canSend"
        @click="handleSend"
      >
        <i class="fa-solid fa-paper-plane" style="font-size:0.75rem;" />
      </button>
    </div>

    <!-- Footer -->
    <div class="mt-3 flex items-center justify-between">
      <span style="font-size:9px; color:rgba(139,125,107,0.4); font-family:monospace;">
        {{ currentHistory.length }} 条记录
      </span>
      <button
        class="text-xs cursor-pointer transition-colors"
        style="color:var(--vn-muted);"
        @click="store.clearContactHistory(activePersonality)"
      >
        清空记录
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SystemPersonality } from './store';
import { useVNStore } from './store';

const store = useVNStore();
const chatEl = ref<HTMLElement | null>(null);
const userInput = ref('');

const activePersonality = computed(() => store.settings.systemPersonality as SystemPersonality);
const currentHistory = computed(() => store.systemChatHistories[activePersonality.value] ?? []);

const canSend = computed(() => userInput.value.trim().length > 0 && !store.systemLoading);

const personalities = [
  { id: 'neutral', name: '中立系统' },
  { id: 'tsundere', name: '毒舌吐槽' },
  { id: 'gentle', name: '温柔关怀' },
  { id: 'chaotic', name: '混沌疯魔' },
];

async function handleSend() {
  if (!canSend.value) return;
  const text = userInput.value.trim();
  userInput.value = '';
  await store.sendSystemUserMessage(text, activePersonality.value);
  nextTick(() => {
    if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight;
  });
}

watch(
  () => currentHistory.value.length,
  () => {
    nextTick(() => {
      if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight;
    });
  },
);
</script>
