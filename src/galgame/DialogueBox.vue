<template>
  <div v-if="currentLine" class="relative w-full" @click="handleClickText">
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
          <!-- User avatar (conditional) -->
          <div
            v-if="layoutMode === 'withAvatar'"
            class="flex-shrink-0 w-20 md:w-24 p-3 flex items-start justify-center column-rule"
          >
            <div class="w-14 h-14 md:w-18 md:h-18 border overflow-hidden" :style="{ borderColor:'rgba(90,79,64,0.4)', background:'rgba(74,64,53,0.3)' }">
              <img
                :src="store.userCharacter.avatarUrl"
                :alt="store.userCharacter.name"
                class="w-full h-full object-cover"
                style="filter: sepia(0.4) contrast(0.85);"
              />
            </div>
          </div>

          <!-- Prev arrow -->
          <button
            class="flex-shrink-0 w-8 flex items-center justify-center transition-opacity duration-200"
            :class="isFirstLine ? 'opacity-20 cursor-not-allowed' : 'opacity-60 hover:opacity-100 cursor-pointer'"
            :style="{ ':hover': { background:'rgba(212,197,160,0.05)' } }"
            :disabled="isFirstLine"
            @click.stop="!isFirstLine && prevLine()"
          >
            <i class="fa-solid fa-chevron-left" style="font-size:0.85rem; color:var(--vn-fg);" />
          </button>

          <!-- Text area -->
          <div class="flex-1 py-4 px-3 md:px-5 min-w-0">
            <!-- Speaker name -->
            <div v-if="currentLine.speaker" class="mb-2 flex items-center gap-2">
              <span style="color:var(--rust); font-weight:bold; font-size:0.875rem; letter-spacing:0.1em;">
                {{ currentLine.speaker }}
              </span>
              <div class="flex-1" :style="{ height:'1px', background:'linear-gradient(to right, rgba(139,69,19,0.3), transparent)' }" />
            </div>

            <!-- Narration indicator -->
            <div v-if="currentLine.isNarration && !currentLine.speaker" class="mb-2 flex items-center gap-2">
              <div style="width:8px; height:8px; background:rgba(139,69,19,0.4); transform:rotate(45deg);" />
              <div class="flex-1" :style="{ height:'1px', background:'linear-gradient(to right, rgba(212,197,160,0.1), transparent)' }" />
            </div>

            <!-- Text content -->
            <div ref="textRef" class="max-h-28 md:max-h-36 overflow-y-auto no-scrollbar" @scroll="handleTextScroll">
              <p
                class="text-sm md:text-base leading-relaxed tracking-wide"
                :style="{
                  color: currentLine.isNarration ? 'rgba(212,197,160,0.7)' : 'rgba(212,197,160,0.9)',
                  fontStyle: currentLine.isNarration ? 'italic' : 'normal',
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
            class="flex-shrink-0 w-8 flex items-center justify-center transition-opacity duration-200"
            :class="isLastLine || hasChoices ? 'opacity-20 cursor-not-allowed' : 'opacity-60 hover:opacity-100 cursor-pointer'"
            :disabled="isLastLine || hasChoices"
            @click.stop="!isLastLine && !hasChoices && nextLine()"
          >
            <i class="fa-solid fa-chevron-right" style="font-size:0.85rem; color:var(--vn-fg);" />
          </button>
        </div>

        <!-- Bottom decorative lines -->
        <div :style="{ height:'1px', background:'linear-gradient(to right, transparent, rgba(212,197,160,0.2), transparent)' }" />
        <div :style="{ height:'2px', marginTop:'1px', background:'linear-gradient(to right, transparent, rgba(212,197,160,0.3), transparent)' }" />

        <!-- Line counter -->
        <div class="absolute bottom-1 right-3" style="font-size:10px; color:var(--vn-muted); font-family:monospace; opacity:0.4;">
          {{ currentLineIndex + 1 }}/{{ dialogueLines.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVNStore, type DialogueLine } from './store';

const props = defineProps<{
  dialogueLines: DialogueLine[];
  choices: { choiceId: string; text: string; isCustomInput?: boolean }[];
  duringStreaming: boolean;
}>();

const store = useVNStore();
const textRef = ref<HTMLDivElement | null>(null);
const isManualScroll = ref(false);

const currentLineIndex = ref(0);
const displayedText = ref('');
const isTyping = ref(false);
let typingTimer: ReturnType<typeof setTimeout> | null = null;

const currentLine = computed(() => props.dialogueLines[currentLineIndex.value]);
const isFirstLine = computed(() => currentLineIndex.value === 0);
const isLastLine = computed(() => currentLineIndex.value === props.dialogueLines.length - 1);
const hasChoices = computed(() => props.choices.length > 0);
const layoutMode = computed(() =>
  store.userCharacter.showSprite && store.userCharacter.avatarUrl ? 'withAvatar' : 'normal',
);

function prevLine() {
  if (currentLineIndex.value > 0) {
    currentLineIndex.value--;
  }
}
function nextLine() {
  if (currentLineIndex.value < props.dialogueLines.length - 1) {
    currentLineIndex.value++;
  }
}

watch(
  () => props.dialogueLines.length,
  (newLen) => {
    if (props.duringStreaming && newLen > 0) {
      currentLineIndex.value = newLen - 1;
    }
  },
);

watch(
  currentLine,
  (line) => {
    if (!line) return;
    if (typingTimer) clearTimeout(typingTimer);

    displayedText.value = '';
    isTyping.value = true;

    const fullText = line.text;
    const charDelay = store.settings.textSpeed >= 10 ? 0 : Math.max(10, 120 - store.settings.textSpeed * 12);
    let charIndex = 0;

    if (charDelay === 0) {
      displayedText.value = fullText;
      isTyping.value = false;
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
    typingTimer = setTimeout(typeNext, charDelay);
  },
  { immediate: true },
);

watch(displayedText, () => {
  if (!isManualScroll.value && textRef.value) {
    textRef.value.scrollTop = textRef.value.scrollHeight;
  }
});

watch(
  () => [store.settings.autoPlay, isTyping.value, hasChoices.value, isLastLine.value, currentLineIndex.value] as const,
  ([autoPlay, typing, choices, last]) => {
    if (!autoPlay || typing || choices || last) return;
    const delay = Math.max(500, 5000 - store.settings.autoPlaySpeed * 400);
    const timer = setTimeout(nextLine, delay);
    onScopeDispose(() => clearTimeout(timer));
  },
);

function handleTextScroll() {
  isManualScroll.value = true;
  setTimeout(() => { isManualScroll.value = false; }, 3000);
}

function handleClickText() {
  if (isTyping.value) {
    if (typingTimer) clearTimeout(typingTimer);
    if (currentLine.value) {
      displayedText.value = currentLine.value.text;
      isTyping.value = false;
    }
  } else if (!hasChoices.value && !isLastLine.value) {
    nextLine();
  }
}

onUnmounted(() => {
  if (typingTimer) clearTimeout(typingTimer);
});
</script>
