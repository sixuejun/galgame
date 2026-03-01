<template>
  <div class="absolute inset-0 overflow-hidden">
    <!-- Layer 1: Atmospheric background -->
    <div
      class="absolute inset-0"
      :style="{ background: 'linear-gradient(to bottom, rgba(42,36,32,0.8), rgba(74,64,53,0.6), rgba(42,36,32,0.9))' }"
    >
      <div
        class="absolute inset-0"
        :style="{ background: 'linear-gradient(to right, rgba(42,36,32,0.4), transparent, rgba(42,36,32,0.4))' }"
      />
      <div
        class="pointer-events-none absolute select-none"
        style="
          top: 15%;
          left: 8%;
          font-size: 3.5rem;
          font-weight: 900;
          color: rgba(212, 197, 160, 0.04);
          transform: rotate(-8deg);
          white-space: nowrap;
          font-family: serif;
        "
      >
        EXTRA EDITION
      </div>
      <div
        class="pointer-events-none absolute select-none"
        style="
          top: 35%;
          right: 5%;
          font-size: 2.2rem;
          font-weight: 700;
          color: rgba(212, 197, 160, 0.03);
          transform: rotate(3deg);
          white-space: nowrap;
          font-family: serif;
        "
      >
        THE LAST GAZETTE
      </div>
      <div
        class="pointer-events-none absolute select-none"
        style="
          bottom: 30%;
          left: 15%;
          font-size: 2.8rem;
          font-weight: 900;
          color: rgba(212, 197, 160, 0.04);
          transform: rotate(-3deg);
          white-space: nowrap;
          font-family: serif;
        "
      >
        末日旧闻
      </div>
      <div
        class="pointer-events-none absolute select-none"
        style="
          top: 55%;
          right: 20%;
          font-size: 1.6rem;
          color: rgba(212, 197, 160, 0.03);
          transform: rotate(5deg);
          white-space: nowrap;
          font-family: serif;
        "
      >
        第壹百零七期
      </div>
    </div>

    <!-- Layer 1.5: 背景图（生图事件返回） -->
    <div
      v-if="store.stageBackgroundImage"
      class="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url(${store.stageBackgroundImage})`, zIndex: 1 }"
    />

    <!-- Layer 1.6: CG 图（覆盖在背景上，展示方式与背景相同） -->
    <div
      v-if="store.stageCgImage"
      class="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url(${store.stageCgImage})`, zIndex: 2 }"
    />

    <!-- Layer 2: Danmaku -->
    <div
      v-if="store.settings.danmakuEnabled"
      class="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      :style="{ height: danmakuHeight, zIndex: 2 }"
    >
      <div
        v-for="item in store.danmakuItems"
        :key="item.id"
        class="danmaku-track"
        :style="{ top: item.y + '%', animationDuration: 15 / item.speed + 's' }"
        @animationend="store.removeDanmaku(item.id)"
      >
        {{ item.text }}
      </div>
    </div>

    <!-- Layer 3: Vignette -->
    <div class="pointer-events-none absolute inset-0" style="z-index: 3">
      <div
        class="absolute inset-0"
        :style="{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(42,36,32,0.7) 100%)' }"
      />
    </div>

    <!-- Layer 4: Noise grain -->
    <div
      class="pointer-events-none absolute inset-0"
      style="z-index: 4; opacity: 0.04"
      :style="{ backgroundImage: noiseDataUri }"
    />
  </div>
</template>

<script setup lang="ts">
import { useVNStore } from './store';
const store = useVNStore();

const noiseDataUri = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

const danmakuHeight = computed(() => {
  const m = store.settings.danmakuDisplay;
  return m === 'full' ? '100%' : m === 'half' ? '50%' : '33%';
});
</script>
