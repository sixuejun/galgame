<template>
  <main ref="mainEl" class="relative w-full select-none" :style="mainStyle">
    <StageArea />

    <!-- Image Deck (扇形卡牌队列) -->
    <ImageDeck />

    <div class="pointer-events-none absolute inset-0 flex flex-col" :style="overlayContainerStyle">
      <div class="pointer-events-auto shrink-0">
        <QuickAccessMenu :is-fullscreen="isFullscreen" @toggle-fullscreen="toggleFullscreen" />
      </div>
      <div class="min-h-0 flex-1" />
      <div class="pointer-events-auto shrink-0 pb-6 md:pb-8" :style="dialogueBoxStyle">
        <DialogueBox :choices="choices" :during-streaming="context.during_streaming" />
      </div>
    </div>

    <ChoicePanel :choices="choices" :message-id="context.message_id" @choice-submitted="handleChoiceSubmitted" />

    <SettingsPanel v-if="store.activeOverlay === 'settings'" />
    <HistoryPanel v-if="store.activeOverlay === 'history'" @go-to-line="handleGoToLine" />
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

    <!-- 生图测试控制台 -->
    <ImageGenConsole />

    <!-- 重试生图面板 -->
    <ImageGenRetryPanel />
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
import ImageGenConsole from './ImageGenConsole.vue';
import ImageGenRetryPanel from './ImageGenRetryPanel.vue';
import QuickAccessMenu from './QuickAccessMenu.vue';
import SettingsPanel from './SettingsPanel.vue';
import StageArea from './StageArea.vue';
import { parseChoices, useVNStore } from './store';
import { extractImageTagBlocks } from './utils/messageParser';

const context = injectStreamingMessageContext();
const store = useVNStore();
const mainEl = ref<HTMLElement | null>(null);

// 竖屏模式判断
const isPortraitMode = computed(() => store.settings.portraitMode);

// 主容器样式：仅用 width + aspect-ratio 决定高度（iframe 内禁止 vh，避免与比例冲突把宽度压成细条）
const mainStyle = computed(() => {
  if (isPortraitMode.value) {
    return {
      background: 'var(--vn-bg)',
      width: '100%',
      aspectRatio: '3 / 4',
      boxSizing: 'border-box' as const,
    };
  }
  return {
    background: 'var(--vn-bg)',
    width: '100%',
    aspectRatio: '16 / 9',
    boxSizing: 'border-box' as const,
  };
});

// 覆盖层容器样式：竖屏模式下调整位置
const overlayContainerStyle = computed(() => {
  if (isPortraitMode.value) {
    return { zIndex: 20, minHeight: 0 };
  }
  return { zIndex: 20, minHeight: 0 };
});

// 对话框样式：竖屏模式下调整位置到底部中央
const dialogueBoxStyle = computed(() => {
  if (isPortraitMode.value) {
    return { paddingLeft: '1rem', paddingRight: '1rem' };
  }
  return {};
});

// 显示扇形卡牌队列由 ImageDeck 组件自身控制（仅依赖开关）

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
let isTransitioning = false;

const choices = computed(() => parseChoices(context.message));

const toastAnim = ref<'in' | 'out' | 'hidden'>('hidden');

// 监听消息变化，自动解析
watch(
  () => context.message,
  async newMessage => {
    if (newMessage) {
      await store.parseCurrentMessage(newMessage);
      // 解析并处理图像标签块
      const imageTagBlocks = extractImageTagBlocks(newMessage);
      if (imageTagBlocks.length > 0) {
        await store.processImageTagBlocks(imageTagBlocks);
      }
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
  isTransitioning = false;
}

async function toggleFullscreen() {
  if (isTransitioning) return;
  isTransitioning = true;

  const currentDoc = getFullscreenDoc();
  if (currentDoc) {
    try {
      await currentDoc.exitFullscreen();
    } catch {
      isTransitioning = false;
    }
  } else if (mainEl.value) {
    try {
      await mainEl.value.requestFullscreen();
    } catch {
      isTransitioning = false;
    }
  } else {
    isTransitioning = false;
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
