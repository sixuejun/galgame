<template>
  <div v-if="choices.length > 0" class="absolute inset-0" style="z-index: 30" @click="handleBackdropClick">
    <!-- Backdrop -->
    <div class="absolute inset-0" style="background: rgba(42, 36, 32, 0.3)" />

    <!-- Choice list -->
    <div class="absolute left-1/2 -translate-x-1/2 w-full max-w-lg px-4" style="bottom: 11rem" @click.stop>
      <div class="flex flex-col gap-2">
        <!-- Board Game Entry (always visible) -->
        <button
          class="relative w-full text-left border transition-all duration-200 cursor-pointer"
          :style="{
            borderColor: 'rgba(139,69,19,0.5)',
            background: 'rgba(42,36,32,0.85)',
            opacity: store.choiceLocked ? 0.5 : 1,
            pointerEvents: store.choiceLocked ? 'none' : 'auto',
            borderRadius: '2px',
          }"
          :disabled="store.choiceLocked"
          @click.stop="handleBoardGameClick"
        >
          <div
            :style="{
              height: '1px',
              background: 'linear-gradient(to right, transparent, rgba(196,162,101,0.3), transparent)',
            }"
          />
          <div class="p-3 flex items-center gap-3">
            <i class="fa-solid fa-dice-d6" style="color: var(--stain); font-size: 0.875rem" />
            <span class="text-sm" style="color: rgba(196, 162, 101, 0.9); font-weight: 500">投个骰子</span>
            <span style="font-size: 9px; color: rgba(139, 125, 107, 0.5); margin-left: auto; font-family: monospace"
              >废土行路</span
            >
          </div>
        </button>

        <!-- Temp options from board game -->
        <template v-if="store.tempOptions.length > 0">
          <div
            style="
              font-size: 9px;
              color: var(--stain);
              font-family: monospace;
              text-align: center;
              padding: 4px 0;
              letter-spacing: 0.1em;
            "
          >
            ◈ 事件选项 ◈
          </div>
          <button
            v-for="(option, index) in store.tempOptions"
            :key="option.choiceId"
            class="relative w-full text-left border transition-all duration-200 cursor-pointer"
            :style="{
              borderColor: isSelected(option.choiceId) ? 'var(--rust)' : 'rgba(196,162,101,0.6)',
              background: isSelected(option.choiceId) ? 'var(--vn-choice-selected)' : 'rgba(58,51,44,0.9)',
              opacity: store.choiceLocked ? 0.5 : 1,
              pointerEvents: store.choiceLocked ? 'none' : 'auto',
              borderRadius: '2px',
            }"
            :disabled="store.choiceLocked"
            @click.stop="handleSelect(option.choiceId)"
          >
            <div
              :style="{
                height: '1px',
                background: 'linear-gradient(to right, transparent, rgba(196,162,101,0.3), transparent)',
              }"
            />
            <div class="p-3 flex items-center gap-3">
              <span style="color: var(--stain); font-family: monospace; font-size: 0.75rem; opacity: 0.6">
                {{ String.fromCharCode(65 + index) }}.
              </span>
              <span class="text-sm" style="color: rgba(212, 197, 160, 0.9)">{{ option.text }}</span>
            </div>
          </button>
        </template>

        <template v-for="(choice, index) in choices" :key="choice.choiceId">
          <!-- Custom input choice -->
          <div
            v-if="choice.isCustomInput"
            class="relative border transition-all duration-200"
            :style="{
              borderColor: isSelected(choice.choiceId) ? 'var(--rust)' : 'rgba(90,79,64,0.5)',
              background: isSelected(choice.choiceId) ? 'var(--vn-choice-selected)' : 'var(--vn-choice-bg)',
              opacity: store.choiceLocked ? 0.5 : 1,
              pointerEvents: store.choiceLocked ? 'none' : 'auto',
            }"
            @click="handleSelect(choice.choiceId)"
          >
            <div
              :style="{
                height: '1px',
                background: 'linear-gradient(to right, transparent, rgba(212,197,160,0.2), transparent)',
              }"
            />
            <div class="p-3 flex items-start gap-3">
              <span style="color: var(--rust); font-family: monospace; font-size: 0.75rem; opacity: 0.5; padding-top: 2px">
                {{ String.fromCharCode(65 + index) }}.
              </span>
              <textarea
                ref="inputRef"
                :value="store.customInputText"
                placeholder="自由输入...（支持 \n 换行）"
                rows="2"
                class="flex-1 bg-transparent text-sm outline-none resize-none"
                :style="{ color: 'rgba(212,197,160,0.9)', fontFamily: 'serif', minHeight: '2.5rem' }"
                @input="handleCustomInput"
                @keydown.enter.ctrl="handleCustomSubmit"
                @keydown.enter.exact.prevent
                @click.stop="!isSelected(choice.choiceId) && handleSelect(choice.choiceId)"
              />
              <button
                v-if="store.customInputText.trim()"
                class="cursor-pointer transition-colors mt-1"
                style="color: var(--rust)"
                @click.stop="handleCustomSubmit"
              >
                <i class="fa-solid fa-paper-plane" style="font-size: 0.875rem" />
              </button>
            </div>
          </div>

          <!-- Regular choice -->
          <button
            v-else
            class="relative w-full text-left border transition-all duration-200 cursor-pointer"
            :style="{
              borderColor: isSelected(choice.choiceId) ? 'var(--rust)' : 'rgba(90,79,64,0.5)',
              background: isSelected(choice.choiceId) ? 'var(--vn-choice-selected)' : 'var(--vn-choice-bg)',
              opacity: store.choiceLocked ? 0.5 : 1,
              pointerEvents: store.choiceLocked ? 'none' : 'auto',
              borderRadius: '2px',
            }"
            :disabled="store.choiceLocked"
            @click.stop="handleSelect(choice.choiceId)"
          >
            <div
              :style="{
                height: '1px',
                background: 'linear-gradient(to right, transparent, rgba(212,197,160,0.2), transparent)',
              }"
            />
            <div class="p-3 flex items-center gap-3">
              <span style="color: var(--rust); font-family: monospace; font-size: 0.75rem; opacity: 0.5">
                {{ String.fromCharCode(65 + index) }}.
              </span>
              <span class="text-sm" style="color: rgba(212, 197, 160, 0.9)">{{ choice.text }}</span>
            </div>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVNStore, type Choice } from './store';

const props = defineProps<{
  choices: Choice[];
  messageId: number;
}>();

const emit = defineEmits<{
  choiceSubmitted: [choiceId: string, text: string];
}>();

const store = useVNStore();
const inputRef = ref<HTMLInputElement | null>(null);
let submitTimeout: ReturnType<typeof setTimeout> | null = null;

function isSelected(id: string) {
  return store.selectedChoiceId === id;
}

function handleBoardGameClick() {
  if (store.choiceLocked) return;
  store.activeModuleId = 'board_game';
  store.setOverlay('gameplay');
}

function handleSelect(choiceId: string) {
  if (store.choiceLocked) return;

  if (store.selectedChoiceId === choiceId) {
    store.selectChoice(null);
    return;
  }

  store.selectChoice(choiceId);

  const choice = props.choices.find(c => c.choiceId === choiceId);
  if (choice && !choice.isCustomInput) {
    submitTimeout = setTimeout(() => {
      store.lockChoice();
      const text = choice.text;
      setTimeout(() => {
        emit('choiceSubmitted', choiceId, text);
        store.clearChoices();
      }, 300);
    }, 200);
  }
}

function handleCustomInput(e: Event) {
  const target = e.target as HTMLInputElement;
  store.customInputText = target.value;
  if (!isSelected('custom')) store.selectChoice('custom');
}

function handleCustomSubmit() {
  if (!store.customInputText.trim() || store.choiceLocked) return;
  store.lockChoice();
  // 支持 \n 转义为真实换行
  const text = store.customInputText.replace(/\\n/g, '\n').trim();
  setTimeout(() => {
    emit('choiceSubmitted', 'custom', text);
    store.clearChoices();
  }, 300);
}

function handleBackdropClick() {
  if (store.selectedChoiceId && !store.choiceLocked) {
    if (submitTimeout) clearTimeout(submitTimeout);
    store.selectChoice(null);
  }
}

onUnmounted(() => {
  if (submitTimeout) clearTimeout(submitTimeout);
});
</script>
