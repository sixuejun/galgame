<template>
  <div class="absolute inset-0 flex items-center justify-center" style="z-index: 50">
    <div
      class="absolute inset-0 backdrop-blur-sm"
      style="background: rgba(42, 36, 32, 0.7)"
      @click="handleBackdropClick"
    />

    <ModuleView v-if="store.activeModuleId" :module-id="store.activeModuleId" @close="store.activeModuleId = null" />

    <div class="animate-fade-in-up relative mx-4 w-full max-w-2xl overflow-hidden border" :style="panelStyle">
      <div :style="decoTop" />
      <div :style="decoTopThin" />

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4" :style="headerBorder">
        <div class="flex items-center gap-3">
          <div class="stamp-effect">
            <span style="color: var(--rust); font-size: 0.75rem; font-weight: bold; letter-spacing: 0.15em"
              >GAMEPLAY</span
            >
          </div>
          <h2 class="text-lg font-bold tracking-widest" style="color: rgba(212, 197, 160, 0.9)">玩法</h2>
        </div>
        <button
          class="flex h-8 w-8 cursor-pointer items-center justify-center"
          style="color: var(--vn-muted)"
          @click="store.setOverlay('none')"
        >
          <i class="fa-solid fa-xmark" />
        </button>
      </div>

      <!-- Gold / Inventory Bar -->
      <div class="flex items-center gap-3 px-6 py-3" :style="{ borderBottom: '1px solid rgba(90,79,64,0.2)' }">
        <button class="gold-counter cursor-pointer" @click="store.activeModuleId = 'gold_log'">
          <i class="fa-solid fa-coins" style="font-size: 0.75rem" />
          <span class="font-bold">{{ store.gold }}</span>
          <i class="fa-solid fa-chevron-right" style="font-size: 0.5rem; opacity: 0.5" />
        </button>
        <button
          class="flex cursor-pointer items-center gap-1.5 border px-2.5 py-1 text-xs transition-all"
          style="border-color: rgba(90, 79, 64, 0.4); border-radius: 2px; color: var(--vn-muted)"
          @click="store.activeModuleId = 'inventory'"
        >
          <i class="fa-solid fa-box-open" style="font-size: 0.7rem" />
          <span>背包</span>
          <span v-if="store.inventory.length > 0" style="color: var(--rust); font-family: monospace">{{
            store.inventory.length
          }}</span>
        </button>
        <div class="flex-1" />
        <div style="font-size: 9px; color: var(--vn-muted); font-family: monospace">
          Lv.{{ store.workshopLevel }} 工坊
        </div>
      </div>

      <!-- System Terminal Entry -->
      <div
        class="sys-terminal-entry"
        :style="{ borderBottom: '1px solid rgba(90,79,64,0.2)' }"
        @click="toggleSystemChat"
      >
        <div class="sys-terminal-inner">
          <div class="sys-terminal-scanline" />
          <div class="relative flex items-center justify-center gap-2.5 py-2.5">
            <span class="sys-terminal-dot" :class="{ 'sys-terminal-dot-active': chatMode }" />
            <span class="sys-terminal-label">
              {{ chatMode ? '◇ 返回功能面板 ◇' : '◈ 末世通讯终端 · 接入 ◈' }}
            </span>
            <span v-if="!chatMode" class="sys-terminal-badge">ONLINE</span>
          </div>
        </div>
      </div>

      <!-- Module Grid -->
      <div
        ref="moduleGridRef"
        class="no-scrollbar overflow-y-auto px-6 py-5"
        style="max-height: calc(85vh - 250px)"
      >
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <button
            v-for="mod in displayModules"
            :key="mod.moduleId"
            class="module-card-item relative border text-left transition-all duration-200"
            :style="{
              borderColor: mod.lockReason ? 'rgba(90,79,64,0.2)' : 'rgba(90,79,64,0.4)',
              opacity: mod.lockReason ? 0.4 : 1,
              cursor: mod.lockReason ? 'not-allowed' : 'pointer',
              borderRadius: '2px',
            }"
            :disabled="!!mod.lockReason"
            @click="!mod.lockReason && handleModuleClick(mod.moduleId)"
          >
            <div
              :style="{
                height: '1px',
                background: 'linear-gradient(to right, transparent, rgba(212,197,160,0.15), transparent)',
              }"
            />
            <div class="p-4">
              <div class="flex items-start gap-3">
                <div
                  class="shrink-0"
                  :style="{ color: mod.lockReason ? 'rgba(139,125,107,0.3)' : 'rgba(139,69,19,0.7)' }"
                >
                  <i :class="mod.lockReason ? 'fa-solid fa-lock' : 'fa-solid ' + mod.icon" style="font-size: 1.1rem" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-sm font-bold"
                      :style="{ color: mod.lockReason ? 'var(--vn-muted)' : 'rgba(212,197,160,0.9)' }"
                      >{{ mod.displayName }}</span
                    >
                    <span
                      v-if="mod.badge"
                      class="border px-1"
                      style="font-size: 8px; color: var(--rust); border-color: rgba(139, 69, 19, 0.3)"
                      >{{ mod.badge }}</span
                    >
                    <template v-if="mod.moduleId === 'idle_workshop' && store.workshopCharacterId">
                      <span
                        v-if="store.workshopProducing"
                        class="border px-1"
                        style="font-size: 8px; color: var(--vn-success); border-color: rgba(90, 122, 74, 0.3)"
                        >生产中</span
                      >
                      <span
                        v-else
                        class="border px-1"
                        style="font-size: 8px; color: var(--stain); border-color: rgba(196, 162, 101, 0.3)"
                        >已暂停</span
                      >
                      <button
                        class="flex h-5 w-5 cursor-pointer items-center justify-center border"
                        style="border-color: rgba(90, 79, 64, 0.3); border-radius: 2px; font-size: 0.55rem"
                        :style="{ color: store.workshopProducing ? 'var(--stain)' : 'var(--vn-success)' }"
                        @click.stop="store.workshopProducing ? store.pauseProduction() : store.resumeProduction()"
                      >
                        <i :class="store.workshopProducing ? 'fa-solid fa-pause' : 'fa-solid fa-play'" />
                      </button>
                    </template>
                  </div>
                  <p style="font-size: 11px; color: var(--vn-muted); margin-top: 4px; line-height: 1.6">
                    {{ mod.description }}
                  </p>
                  <p
                    v-if="mod.lockReason"
                    style="font-size: 9px; color: rgba(139, 125, 107, 0.5); margin-top: 6px; font-family: monospace"
                  >
                    [ {{ mod.lockReason }} ]
                  </p>
                </div>
                <div
                  v-if="mod.moduleId === 'puzzle_2048'"
                  class="flex shrink-0 flex-col items-end justify-center"
                >
                  <span
                    style="font-size: 9px; color: var(--stain); font-family: monospace; font-weight: bold"
                  >
                    {{ puzzleFee > 0 ? `${puzzleFee}G` : '免费' }}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div class="module-footer-note mt-6 pt-4 text-center" :style="{ borderTop: '1px solid rgba(90,79,64,0.2)' }">
          <p style="font-size: 9px; color: rgba(139, 125, 107, 0.4); font-family: monospace">
            模块不会影响当前剧情进度 · 关闭后返回此界面
          </p>
        </div>
      </div>

      <!-- System Chat -->
      <div ref="systemChatRef" class="sys-chat-wrapper" style="display: none">
        <div class="flex" style="height: 320px">
          <!-- Contacts Sidebar -->
          <div ref="contactsRef" class="sys-contacts-sidebar">
            <div class="sys-contacts-title">
              <i class="fa-solid fa-tower-broadcast" style="font-size: 0.6rem" />
              <span>频道</span>
            </div>
            <div class="sys-contacts-list">
              <div
                v-for="p in store.SYSTEM_PERSONALITIES"
                :key="p.id"
                class="sys-contact-card"
                :class="{ 'sys-contact-active': store.activePersonalityId === p.id }"
                @click="store.selectSystemPersonality(p.id)"
              >
                <div class="sys-contact-avatar">
                  <span>{{ p.avatarChar || p.name.charAt(0) }}</span>
                  <div
                    v-if="store.unreadPersonalityIds.has(p.id)"
                    class="sys-contact-online-dot"
                  />
                </div>
                <div class="sys-contact-name">{{ p.name }}</div>
              </div>
            </div>
          </div>

          <!-- Chat Area -->
          <div ref="chatAreaRef" class="sys-chat-main">
            <div ref="chatMessagesRef" class="sys-chat-messages">
              <template v-if="store.activePersonalityId">
                <div
                  v-for="(msg, i) in currentChatHistory"
                  :key="i"
                  class="sys-msg"
                  :class="msg.role === 'user' ? 'sys-msg-right' : 'sys-msg-left'"
                >
                  <div v-if="msg.role === 'proactive'" class="sys-proactive-tag">
                    <i class="fa-solid fa-bolt" style="font-size: 7px" />
                    吐槽
                  </div>
                  <div
                    class="sys-msg-bubble"
                    :class="msg.role === 'user' ? 'sys-bubble-user' : 'sys-bubble-system'"
                  >
                    {{ msg.text }}
                  </div>
                </div>
                <div v-if="currentChatHistory.length === 0" class="sys-empty-chat">
                  <i class="fa-solid fa-satellite-dish" style="font-size: 1.2rem; opacity: 0.3" />
                  <span>频道已接通，发送消息开始对话</span>
                </div>
              </template>
              <div v-else class="sys-empty-chat">
                <i class="fa-solid fa-signal" style="font-size: 1.2rem; opacity: 0.3" />
                <span>选择左侧频道接入通讯</span>
              </div>
            </div>

            <!-- Input Bar -->
            <div ref="inputBarRef" class="sys-input-bar">
              <div class="sys-input-wrapper">
                <input
                  v-model="systemChatInput"
                  class="sys-chat-input"
                  placeholder="输入消息…"
                  :disabled="!store.activePersonalityId || systemChatSending"
                  @keydown.enter="sendSystemMessage"
                />
                <button
                  class="sys-send-btn"
                  :disabled="!systemChatInput.trim() || !store.activePersonalityId || systemChatSending"
                  @click="sendSystemMessage"
                >
                  <template v-if="systemChatSending">
                    <i class="fa-solid fa-spinner fa-spin sys-send-icon" />
                  </template>
                  <template v-else>
                    <i class="fa-solid fa-paper-plane sys-send-icon" />
                  </template>
                </button>
              </div>
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
import { gsap } from 'gsap';
import ModuleView from './ModuleView.vue';
import { calcCommission, useVNStore } from './store';

const store = useVNStore();

const panelStyle = {
  maxHeight: '85vh',
  borderColor: 'rgba(90,79,64,0.6)',
  background: 'var(--vn-panel-bg)',
  backdropFilter: 'blur(12px)',
};
const headerBorder = { borderBottom: '1px solid rgba(90,79,64,0.3)' };
const decoTop = {
  height: '3px',
  background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.6), transparent)',
};
const decoTopThin = {
  height: '1px',
  marginTop: '1px',
  background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.3), transparent)',
};
const decoBottomThin = {
  height: '1px',
  background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.3), transparent)',
};
const decoBottom = {
  height: '2px',
  marginTop: '1px',
  background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.5), transparent)',
};

const puzzleFee = computed(() => calcCommission(store.gold, store.workshopLevel, 0));

const systemChatInput = ref('');
const systemChatSending = ref(false);
const chatMode = ref(false);
const transitioning = ref(false);

const moduleGridRef = ref<HTMLElement>();
const systemChatRef = ref<HTMLElement>();
const contactsRef = ref<HTMLElement>();
const chatAreaRef = ref<HTMLElement>();
const inputBarRef = ref<HTMLElement>();
const chatMessagesRef = ref<HTMLElement>();

const displayModules = computed(() =>
  store.gameModules
    .filter(m => m.moduleId !== 'inventory')
    .map(m => ({
      ...m,
      lockReason: store.getModuleLockReason(m.moduleId),
    })),
);

const currentChatHistory = computed(() => {
  if (!store.activePersonalityId) return [];
  return store.systemChatHistories[store.activePersonalityId] ?? [];
});

async function toggleSystemChat() {
  if (transitioning.value) return;
  transitioning.value = true;

  if (!chatMode.value) {
    await openSystemChat();
  } else {
    await closeSystemChat();
  }

  transitioning.value = false;
}

async function openSystemChat() {
  store.systemChatOpen = true;
  if (!store.activePersonalityId && store.SYSTEM_PERSONALITIES.length > 0) {
    store.selectSystemPersonality(store.SYSTEM_PERSONALITIES[0].id);
  }

  const grid = moduleGridRef.value;
  if (!grid) return;

  // Keep grid height fixed during transition to prevent collapse
  const gridHeight = grid.offsetHeight;
  grid.style.height = `${gridHeight}px`;
  grid.style.overflow = 'hidden';

  const cards = grid.querySelectorAll('.module-card-item');
  if (cards.length) {
    await gsap.to(cards, {
      y: -25,
      opacity: 0,
      scale: 0.92,
      stagger: 0.05,
      duration: 0.28,
      ease: 'power2.in',
    });
  }

  const gridNote = grid.querySelector('.module-footer-note');
  if (gridNote) gsap.set(gridNote, { opacity: 0 });

  // Instead of collapsing height to 0, just hide it after cards are gone
  // This keeps the window size stable if we don't animate the container height
  // But we want the chat to appear in its place.
  // If we want window height unchanged, we should ensure chat container has similar height or
  // the parent container has fixed height.
  // The parent has `max-height: 85vh`.
  // Let's just hide the grid display and show chat.

  grid.style.display = 'none';

  chatMode.value = true;
  const chatContainer = systemChatRef.value;
  if (!chatContainer) return;
  chatContainer.style.display = 'flex';
  // Set a min-height to prevent collapse if chat is empty initially
  chatContainer.style.minHeight = `${gridHeight}px`;

  await nextTick();

  const tl = gsap.timeline();

  if (contactsRef.value) {
    tl.from(contactsRef.value, {
      x: -130,
      opacity: 0,
      duration: 0.45,
      ease: 'power3.out',
    });
  }

  if (chatAreaRef.value) {
    tl.from(chatAreaRef.value, {
      opacity: 0,
      x: 20,
      duration: 0.35,
      ease: 'power2.out',
    }, '-=0.3');
  }

  if (inputBarRef.value) {
    tl.from(inputBarRef.value, {
      y: 40,
      opacity: 0,
      duration: 0.38,
      ease: 'back.out(1.5)',
    }, '-=0.2');
  }

  await tl;
  scrollChatToBottom();
}

async function closeSystemChat() {
  const tl = gsap.timeline();

  if (inputBarRef.value) {
    tl.to(inputBarRef.value, {
      y: 30,
      opacity: 0,
      duration: 0.2,
      ease: 'power2.in',
    });
  }

  if (chatAreaRef.value) {
    tl.to(chatAreaRef.value, {
      opacity: 0,
      x: 15,
      duration: 0.2,
    }, '-=0.12');
  }

  if (contactsRef.value) {
    tl.to(contactsRef.value, {
      x: -130,
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in',
    }, '-=0.12');
  }

  await tl;

  const chatContainer = systemChatRef.value;
  if (chatContainer) chatContainer.style.display = 'none';

  chatMode.value = false;
  store.systemChatOpen = false;

  const grid = moduleGridRef.value;
  if (!grid) return;
  grid.style.display = '';
  grid.style.height = ''; // Reset height
  grid.style.overflow = '';

  const gridNote = grid.querySelector('.module-footer-note');
  if (gridNote) gsap.set(gridNote, { opacity: 1 });

  const cards = grid.querySelectorAll('.module-card-item');
  if (cards.length) {
    // Reset state
    gsap.set(cards, { y: 0, opacity: 1, scale: 1 });
    // Animate from top (pull down expand)
    // "Pull down from top" means they start higher (negative y) and move down to 0
    await gsap.from(cards, {
      y: -40,
      opacity: 0,
      scale: 0.95,
      stagger: 0.05,
      duration: 0.4,
      ease: 'back.out(1.2)',
    });
  }

  if (contactsRef.value) gsap.set(contactsRef.value, { clearProps: 'all' });
  if (chatAreaRef.value) gsap.set(chatAreaRef.value, { clearProps: 'all' });
  if (inputBarRef.value) gsap.set(inputBarRef.value, { clearProps: 'all' });
}

function scrollChatToBottom() {
  nextTick(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
    }
  });
}

async function sendSystemMessage() {
  const text = systemChatInput.value.trim();
  const pid = store.activePersonalityId;
  if (!text || !pid) return;
  systemChatSending.value = true;
  systemChatInput.value = '';
  try {
    await store.sendSystemUserMessage(pid, text);
    scrollChatToBottom();
  } finally {
    systemChatSending.value = false;
  }
}

function handleModuleClick(moduleId: string) {
  if (moduleId === 'puzzle_2048') {
    if (!store.autoStart2048()) {
      store.showToast('金币不足');
      return;
    }
  }
  store.activeModuleId = moduleId;
}

function handleBackdropClick() {
  if (store.workshopProducing) return;
  store.setOverlay('none');
}

watch(
  () => store.activePersonalityId && currentChatHistory.value.length,
  () => scrollChatToBottom(),
);
</script>

<style scoped>
/* === System Terminal Entry === */
.sys-terminal-entry {
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: background 0.3s;
}

.sys-terminal-entry:hover {
  background: transparent;
}

.sys-terminal-inner {
  position: relative;
  overflow: hidden;
}

.sys-terminal-scanline {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(139, 69, 19, 0.025) 2px,
    rgba(139, 69, 19, 0.025) 4px
  );
  animation: sys-scanline-drift 6s linear infinite;
  pointer-events: none;
}

@keyframes sys-scanline-drift {
  0% { transform: translateY(0); }
  100% { transform: translateY(4px); }
}

.sys-terminal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vn-muted);
  transition: all 0.4s;
  flex-shrink: 0;
}

.sys-terminal-dot-active {
  background: var(--rust);
  box-shadow: 0 0 6px rgba(139, 69, 19, 0.5);
  animation: sys-dot-pulse 2s ease-in-out infinite;
}

@keyframes sys-dot-pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 4px rgba(139, 69, 19, 0.4); }
  50% { opacity: 0.6; box-shadow: 0 0 10px rgba(139, 69, 19, 0.6); }
}

.sys-terminal-label {
  font-size: 10px;
  font-family: monospace;
  color: var(--vn-muted);
  letter-spacing: 0.12em;
  transition: color 0.3s;
  user-select: none;
}

.sys-terminal-entry:hover .sys-terminal-label {
  color: var(--rust);
}

.sys-terminal-badge {
  font-size: 7px;
  font-family: monospace;
  font-weight: bold;
  letter-spacing: 0.15em;
  color: var(--vn-success);
  border: 1px solid rgba(90, 122, 74, 0.4);
  padding: 1px 5px;
  border-radius: 2px;
  animation: sys-badge-blink 3s ease-in-out infinite;
}

@keyframes sys-badge-blink {
  0%, 80%, 100% { opacity: 1; }
  90% { opacity: 0.4; }
}

/* === System Chat Wrapper === */
.sys-chat-wrapper {
  flex-direction: column;
}

/* === Contacts Sidebar === */
.sys-contacts-sidebar {
  width: 100px;
  flex-shrink: 0;
  border-right: 1px solid rgba(90, 79, 64, 0.25);
  display: flex;
  flex-direction: column;
  background: rgba(35, 30, 26, 0.4);
}

.sys-contacts-title {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 12px;
  font-size: 9px;
  font-family: monospace;
  letter-spacing: 0.15em;
  color: var(--rust);
  border-bottom: 1px solid rgba(90, 79, 64, 0.2);
  text-transform: uppercase;
}

.sys-contacts-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.sys-contact-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.25s;
  margin-bottom: 2px;
  position: relative;
}

.sys-contact-card:hover {
  background: rgba(139, 69, 19, 0.08);
}

.sys-contact-active {
  background: rgba(139, 69, 19, 0.12) !important;
}

.sys-contact-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 15%;
  bottom: 15%;
  width: 2px;
  background: var(--rust);
  border-radius: 0 2px 2px 0;
}

.sys-contact-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: bold;
  position: relative;
  border: 1.5px solid rgba(90, 79, 64, 0.4);
  background: rgba(58, 51, 44, 0.5);
  color: var(--stain);
  transition: all 0.25s;
}

.sys-contact-active .sys-contact-avatar {
  border-color: var(--rust);
  box-shadow: 0 0 8px rgba(139, 69, 19, 0.25);
  color: var(--rust);
}

.sys-contact-online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 8px;
  height: 8px;
  background: var(--vn-success);
  border-radius: 50%;
  border: 1.5px solid rgba(51, 44, 38, 0.96);
}

.sys-contact-name {
  font-size: 9px;
  color: var(--vn-muted);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 80px;
  transition: color 0.25s;
}

.sys-contact-active .sys-contact-name {
  color: rgba(212, 197, 160, 0.9);
}

/* === Chat Main Area === */
.sys-chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.sys-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sys-empty-chat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--vn-muted);
  font-size: 11px;
  font-family: monospace;
  letter-spacing: 0.05em;
}

.sys-msg {
  display: flex;
  flex-direction: column;
  max-width: 85%;
}

.sys-msg-left {
  align-self: flex-start;
  align-items: flex-start;
}

.sys-msg-right {
  align-self: flex-end;
  align-items: flex-end;
}

.sys-proactive-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 8px;
  color: var(--stain);
  font-family: monospace;
  margin-bottom: 3px;
  padding-left: 2px;
  letter-spacing: 0.05em;
}

.sys-msg-bubble {
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.6;
  word-break: break-all;
  border-radius: 2px;
}

.sys-bubble-system {
  background: rgba(58, 51, 44, 0.55);
  border: 1px solid rgba(90, 79, 64, 0.3);
  color: var(--vn-fg);
  border-radius: 2px 10px 10px 2px;
}

.sys-bubble-user {
  background: rgba(139, 69, 19, 0.15);
  border: 1px solid rgba(139, 69, 19, 0.25);
  color: var(--vn-fg);
  border-radius: 10px 2px 2px 10px;
}

/* === Input Bar === */
.sys-input-bar {
  padding: 10px 16px 12px;
  border-top: 1px solid rgba(90, 79, 64, 0.2);
  background: rgba(35, 30, 26, 0.3);
}

.sys-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sys-chat-input {
  flex: 1;
  height: 34px;
  background: rgba(74, 64, 53, 0.35);
  border: 1px solid rgba(90, 79, 64, 0.4);
  color: var(--vn-fg);
  padding: 0 12px;
  font-size: 12px;
  border-radius: 17px;
  outline: none;
  font-family: 'Noto Serif SC', serif;
  transition: all 0.25s;
}

.sys-chat-input:focus {
  border-color: rgba(139, 69, 19, 0.5);
  background: rgba(74, 64, 53, 0.5);
}

.sys-chat-input::placeholder {
  color: rgba(139, 125, 107, 0.45);
}

.sys-chat-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sys-send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  min-width: 44px;
  padding: 0 14px;
  border: 1px solid rgba(139, 69, 19, 0.4);
  background: rgba(139, 69, 19, 0.12);
  color: var(--rust);
  border-radius: 17px;
  cursor: pointer;
  transition: all 0.25s;
  flex-shrink: 0;
}

.sys-send-icon {
  font-size: 1.05rem;
}

.sys-send-btn:hover:not(:disabled) {
  background: rgba(139, 69, 19, 0.22);
  border-color: var(--rust);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 69, 19, 0.2);
}

.sys-send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
