<template>
  <main
    ref="mainEl"
    class="relative w-full select-none"
    :style="{ background: 'var(--vn-bg)', aspectRatio: '16/9', minHeight: '0' }"
  >
    <StageArea />

    <!-- Image Deck (扇形卡牌队列) -->
    <ImageDeck v-if="showImageDeck" />

    <div class="pointer-events-none absolute inset-0 flex flex-col" style="z-index: 20; min-height: 0">
      <div class="pointer-events-auto flex-shrink-0">
        <QuickAccessMenu :is-fullscreen="isFullscreen" @toggle-fullscreen="toggleFullscreen" />
      </div>
      <div class="flex-1 min-h-0" />
      <div class="pointer-events-auto pb-6 md:pb-8 flex-shrink-0">
        <DialogueBox :choices="choices" :during-streaming="context.during_streaming" />
      </div>
    </div>

    <ChoicePanel :choices="choices" :message-id="context.message_id" @choice-submitted="handleChoiceSubmitted" />

    <SettingsPanel v-if="store.activeOverlay === 'settings'" />
    <HistoryPanel
      v-if="store.activeOverlay === 'history'"
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
import ImageDeck from './ImageDeck.vue';
import QuickAccessMenu from './QuickAccessMenu.vue';
import SettingsPanel from './SettingsPanel.vue';
import StageArea from './StageArea.vue';
import { parseChoices, useVNStore } from './store';

const context = injectStreamingMessageContext();
const store = useVNStore();
const mainEl = ref<HTMLElement | null>(null);

// 显示扇形卡牌队列的条件：同时打开背景和CG生图开关
const showImageDeck = computed(() => {
  return (
    store.settings.imageGenEnabled &&
    store.settings.backgroundGenEnabled &&
    store.settings.cgGenEnabled &&
    store.imageCardQueue.length > 0
  );
});

function getFullscreenDoc(): Document | null {
  if (document.fullscreenElement) return document;
  try {
    if (window.parent !== window && window.parent.document?.fullscreenElement) return window.parent.document;
  } catch {
    /* 跨域时 parent 不可访问 */
  }
  return null;
}

const isFullscreen = ref(!!getFullscreenDoc());

const choices = computed(() => parseChoices(context.message));

const toastAnim = ref<'in' | 'out' | 'hidden'>('hidden');

// 监听消息变化，自动解析
watch(
  () => context.message,
  async (newMessage) => {
    if (newMessage) {
      await store.parseCurrentMessage(newMessage);
    }
  },
  { immediate: true },
);

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

function handleFullscreenChange() {
  isFullscreen.value = !!getFullscreenDoc();
}

async function toggleFullscreen() {
  try {
    if (isFullscreen.value) {
      // 退出全屏：先试当前 document，再试父 document（iframe 内全屏可能在父页面上）
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        try {
          if (window.parent !== window && window.parent.document?.fullscreenElement) {
            await window.parent.document.exitFullscreen();
          }
        } catch {
          /* 跨域时 parent 不可访问 */
        }
      }
      isFullscreen.value = false;
      return;
    }
    const fsDoc = getFullscreenDoc();
    if (fsDoc) {
      await fsDoc.exitFullscreen();
      isFullscreen.value = false;
      return;
    }
    if (mainEl.value) {
      await mainEl.value.requestFullscreen();
      isFullscreen.value = true;
    }
  } catch (e) {
    console.warn('全屏切换失败:', e);
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

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  try {
    if (window.parent !== window && window.parent.document) {
      window.parent.document.addEventListener('fullscreenchange', handleFullscreenChange);
    }
  } catch {
    /* 跨域时忽略 */
  }
  (
    window as unknown as {
      __galgameState?: { activeGenerationMesId: number | null; mainStore: ReturnType<typeof useVNStore> | null };
    }
  ).__galgameState = (
    window as unknown as {
      __galgameState?: { activeGenerationMesId: number | null; mainStore: ReturnType<typeof useVNStore> | null };
    }
  ).__galgameState ?? {
    activeGenerationMesId: null,
    mainStore: null,
  };
  (
    (window as unknown as { __galgameState: { mainStore: ReturnType<typeof useVNStore> | null } }).__galgameState as {
      mainStore: ReturnType<typeof useVNStore> | null;
    }
  ).mainStore = store;
  store.setupImageGenListener();
  console.info(`[galgame] Mounted streaming VN interface for floor ${context.message_id}`);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  try {
    if (window.parent !== window && window.parent.document) {
      window.parent.document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }
  } catch {
    /* 跨域时忽略 */
  }
});
</script>
