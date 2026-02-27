<template>
  <main
    ref="mainEl"
    class="relative w-full overflow-hidden select-none"
    :style="{ background: 'var(--vn-bg)', aspectRatio: '16/9' }"
  >
    <StageArea />

    <div class="pointer-events-none absolute inset-0 flex flex-col" style="z-index: 20">
      <div class="pointer-events-auto">
        <QuickAccessMenu @fullscreen="handleFullscreen" />
      </div>
      <div class="flex-1" />
      <div class="pointer-events-auto pb-6 md:pb-8">
        <DialogueBox :dialogue-lines="dialogueLines" :choices="choices" :during-streaming="context.during_streaming" />
      </div>
    </div>

    <ChoicePanel :choices="choices" :message-id="context.message_id" @choice-submitted="handleChoiceSubmitted" />

    <SettingsPanel v-if="store.activeOverlay === 'settings'" />
    <HistoryPanel
      v-if="store.activeOverlay === 'history'"
      :dialogue-lines="dialogueLines"
      :current-line-index="dialogueLines.length - 1"
      @go-to-line="handleGoToLine"
    />
    <CharacterPanel v-if="store.activeOverlay === 'character'" />
    <GameplayPanel v-if="store.activeOverlay === 'gameplay'" />

    <!-- Global Toast — always on top -->
    <div
      v-if="toastAnim !== 'hidden' && store.toastMessage"
      class="absolute left-1/2 -translate-x-1/2"
      style="top: 1.5rem; z-index: 9999"
    >
      <div
        class="toast-clipping max-w-md px-6 py-2 text-center text-sm"
        :style="{
          animation: toastAnim === 'in' ? 'toast-in 0.3s ease-out forwards' : 'toast-out 0.3s ease-in forwards',
        }"
      >
        <div class="flex items-center gap-2">
          <span style="color: var(--rust); font-weight: bold; font-size: 0.75rem">[ 号外 ]</span>
          <span>{{ store.toastMessage }}</span>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { injectStreamingMessageContext } from '@util/streaming';
import CharacterPanel from './CharacterPanel.vue';
import ChoicePanel from './ChoicePanel.vue';
import DialogueBox from './DialogueBox.vue';
import GameplayPanel from './GameplayPanel.vue';
import HistoryPanel from './HistoryPanel.vue';
import QuickAccessMenu from './QuickAccessMenu.vue';
import SettingsPanel from './SettingsPanel.vue';
import StageArea from './StageArea.vue';
import { parseChoices, parseDialogueLines, useVNStore } from './store';

const context = injectStreamingMessageContext();
const store = useVNStore();
const mainEl = ref<HTMLElement | null>(null);

const dialogueLines = computed(() => parseDialogueLines(context.message));
const choices = computed(() => parseChoices(context.message));

const toastAnim = ref<'in' | 'out' | 'hidden'>('hidden');

watch(
  () => [store.toastVisible, store.toastMessage] as const,
  ([visible]) => {
    if (visible) {
      toastAnim.value = 'in';
      setTimeout(() => {
        toastAnim.value = 'out';
      }, 2500);
      setTimeout(() => {
        toastAnim.value = 'hidden';
      }, 3000);
    } else {
      toastAnim.value = 'hidden';
    }
  },
);

function handleFullscreen() {
  try {
    const iframe = window.frameElement as HTMLElement | null;
    if (iframe && !window.parent.document.fullscreenElement) {
      iframe.requestFullscreen();
    } else if (iframe && window.parent.document.fullscreenElement) {
      window.parent.document.exitFullscreen();
    } else if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  } catch {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
}

function handleChoiceSubmitted(_choiceId: string, text: string) {
  console.info(`[galgame] Choice submitted: ${text}`);
  triggerSlash(`/send ${text}`);
}

function handleGoToLine(_index: number) {
  store.setOverlay('none');
}

watch(
  () => context.during_streaming,
  streaming => {
    if (!streaming) console.info(`[galgame] Floor ${context.message_id} streaming complete`);
  },
);

onMounted(() => console.info(`[galgame] Mounted streaming VN interface for floor ${context.message_id}`));
</script>
