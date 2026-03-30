<template>
  <!-- 全屏黑屏文字转场效果 -->
  <Transition
    enter-active-class="transition-opacity duration-700"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-500"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="currentBlock?.type === 'blacktext'"
      class="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black"
    >
      <div class="text-center max-w-2xl">
        <p
          ref="blacktextRef"
          class="text-xl md:text-2xl leading-relaxed tracking-wide transition-opacity duration-500"
          :class="isBlacktextVisible ? 'opacity-100' : 'opacity-0'"
          style="color: rgba(212,197,160,0.9); font-family: inherit;"
        >
          {{ displayedText }}
          <span
            v-if="isTyping"
            class="inline-block ml-0.5"
            style="width:2px; height:1.2rem; background:rgba(212,197,160,0.8); animation: cursor-blink 1s infinite;"
          />
        </p>
      </div>
    </div>
  </Transition>

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
        <div :style="{ height:'3px', background:'linear-gradient(to right, transparent, rgba(212,197,160,0.4), transparent)' }" />
        <div :style="{ height:'1px', marginTop:'2px', background:'linear-gradient(to right, transparent, rgba(212,197,160,0.2), transparent)' }" />

        <div class="flex items-stretch">
          <!-- Prev arrow -->
          <button
            class="dialogue-nav-arrow shrink-0 w-8 flex items-center justify-center transition-opacity duration-200"
            :class="isFirstBlock ? 'opacity-20 cursor-not-allowed' : 'opacity-60 hover:opacity-100 cursor-pointer'"
            :disabled="isFirstBlock"
            @click.stop="!isFirstBlock && prevBlock()"
          >
            <i class="fa-solid fa-chevron-left" style="font-size:0.85rem; color:var(--vn-fg);" />
          </button>

          <!-- Text area -->
          <div class="flex-1 py-4 px-3 md:px-5 min-w-0">
            <!-- Character name -->
            <div v-if="currentBlock.type === 'character' && currentBlock.character" class="mb-2 flex items-center gap-2">
              <span style="color:var(--rust); font-weight:bold; font-size:0.875rem; letter-spacing:0.1em;">
                {{ currentBlock.character }}
              </span>
              <div class="flex-1" :style="{ height:'1px', background:'linear-gradient(to right, rgba(139,69,19,0.3), transparent)' }" />
            </div>

            <!-- Narration indicator -->
            <div v-if="currentBlock.type === 'narration'" class="mb-2 flex items-center gap-2">
              <div style="width:8px; height:8px; background:rgba(139,69,19,0.4); transform:rotate(45deg);" />
              <div class="flex-1" :style="{ height:'1px', background:'linear-gradient(to right, rgba(212,197,160,0.1), transparent)' }" />
            </div>

            <!-- Text content -->
            <div ref="textRef" class="max-h-28 md:max-h-36 overflow-y-auto no-scrollbar" @scroll="handleTextScroll">
              <p
                class="text-sm md:text-base leading-relaxed tracking-wide"
                :style="{
                  color: getTextColor(),
                  fontStyle: currentBlock.type === 'narration' ? 'italic' : 'normal',
                  textAlign: currentBlock.type === 'user' ? 'right' : 'left',
                }"
              >
                {{ displayedText }}
                <span
                  v-if="isTyping"
                  class="inline-block ml-0.5"
                  style="width:2px; height:1rem; background:var(--rust); animation: cursor-blink 1s infinite;"
                />
              </p>
            </div>
          </div>

          <!-- Next arrow -->
          <button
            class="dialogue-nav-arrow shrink-0 w-8 flex items-center justify-center transition-opacity duration-200"
            :class="isLastBlock || hasChoices ? 'opacity-20 cursor-not-allowed' : 'opacity-60 hover:opacity-100 cursor-pointer'"
            :disabled="isLastBlock || hasChoices"
            @click.stop="!isLastBlock && !hasChoices && nextBlock()"
          >
            <i class="fa-solid fa-chevron-right" style="font-size:0.85rem; color:var(--vn-fg);" />
          </button>
        </div>

        <!-- Bottom decorative lines -->
        <div :style="{ height:'1px', background:'linear-gradient(to right, transparent, rgba(212,197,160,0.2), transparent)' }" />
        <div :style="{ height:'2px', marginTop:'1px', background:'linear-gradient(to right, transparent, rgba(212,197,160,0.3), transparent)' }" />

        <!-- Block counter -->
        <div class="absolute bottom-1 right-3" style="font-size:10px; color:var(--vn-muted); font-family:monospace; opacity:0.4;">
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
const blacktextRef = ref<HTMLParagraphElement | null>(null);
const isManualScroll = ref(false);

const displayedText = ref('');
const isTyping = ref(false);
const isBlacktextVisible = ref(false);
let typingTimer: ReturnType<typeof setTimeout> | null = null;

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
    case 'blacktext':
      return 'rgba(212,197,160,0.9)';
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
  (block) => {
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
      // 黑屏文字：等待过渡动画完成后淡入文字
      if (block.type === 'blacktext') {
        setTimeout(() => {
          isBlacktextVisible.value = true;
        }, 100);
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

    // 黑屏文字：等待过渡动画完成后开始打字
    if (block.type === 'blacktext') {
      setTimeout(() => {
        isBlacktextVisible.value = true;
        typingTimer = setTimeout(typeNext, charDelay);
      }, 100);
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
  () => [store.settings.autoPlay, isTyping.value, hasChoices.value, isLastBlock.value, store.currentDialogueIndex] as const,
  ([autoPlay, typing, choices, last]) => {
    if (!autoPlay || typing || choices || last) return;
    const delay = Math.max(500, 5000 - store.settings.autoPlaySpeed * 400);
    const timer = setTimeout(nextBlock, delay);
    onScopeDispose(() => clearTimeout(timer));
  },
);

function handleTextScroll() {
  isManualScroll.value = true;
  setTimeout(() => { isManualScroll.value = false; }, 3000);
}

function handleClickText() {
  // 黑屏文字块：点击直接进入下一个
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
</style>
