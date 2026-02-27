<template>
  <button
    class="flex items-center gap-2 px-3 py-1.5 border backdrop-blur-sm transition-all duration-200 cursor-pointer group"
    :style="{
      borderColor: 'rgba(90,79,64,0.5)',
      background: 'var(--vn-panel-bg)',
      color: 'rgba(212,197,160,0.8)',
      borderRadius: '2px',
    }"
    @click="$emit('click')"
  >
    <span v-if="iconSide === 'left'" style="color:rgba(139,69,19,0.7);">
      <i :class="'fa-solid ' + icon" style="font-size:0.8rem;" />
    </span>
    <span class="text-xs tracking-wider whitespace-nowrap" style="font-family:serif;">{{ label }}</span>
    <span v-if="iconSide === 'right'" style="color:rgba(139,69,19,0.7);">
      <i :class="'fa-solid ' + icon" style="font-size:0.8rem;" />
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  label: string;
  iconSide: 'left' | 'right';
}>();

defineEmits<{
  click: [];
}>();
</script>
