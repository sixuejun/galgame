<template>
  <!-- Left top menu -->
  <div ref="leftRef" class="absolute" style="top:1rem; left:1rem; z-index:40;">
    <div class="flex flex-col gap-1.5">
      <template v-if="!store.leftMenuExpanded">
        <button class="w-8 h-8 flex items-center justify-center border backdrop-blur-sm transition-all duration-200 cursor-pointer" :style="btnIconStyle" @click="store.toggleLeftMenu()">
          <i class="fa-solid fa-user" style="font-size:0.875rem;" />
        </button>
      </template>
      <template v-else>
        <div class="flex flex-col gap-1.5 animate-fade-in-up">
          <CapsuleButton icon="fa-user" label="角色" icon-side="left" @click="store.setOverlay('character')" />
          <CapsuleButton icon="fa-gamepad" label="玩法" icon-side="left" @click="store.setOverlay('gameplay')" />
        </div>
      </template>
    </div>
  </div>

  <!-- Right top menu -->
  <div ref="rightRef" class="absolute" style="top:1rem; right:1rem; z-index:40;">
    <div class="flex flex-col gap-1.5 items-end">
      <template v-if="!store.rightMenuExpanded">
        <button class="w-8 h-8 flex items-center justify-center border backdrop-blur-sm transition-all duration-200 cursor-pointer" :style="btnIconStyle" @click="store.toggleRightMenu()">
          <i class="fa-solid fa-gear" style="font-size:0.875rem;" />
        </button>
      </template>
      <template v-else>
        <div class="flex flex-col gap-1.5 items-end animate-fade-in-up">
          <CapsuleButton icon="fa-gear" label="设置" icon-side="right" @click="store.setOverlay('settings')" />
          <CapsuleButton icon="fa-expand" label="全屏" icon-side="right" @click="$emit('fullscreen')" />
          <CapsuleButton icon="fa-book-open" label="历史" icon-side="right" @click="store.setOverlay('history')" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import CapsuleButton from './CapsuleButton.vue';
import { useVNStore } from './store';

defineEmits<{ fullscreen: [] }>();
const store = useVNStore();
const leftRef = ref<HTMLDivElement | null>(null);
const rightRef = ref<HTMLDivElement | null>(null);

const btnIconStyle = {
  borderColor: 'rgba(90,79,64,0.5)', background: 'var(--vn-panel-bg)',
  color: 'rgba(139,69,19,0.7)', borderRadius: '2px',
};

function handleClickOutside(e: MouseEvent) {
  if (store.leftMenuExpanded && leftRef.value && !leftRef.value.contains(e.target as Node)) store.toggleLeftMenu();
  if (store.rightMenuExpanded && rightRef.value && !rightRef.value.contains(e.target as Node)) store.toggleRightMenu();
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside));
</script>
