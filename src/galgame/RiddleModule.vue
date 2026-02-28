<template>
  <div class="px-5 py-4">
    <!-- Setup -->
    <div v-if="!store.riddleActive && phase === 'setup'" class="py-4">
      <div class="mb-4">
        <label class="block text-xs mb-1.5" style="color:rgba(212,197,160,0.7);">输入谜底（本地校验，不进入 prompt）</label>
        <input v-model="answerInput" class="vn-input" placeholder="输入谜底…" />
      </div>
      <div class="mb-4">
        <label class="block text-xs mb-1.5" style="color:rgba(212,197,160,0.7);">第一条提示</label>
        <input v-model="firstHint" class="vn-input" placeholder="给 AI 的第一条提示…" />
      </div>
      <button
        class="w-full py-1.5 border text-xs cursor-pointer text-center"
        :style="{
          borderColor: canStart ? 'var(--rust)' : 'rgba(90,79,64,0.2)',
          color: canStart ? 'var(--vn-fg)' : 'var(--vn-muted)',
          background: canStart ? 'rgba(139,69,19,0.15)' : 'transparent',
          borderRadius: '2px', opacity: canStart ? 1 : 0.5,
        }"
        @click="handleStart"
      >
        开始猜谜
      </button>

      <!-- Last record -->
      <div v-if="store.gameData.riddleLastRecord" class="mt-4 p-3 border" style="border-color:rgba(90,79,64,0.2); border-radius:2px;">
        <div style="font-size:9px; color:var(--vn-muted); margin-bottom:4px;">上次战绩</div>
        <div class="flex items-center gap-3 text-xs">
          <span style="color:var(--vn-fg);">谜底: {{ store.gameData.riddleLastRecord.answer }}</span>
          <span style="color:var(--vn-muted);">{{ store.gameData.riddleLastRecord.rounds }} 轮</span>
          <span style="color:var(--vn-success);">+{{ store.gameData.riddleLastRecord.reward }}G</span>
        </div>
      </div>
    </div>

    <!-- Chat -->
    <template v-if="store.riddleActive">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs" style="color:var(--vn-muted);">第 {{ store.riddleRounds }} 轮</span>
        <span class="text-xs" style="color:var(--stain);">预估奖励: {{ 50 + store.riddleRounds * 20 }}G</span>
      </div>

      <!-- Messages -->
      <div class="mb-3 overflow-y-auto no-scrollbar" style="max-height:200px;">
        <div v-for="(msg, i) in store.riddleChatHistory" :key="i" class="mb-2" :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
          <div :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'">
            <p class="text-xs" style="line-height:1.6;">{{ msg.text }}</p>
          </div>
        </div>
        <div v-if="aiThinking" class="flex justify-start mb-2">
          <div class="chat-bubble-ai">
            <p class="text-xs" style="color:var(--vn-muted);">
              <i class="fa-solid fa-ellipsis fa-beat-fade" /> 思考中…
            </p>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="flex gap-2">
        <input
          v-model="userInput"
          class="vn-input flex-1"
          placeholder="输入消息…"
          :disabled="aiThinking"
          @keydown.enter="handleSendMessage"
        />
        <button
          class="px-3 border cursor-pointer"
          :style="{
            borderColor: userInput.trim() && !aiThinking ? 'var(--rust)' : 'rgba(90,79,64,0.2)',
            color: userInput.trim() && !aiThinking ? 'var(--rust)' : 'var(--vn-muted)',
            borderRadius: '2px',
          }"
          :disabled="!userInput.trim() || aiThinking"
          @click="handleSendMessage"
        >
          <i class="fa-solid fa-paper-plane" style="font-size:0.75rem;" />
        </button>
      </div>
      <p v-if="blocked" style="font-size:9px; color:var(--vn-danger); margin-top:4px;">输入中包含谜底，无法发送</p>

      <button
        class="w-full mt-3 py-1.5 border text-xs cursor-pointer text-center"
        style="border-color:rgba(90,79,64,0.4); color:var(--vn-muted); border-radius:2px;"
        @click="store.endRiddle()"
      >
        放弃猜谜
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useVNStore } from './store';

const store = useVNStore();

const phase = ref<'setup' | 'playing'>('setup');
const answerInput = ref('');
const firstHint = ref('');
const userInput = ref('');
const aiThinking = ref(false);
const blocked = ref(false);

const canStart = computed(() => answerInput.value.trim().length > 0 && firstHint.value.trim().length > 0);

function handleStart() {
  if (!canStart.value) return;
  store.startRiddle(answerInput.value.trim(), firstHint.value.trim());
  phase.value = 'playing';
  requestAiReply();
}

function handleSendMessage() {
  if (!userInput.value.trim() || aiThinking.value) return;
  if (store.riddleAnswerContains(userInput.value.trim())) {
    blocked.value = true;
    setTimeout(() => { blocked.value = false; }, 2000);
    return;
  }
  const ok = store.addRiddleUserMessage(userInput.value.trim());
  if (!ok) { blocked.value = true; setTimeout(() => { blocked.value = false; }, 2000); return; }
  userInput.value = '';
  requestAiReply();
}

async function requestAiReply() {
  aiThinking.value = true;
  try {
    const result = await store.requestRiddleAiReply();
    if (result.won) {
      store.showToast(`猜谜成功！获得 ${result.reward}G`);
      phase.value = 'setup';
    }
  } catch {
    store.showToast('请求失败');
  } finally {
    aiThinking.value = false;
  }
}
</script>
