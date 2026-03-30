<template>
  <!-- 黑屏文字：全屏遮罩转场（不显示底部对话框） -->
  <Teleport to="body">
    <Transition name="blacktext-mask">
      <div
        v-if="currentBlock?.type === 'blacktext'"
        class="vn-blacktext-overlay fixed inset-0 flex cursor-pointer items-center justify-center p-6 md:p-10"
        style="z-index: 38"
        @click="handleClickText"
      >
        <!-- 纯黑底 + 轻微颗粒感，增强「场次切换」感 -->
        <div class="vn-blacktext-backdrop absolute inset-0 bg-black" aria-hidden="true" />
        <div
          class="vn-blacktext-grain pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden="true"
        />

        <div class="relative z-10 max-w-3xl text-center">
          <Transition name="blacktext-line">
            <p
              v-show="isBlacktextVisible"
              class="vn-blacktext-text text-lg leading-relaxed tracking-widest md:text-2xl md:leading-relaxed"
            >
              {{ displayedText }}
              <span
                v-if="isTyping"
                class="vn-blacktext-caret ml-0.5 inline-block align-middle"
              />
            </p>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- 普通对话框（非黑屏文字） -->
  <div v-if="currentBlock && currentBlock.type !== 'blacktext'" class="relative w-full" @click="handleClickText">
    <div class="relative mx-3 md:mx-8 lg:mx-16">
      <div
        class="relative border backdrop-blur-sm"
        :style="{
          borderColor: 'rgba(90,79,64,0.6)',
          background: 'var(--vn-dialogue-bg)',
          boxShadow: 'inset 0 0 30px rgba(42,36,32,0.3), 0 4px 12px rgba(0,0,0,0.4)',
        }"
      >
        <!-- Top decorative lines -->
        <div
          :style="{
            height: '3px',
            opacity: 0.2,
            background: 'linear-gradient(to right, transparent, rgba(212,197,160,0.4), transparent)',
          }"
        />
        <div
          :style="{
            height: '1px',
            marginTop: '2px',
            background: 'linear-gradient(to right, transparent, rgba(212,197,160,0.2), transparent)',
          }"
        />

        <div class="flex items-stretch">
          <!-- Prev arrow -->
          <button
            class="dialogue-nav-arrow flex w-8 shrink-0 items-center justify-center transition-opacity duration-200"
            :class="isFirstBlock ? 'cursor-not-allowed opacity-20' : 'cursor-pointer opacity-60 hover:opacity-100'"
            :disabled="isFirstBlock"
            @click.stop="!isFirstBlock && prevBlock()"
          >
            <i class="fa-solid fa-chevron-left" style="font-size: 0.85rem; color: var(--vn-fg)" />
          </button>

          <!-- Text area -->
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-4 md:px-5">
            <!-- Character name -->
            <div
              v-if="currentBlock.type === 'character' && currentBlock.character"
              class="mb-2 flex items-center gap-2"
            >
              <span style="color: var(--rust); font-weight: bold; font-size: 0.875rem; letter-spacing: 0.1em">
                {{ currentBlock.character }}
              </span>
              <div
                class="flex-1"
                :style="{ height: '1px', background: 'linear-gradient(to right, rgba(139,69,19,0.3), transparent)' }"
              />
            </div>

            <!-- Narration indicator -->
            <div v-if="currentBlock.type === 'narration'" class="mb-2 flex items-center gap-2">
              <div style="width: 8px; height: 8px; background: rgba(139, 69, 19, 0.4); transform: rotate(45deg)" />
              <div
                class="flex-1"
                :style="{ height: '1px', background: 'linear-gradient(to right, rgba(212,197,160,0.1), transparent)' }"
              />
            </div>

            <!-- Text content -->
            <div ref="textRef" class="no-scrollbar max-h-28 overflow-y-auto md:max-h-36" @scroll="handleTextScroll">
              <p
                class="text-sm leading-relaxed tracking-wide md:text-base"
                :style="{
                  color: getTextColor(),
                  fontStyle: currentBlock.type === 'narration' ? 'italic' : 'normal',
                  textAlign: currentBlock.type === 'user' ? 'right' : 'left',
                }"
              >
                {{ displayedText }}
                <span
                  v-if="isTyping"
                  class="ml-0.5 inline-block"
                  style="width: 2px; height: 1rem; background: var(--rust); animation: cursor-blink 1s infinite"
                />
              </p>
            </div>
          </div>

          <!-- Next arrow -->
          <button
            class="dialogue-nav-arrow flex w-8 shrink-0 items-center justify-center transition-opacity duration-200"
            :class="
              isLastBlock || hasChoices
                ? 'cursor-not-allowed opacity-20'
                : 'cursor-pointer opacity-60 hover:opacity-100'
            "
            :disabled="isLastBlock || hasChoices"
            @click.stop="!isLastBlock && !hasChoices && nextBlock()"
          >
            <i class="fa-solid fa-chevron-right" style="font-size: 0.85rem; color: var(--vn-fg)" />
          </button>
        </div>

        <!-- Bottom decorative lines -->
        <div
          :style="{
            height: '1px',
            background: 'linear-gradient(to right, transparent, rgba(212,197,160,0.2), transparent)',
          }"
        />
        <div
          :style="{
            height: '2px',
            marginTop: '1px',
            background: 'linear-gradient(to right, transparent, rgba(212,197,160,0.3), transparent)',
          }"
        />

        <!-- Block counter -->
        <div
          class="absolute right-3 bottom-1"
          style="font-size: 10px; color: var(--vn-muted); font-family: monospace; opacity: 0.4"
        >
          {{ store.currentDialogueIndex + 1 }}/{{ store.currentMessageBlocks.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVNStore } from './store';

const props = defineProps<{
  choices: { choiceId: string; text: string; isCustomInput?: boolean }[];
  duringStreaming: boolean;
}>();

const store = useVNStore();
const textRef = ref<HTMLDivElement | null>(null);
const isManualScroll = ref(false);

const displayedText = ref('');
const isTyping = ref(false);
const isBlacktextVisible = ref(false);
let typingTimer: ReturnType<typeof setTimeout> | null = null;

/** 黑屏遮罩淡入后再开始打字（与 CSS 时长一致） */
const BLACKTEXT_MASK_IN_MS = 520;

const currentBlock = computed(() => store.currentBlock);
const isFirstBlock = computed(() => store.currentDialogueIndex === 0);
const isLastBlock = computed(() => store.currentDialogueIndex === store.currentMessageBlocks.length - 1);
const hasChoices = computed(() => props.choices.length > 0);

function prevBlock() {
  store.prevDialogue();
}

function nextBlock() {
  store.nextDialogue();
}

function getTextColor() {
  if (!currentBlock.value) return 'rgba(212,197,160,0.9)';

  switch (currentBlock.value.type) {
    case 'narration':
      return 'rgba(212,197,160,0.7)';
    case 'user':
      return 'rgba(160,197,212,0.95)';
    case 'character':
    default:
      return 'rgba(212,197,160,0.9)';
  }
}

function getBlockText() {
  if (!currentBlock.value) return '';

  switch (currentBlock.value.type) {
    case 'character':
      return currentBlock.value.text || '';
    case 'narration':
      return currentBlock.value.message || '';
    case 'blacktext':
      return currentBlock.value.message || '';
    case 'user':
      return currentBlock.value.text || '';
    default:
      return '';
  }
}

watch(
  currentBlock,
  block => {
    if (!block) return;
    if (typingTimer) clearTimeout(typingTimer);

    displayedText.value = '';
    isTyping.value = true;
    isBlacktextVisible.value = false;

    const fullText = getBlockText();
    const charDelay = store.settings.textSpeed >= 10 ? 0 : Math.max(10, 120 - store.settings.textSpeed * 12);
    let charIndex = 0;

    if (charDelay === 0) {
      displayedText.value = fullText;
      isTyping.value = false;
      if (block.type === 'blacktext') {
        setTimeout(() => {
          isBlacktextVisible.value = true;
        }, BLACKTEXT_MASK_IN_MS);
      }
      return;
    }

    const typeNext = () => {
      if (charIndex < fullText.length) {
        charIndex++;
        displayedText.value = fullText.slice(0, charIndex);
        typingTimer = setTimeout(typeNext, charDelay);
      } else {
        isTyping.value = false;
      }
    };

    if (block.type === 'blacktext') {
      setTimeout(() => {
        isBlacktextVisible.value = true;
        typingTimer = setTimeout(typeNext, charDelay);
      }, BLACKTEXT_MASK_IN_MS);
    } else {
      typingTimer = setTimeout(typeNext, charDelay);
    }
  },
  { immediate: true },
);

watch(displayedText, () => {
  if (!isManualScroll.value && textRef.value) {
    textRef.value.scrollTop = textRef.value.scrollHeight;
  }
});

watch(
  () =>
    [store.settings.autoPlay, isTyping.value, hasChoices.value, isLastBlock.value, store.currentDialogueIndex] as const,
  ([autoPlay, typing, choices, last]) => {
    if (!autoPlay || typing || choices || last) return;
    const delay = Math.max(500, 5000 - store.settings.autoPlaySpeed * 400);
    const timer = setTimeout(nextBlock, delay);
    onScopeDispose(() => clearTimeout(timer));
  },
);

function handleTextScroll() {
  isManualScroll.value = true;
  setTimeout(() => {
    isManualScroll.value = false;
  }, 3000);
}

function handleClickText() {
  if (currentBlock.value?.type === 'blacktext') {
    if (isTyping.value) {
      if (typingTimer) clearTimeout(typingTimer);
      displayedText.value = getBlockText();
      isTyping.value = false;
    } else if (!isLastBlock.value) {
      nextBlock();
    }
    return;
  }

  if (isTyping.value) {
    if (typingTimer) clearTimeout(typingTimer);
    displayedText.value = getBlockText();
    isTyping.value = false;
  } else if (!hasChoices.value && !isLastBlock.value) {
    nextBlock();
  }
}

onUnmounted(() => {
  if (typingTimer) clearTimeout(typingTimer);
});
</script>

<style scoped>
.dialogue-nav-arrow:hover:not(:disabled) {
  background: rgba(212, 197, 160, 0.05);
}

/* 全屏黑遮罩：淡入淡出转场 */
.blacktext-mask-enter-active,
.blacktext-mask-leave-active {
  transition: opacity 0.5s ease;
}
.blacktext-mask-enter-from,
.blacktext-mask-leave-to {
  opacity: 0;
}

/* 文字行：略晚于遮罩出现 */
.blacktext-line-enter-active {
  transition: opacity 0.45s ease 0.12s, transform 0.45s ease 0.12s;
}
.blacktext-line-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.vn-blacktext-text {
  color: rgba(250, 248, 240, 0.95);
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'SimSun', serif;
  text-shadow: 0 0 24px rgba(0, 0, 0, 0.5);
}

.vn-blacktext-caret {
  width: 2px;
  height: 1.1em;
  background: rgba(250, 248, 240, 0.85);
  animation: cursor-blink 1s infinite;
}

.vn-blacktext-grain {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  mix-blend-mode: overlay;
}
</style>
