<template>
  <div class="absolute inset-0 flex flex-col" style="min-height: 0;">
    <!-- Toolbar -->
    <div
      class="shrink-0 flex items-center gap-3 px-4 py-2"
      style="border-bottom: 1px solid rgba(90,79,64,0.25);"
    >
      <button
        class="flex items-center gap-1 text-xs cursor-pointer transition-colors"
        style="color: var(--vn-muted)"
        @click="$emit('back')"
      >
        <i class="fa-solid fa-arrow-left" style="font-size: 0.65rem" />
        <span>返回</span>
      </button>
      <div class="flex-1 text-center">
        <span v-if="mode === 'system'" class="text-xs font-bold" style="color: rgba(212,197,160,0.9); letter-spacing:0.08em;">
          <span :style="{ color: activeContact.color }">{{ activeContact.avatar }}</span>
          &nbsp;{{ activeContact.name }}
          <span style="font-size:9px; color:var(--vn-muted); margin-left:4px; font-family:monospace;">{{ activeContact.codename }}</span>
        </span>
        <span v-else class="text-xs font-bold" style="color: rgba(212,197,160,0.9);">
          <span :style="{ color: activeContact.color }">{{ activeContact.avatar }}</span>
          &nbsp;情报交换 ·
          <span style="color:var(--stain);">第 {{ store.riddleRounds }} 轮</span>
          <span style="color:var(--vn-success); margin-left:4px;">+{{ 50 + store.riddleRounds * 20 }}G</span>
        </span>
      </div>
      <button
        v-if="mode === 'system'"
        class="text-xs cursor-pointer px-2 py-1 border transition-all"
        :style="{
          borderColor: confirmingClear ? 'var(--vn-danger)' : 'rgba(90,79,64,0.3)',
          color: confirmingClear ? 'var(--vn-danger)' : 'var(--vn-muted)',
          borderRadius: '2px',
        }"
        @click="handleClearClick"
      >
        <span v-if="confirmingClear" style="font-size:8px; letter-spacing:0.05em; white-space:nowrap;">确认?</span>
        <i v-else class="fa-solid fa-trash-can" style="font-size:0.65rem;" />
      </button>
      <button
        v-if="mode === 'riddle'"
        class="text-xs cursor-pointer px-2 py-1 border"
        style="border-color:rgba(90,79,64,0.3); color:var(--vn-muted); border-radius:2px;"
        @click="store.endRiddle(); $emit('back')"
      >
        放弃
      </button>
    </div>

    <!-- Body: contacts + chat -->
    <div class="flex flex-1 overflow-hidden" style="min-height: 0;">
      <!-- Contacts sidebar -->
      <Transition name="contacts-slide">
        <div
          v-if="mode === 'system' && showContacts"
          class="shrink-0 overflow-y-auto no-scrollbar"
          style="width: 80px; border-right: 1px solid rgba(90,79,64,0.2);"
        >
          <div
            v-for="[pid, c] in contactEntries"
            :key="pid"
            class="flex flex-col items-center py-3 px-1 cursor-pointer transition-all"
            :style="{
              background: activePersonality === pid ? 'rgba(139,69,19,0.1)' : 'transparent',
              borderLeft: activePersonality === pid ? '2px solid var(--rust)' : '2px solid transparent',
            }"
            @click="selectContact(pid as SystemPersonality)"
          >
            <div
              class="w-8 h-8 flex items-center justify-center text-base mb-1"
              style="border: 1px solid rgba(90,79,64,0.3); border-radius:2px; background:rgba(74,64,53,0.2);"
              :style="{ color: c.color }"
            >
              {{ c.avatar }}
            </div>
            <div style="font-size:9px; color:var(--vn-muted); text-align:center; line-height:1.2;">{{ c.name }}</div>
            <div
              v-if="unreadContacts.has(pid as SystemPersonality)"
              class="w-1.5 h-1.5 rounded-full mt-1"
              style="background: var(--rust);"
            />
          </div>
        </div>
      </Transition>

      <!-- Chat area -->
      <div ref="chatEl" class="flex-1 overflow-y-auto no-scrollbar px-4 py-3" style="min-width: 0;">
        <!-- Empty state -->
        <div v-if="currentHistory.length === 0" class="flex flex-col items-center justify-center h-full">
          <span :style="{ fontSize: '2rem', color: activeContact.color, opacity: 0.3 }">{{ activeContact.avatar }}</span>
          <p style="font-size:10px; color:var(--vn-muted); margin-top:8px;">
            {{ mode === 'riddle' ? '开始描述线索，让对方猜猜看' : '频道已接通，开始对话' }}
          </p>
        </div>

        <!-- Messages -->
        <div v-for="(msg, i) in currentHistory" :key="i" class="mb-2.5" :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
          <div :class="msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'" style="max-width: 80%;">
            <div
              v-if="msg.role === 'proactive'"
              style="font-size:8px; color:var(--rust); margin-bottom:2px; font-family:monospace; letter-spacing:0.1em;"
            >
              [ {{ activeContact.codename }} ]
            </div>
            <p class="text-xs" style="line-height:1.6; word-break:break-word;">{{ msg.text }}</p>
          </div>
        </div>

        <!-- Loading / thinking -->
        <div v-if="store.systemLoading && mode === 'system'" class="flex justify-start mb-2">
          <div class="chat-bubble-ai">
            <p class="text-xs" style="color:var(--vn-muted);">
              <i class="fa-solid fa-ellipsis fa-beat-fade" />
            </p>
          </div>
        </div>
        <div v-if="riddleAiThinking && mode === 'riddle'" class="flex justify-start mb-2">
          <div class="chat-bubble-ai">
            <p class="text-xs" style="color:var(--vn-muted);">
              <i class="fa-solid fa-ellipsis fa-beat-fade" />
            </p>
          </div>
        </div>

        <!-- Riddle won banner -->
        <div v-if="riddleWon" class="text-center py-3">
          <span style="font-size:11px; color:var(--vn-success); font-family:monospace; letter-spacing:0.1em;">
            [ 情报获取成功 +{{ riddleWonReward }}G ]
          </span>
        </div>
      </div>
    </div>

    <!-- Input bar -->
    <div
      class="shrink-0 flex gap-2 px-4 py-3"
      style="border-top: 1px solid rgba(90,79,64,0.2);"
    >
      <!-- Riddle blocked hint -->
      <div v-if="riddleBlocked" class="flex-1 text-xs" style="color:var(--vn-danger); display:flex; align-items:center;">
        输入中含谜底，无法发送
      </div>
      <template v-else>
        <input
          v-model="inputText"
          class="vn-input flex-1"
          :placeholder="inputPlaceholder"
          :disabled="isInputDisabled"
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
          <i class="fa-solid fa-paper-plane" style="font-size:0.7rem;" />
        </button>
      </template>
    </div>

    <!-- System footer -->
    <div v-if="mode === 'system'" class="shrink-0 px-4 pb-2">
      <span style="font-size:9px; color:rgba(139,125,107,0.3); font-family:monospace;">
        {{ currentHistory.length }} 条记录
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SystemPersonality } from './store';
import { SYSTEM_CONTACTS, SYSTEM_PERSONALITIES, useVNStore } from './store';

const props = defineProps<{
  mode: 'system' | 'riddle';
  initialPersonality?: SystemPersonality;
}>();

const emit = defineEmits<{ back: [] }>();
const store = useVNStore();
const chatEl = ref<HTMLElement | null>(null);

// Active personality
const activePersonality = ref<SystemPersonality>(props.initialPersonality ?? store.settings.systemPersonality as SystemPersonality);
const showContacts = ref(true);

const contactEntries = computed(() => Object.entries(SYSTEM_CONTACTS) as [SystemPersonality, typeof SYSTEM_CONTACTS[SystemPersonality]][]);
const activeContact = computed(() => SYSTEM_CONTACTS[activePersonality.value]);

// Unread tracking: personalities with messages added since last opened
const lastSeenLength = ref<Record<string, number>>({});
const unreadContacts = computed(() => {
  const s = new Set<SystemPersonality>();
  for (const p of Object.keys(SYSTEM_CONTACTS) as SystemPersonality[]) {
    const hist = store.systemChatHistories[p];
    if (hist && hist.length > (lastSeenLength.value[p] ?? 0)) s.add(p);
  }
  return s;
});

function selectContact(p: SystemPersonality) {
  activePersonality.value = p;
  lastSeenLength.value[p] = store.systemChatHistories[p]?.length ?? 0;
  store.updateSettings({ systemPersonality: p });
  scrollToBottom();
}

// Current chat history (system or riddle)
const currentHistory = computed(() => {
  if (props.mode === 'riddle') {
    return store.riddleChatHistory.map(m => ({ role: m.role as 'user' | 'ai', text: m.text, timestamp: 0 }));
  }
  return store.systemChatHistories[activePersonality.value] ?? [];
});

// Trash / clear confirmation
const confirmingClear = ref(false);
let _clearTimer: ReturnType<typeof setTimeout> | null = null;
function handleClearClick() {
  if (confirmingClear.value) {
    store.clearContactHistory(activePersonality.value);
    confirmingClear.value = false;
    if (_clearTimer) { clearTimeout(_clearTimer); _clearTimer = null; }
  } else {
    confirmingClear.value = true;
    _clearTimer = setTimeout(() => { confirmingClear.value = false; }, 3000);
  }
}
onUnmounted(() => { if (_clearTimer) clearTimeout(_clearTimer); });

// Input state
const inputText = ref('');
const riddleAiThinking = ref(false);
const riddleWon = ref(false);
const riddleWonReward = ref(0);
const riddleBlocked = ref(false);

const isInputDisabled = computed(() =>
  props.mode === 'system' ? store.systemLoading : (riddleAiThinking.value || riddleWon.value),
);
const canSend = computed(() => inputText.value.trim().length > 0 && !isInputDisabled.value);
const inputPlaceholder = computed(() =>
  props.mode === 'riddle' ? '给出线索…' : `发送给 ${activeContact.value.name}…`,
);

async function handleSend() {
  if (!canSend.value) return;
  const text = inputText.value.trim();
  inputText.value = '';
  if (props.mode === 'system') {
    await store.sendSystemUserMessage(text, activePersonality.value);
  } else {
    await handleRiddleSend(text);
  }
  scrollToBottom();
}

async function handleRiddleSend(text: string) {
  const ok = store.addRiddleUserMessage(text);
  if (!ok) {
    riddleBlocked.value = true;
    inputText.value = text;
    setTimeout(() => (riddleBlocked.value = false), 2000);
    return;
  }
  riddleAiThinking.value = true;
  scrollToBottom();
  try {
    const p = activePersonality.value;
    const basePrompt = SYSTEM_PERSONALITIES[p]?.systemPrompt ?? '';
    const riddlePrompt = `${basePrompt}\n\n你正在参与猜谜游戏。用户给你提示，你根据提示猜答案。每次大胆猜一个具体词，或请求更多提示。回复不超过60字。`;
    const historyPrompts = store.riddleChatHistory.map(m => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));
    const result = await generateRaw({
      custom_api: {
        apiurl: store.settings.secondApiUrl,
        key: store.settings.secondApiKey,
        model: store.settings.secondApiModel,
        source: 'openai',
        max_tokens: 150,
      },
      ordered_prompts: [
        { role: 'system' as const, content: riddlePrompt },
        ...historyPrompts,
      ],
      should_silence: true,
      should_stream: store.settings.secondApiStream,
    });
    if (!store.riddleActive) return;
    const outcome = store.addRiddleAiReply(result.trim());
    if (outcome.won) {
      riddleWon.value = true;
      riddleWonReward.value = outcome.reward;
      store.showToast(`情报获取成功！+${outcome.reward}G`);
      setTimeout(() => emit('back'), 2500);
    }
  } catch {
    store.showToast('联络中断');
  } finally {
    riddleAiThinking.value = false;
    scrollToBottom();
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatEl.value) chatEl.value.scrollTop = chatEl.value.scrollHeight;
  });
}

// Auto-scroll on new messages
watch(
  () => currentHistory.value.length,
  () => scrollToBottom(),
);

// Mark current personality as seen when mounted and when switching
onMounted(() => {
  lastSeenLength.value[activePersonality.value] = store.systemChatHistories[activePersonality.value]?.length ?? 0;
  nextTick(() => scrollToBottom());
});
</script>

<style scoped>
.contacts-slide-enter-active {
  transition: transform 0.25s cubic-bezier(0.22, 0.61, 0.36, 1), opacity 0.2s ease;
}
.contacts-slide-leave-active {
  transition: transform 0.2s ease-in, opacity 0.15s ease-in;
}
.contacts-slide-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}
.contacts-slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}
</style>
