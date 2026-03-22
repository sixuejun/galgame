<template>
  <div class="absolute inset-0" style="overflow: hidden; min-height: 0">
    <!-- Layer 1: 背景层 - 大气背景 + 背景图 -->
    <div class="absolute inset-0" style="z-index: 1">
      <!-- 默认大气背景 -->
      <div
        v-if="!currentBackgroundImage"
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

      <!-- 背景图 -->
      <Transition name="fade">
        <div
          v-if="currentBackgroundImage"
          class="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          :style="{ backgroundImage: `url(${currentBackgroundImage})` }"
        />
      </Transition>
    </div>

    <!-- Layer 2: 立绘层 -->
    <Transition name="fade">
      <div
        v-if="currentSpriteImage && !currentCgImage"
        class="pointer-events-none absolute inset-0 flex items-end justify-center"
        style="z-index: 2"
      >
        <img :src="currentSpriteImage" alt="角色立绘" class="h-full w-auto object-contain" />
      </div>
    </Transition>

    <!-- Layer 3: 效果层（暗角、噪点等） -->
    <div class="pointer-events-none absolute inset-0" style="z-index: 3">
      <!-- 暗角效果 -->
      <div
        class="absolute inset-0"
        :style="{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(42,36,32,0.7) 100%)' }"
      />
      <!-- 噪点效果 -->
      <div class="absolute inset-0" style="opacity: 0.04" :style="{ backgroundImage: noiseDataUri }" />
    </div>

    <!-- Layer 4: CG层（生成的图片和CG都在这一层，展示时隐藏背景和立绘） -->
    <Transition name="fade">
      <div
        v-if="currentCgImage"
        class="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style="z-index: 4"
        :style="{ backgroundImage: `url(${currentCgImage})` }"
      />
    </Transition>

    <!-- Layer 5: 弹幕层 -->
    <div
      v-if="store.settings.danmakuEnabled"
      class="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      :style="{ height: danmakuHeight, zIndex: 5 }"
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

    <!-- Layer 6: UI层（对话框等UI元素在这里，由父组件渲染） -->
  </div>
</template>

<script setup lang="ts">
import { useVNStore } from './store';

const store = useVNStore();

const noiseDataUri = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulance type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

const danmakuHeight = computed(() => {
  const m = store.settings.danmakuDisplay;
  return m === 'full' ? '100%' : m === 'half' ? '50%' : '33%';
});

// 当前显示的资源
const currentBackgroundImage = computed(() => {
  return store.currentBlock?.sceneImageUrl || store.stageBackgroundImage;
});

const currentSpriteImage = computed(() => {
  return store.currentBlock?.spriteImageUrl;
});

const currentCgImage = computed(() => {
  return store.currentBlock?.cgImageUrl || store.stageCgImage;
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
