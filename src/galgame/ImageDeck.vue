<template>
  <div
    v-if="store.imageCardQueue.length > 0"
    class="image-deck-container"
    @mouseenter="expanded = true"
    @mouseleave="expanded = false"
  >
    <!-- 收起状态：叠卡角 -->
    <div v-if="!expanded" class="deck-collapsed">
      <div
        v-for="(card, index) in visibleCards"
        :key="card.id"
        class="deck-card-collapsed"
        :style="{
          transform: `translateY(${index * 3}px) translateX(${index * 2}px) rotate(${index * -2}deg)`,
          zIndex: index,
        }"
      >
        <img :src="card.imageData" alt="Image card" class="card-thumbnail" />
      </div>
      <div class="deck-count">{{ store.imageCardQueue.length }}</div>
    </div>

    <!-- 展开状态：扇形轮盘 -->
    <div v-else class="deck-expanded">
      <div
        v-for="(card, index) in store.imageCardQueue"
        :key="card.id"
        class="deck-card-expanded"
        :style="getExpandedCardStyle(index)"
        @click="handleCardClick(card.id)"
      >
        <img :src="card.imageData" alt="Image card" class="card-image" />
        <div class="card-type-badge" :class="'badge-' + card.type">
          {{ card.type === 'background' ? 'BG' : 'CG' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVNStore } from './store';

const store = useVNStore();
const expanded = ref(false);

const visibleCards = computed(() => {
  return store.imageCardQueue.slice(-3);
});

function getExpandedCardStyle(index: number) {
  const total = store.imageCardQueue.length;
  const angleSpan = 60; // 扇形总角度
  const startAngle = -30; // 起始角度
  const angle = startAngle + (angleSpan / (total - 1 || 1)) * index;
  const radius = 180; // 扇形半径

  const x = Math.sin((angle * Math.PI) / 180) * radius;
  const y = -Math.cos((angle * Math.PI) / 180) * radius;

  return {
    transform: `translate(${x}px, ${y}px) rotate(${angle}deg)`,
    zIndex: total - index,
  };
}

function handleCardClick(cardId: string) {
  store.switchToImageCard(cardId);
  expanded.value = false;
}
</script>

<style scoped>
.image-deck-container {
  position: fixed;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 30;
  pointer-events: auto;
}

/* 收起状态 */
.deck-collapsed {
  position: relative;
  width: 60px;
  height: 80px;
  cursor: pointer;
}

.deck-card-collapsed {
  position: absolute;
  width: 60px;
  height: 80px;
  border: 2px solid rgba(139, 69, 19, 0.6);
  border-radius: 4px;
  overflow: hidden;
  background: rgba(42, 36, 32, 0.9);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s ease;
}

.card-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
}

.deck-count {
  position: absolute;
  bottom: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--rust);
  color: var(--vn-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  border: 2px solid var(--vn-bg);
  z-index: 100;
}

/* 展开状态 */
.deck-expanded {
  position: relative;
  width: 100px;
  height: 120px;
}

.deck-card-expanded {
  position: absolute;
  width: 100px;
  height: 140px;
  border: 2px solid rgba(139, 69, 19, 0.8);
  border-radius: 6px;
  overflow: hidden;
  background: rgba(42, 36, 32, 0.95);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: bottom center;
}

.deck-card-expanded:hover {
  transform: scale(1.1) !important;
  border-color: var(--rust);
  box-shadow: 0 6px 16px rgba(139, 69, 19, 0.4);
  z-index: 1000 !important;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-type-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 9px;
  font-weight: bold;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  border: 1px solid;
}

.badge-background {
  background: rgba(74, 64, 53, 0.9);
  color: rgba(212, 197, 160, 0.9);
  border-color: rgba(139, 69, 19, 0.6);
}

.badge-cg {
  background: rgba(139, 69, 19, 0.9);
  color: rgba(255, 248, 220, 0.95);
  border-color: rgba(212, 197, 160, 0.6);
}
</style>
