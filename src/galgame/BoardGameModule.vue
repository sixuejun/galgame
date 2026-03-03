<template>
  <div class="bg-root" @click.self="() => {}">
    <!-- ══ Layout ══════════════════════════════════════════════ -->
    <div class="bg-layout">

      <!-- Left: map area (viewport + pan arrows) -->
      <div class="bg-map-area">
        <div
          ref="mapViewportRef"
          class="bg-map-viewport"
        >
        <div
          class="bg-map-canvas"
          :style="{ width: bgStore.mapConfig.width + 'px', height: bgStore.mapConfig.height + 'px' }"
        >
          <!-- SVG edges -->
          <svg
            class="bg-edges-svg"
            :width="bgStore.mapConfig.width"
            :height="bgStore.mapConfig.height"
          >
            <line
              v-for="edge in edges"
              :key="edge.id"
              :x1="edge.x1" :y1="edge.y1"
              :x2="edge.x2" :y2="edge.y2"
              class="bg-edge"
            />
            <!-- walkable edge highlight -->
            <line
              v-for="edge in walkableEdges"
              :key="'wk-' + edge.id"
              :x1="edge.x1" :y1="edge.y1"
              :x2="edge.x2" :y2="edge.y2"
              class="bg-edge-walkable"
            />
          </svg>

          <!-- Nodes -->
          <div
            v-for="node in bgStore.mapConfig.nodes"
            :key="node.id"
            class="bg-node"
            :class="[
              `bg-node-${node.type}`,
              {
                'bg-node-current': node.id === bgStore.currentNodeId,
                'bg-node-walkable': bgStore.walkableNodeIds.includes(node.id),
                'bg-node-visited': bgStore.visitedNodeIds.has(node.id) && node.id !== bgStore.currentNodeId,
              },
            ]"
            :style="nodeStyle(node)"
            :title="nodeLabel(node)"
            @click="handleNodeClick(node.id)"
          >
            <i v-if="nodeIcon(node.type)" :class="nodeIcon(node.type)" class="bg-node-icon" />
          </div>

          <!-- Player token -->
          <div ref="playerTokenRef" class="bg-player-token">
            <i class="fa-solid fa-person-walking" />
          </div>
        </div>
      </div>

      <!-- Right: sidebar -->
      <aside class="bg-sidebar">
        <!-- Phase indicator -->
        <div class="bg-phase-badge" :class="`bg-phase-${bgStore.phase}`">
          <span class="bg-phase-dot" />
          <span>{{ phaseLabel }}</span>
          <span v-if="bgStore.phase === 'choosingPath'" class="bg-steps-badge">
            {{ bgStore.stepsRemaining }} 步
          </span>
        </div>

        <!-- Player Stats -->
        <div class="bg-stats-panel">
          <div class="bg-stat-row">
            <span class="bg-stat-label"><i class="fa-solid fa-heart" /> 生命</span>
            <div class="bg-stat-track">
              <div
                class="bg-stat-fill bg-stat-hp"
                :style="{ width: (bgStore.stats.hp / bgStore.stats.maxHp * 100) + '%' }"
              />
            </div>
            <span class="bg-stat-val">{{ bgStore.stats.hp }}/{{ bgStore.stats.maxHp }}</span>
          </div>
          <div class="bg-stat-row">
            <span class="bg-stat-label"><i class="fa-solid fa-brain" /> 精神</span>
            <div class="bg-stat-track">
              <div
                class="bg-stat-fill bg-stat-san"
                :style="{ width: (bgStore.stats.sanity / bgStore.stats.maxSanity * 100) + '%' }"
              />
            </div>
            <span class="bg-stat-val">{{ bgStore.stats.sanity }}/{{ bgStore.stats.maxSanity }}</span>
          </div>
          <div class="bg-stat-luck">
            <i class="fa-solid fa-clover" style="color:var(--vn-success);font-size:0.65rem;" />
            <span>运气 {{ bgStore.stats.luck }}</span>
            <span class="bg-steps-total">已行 {{ bgStore.totalSteps }} 格</span>
          </div>
        </div>

        <!-- Dice -->
        <div class="bg-dice-panel">
          <div class="bg-dice-face" :class="{ 'bg-dice-rolling': phase === 'rolling' }">
            {{ diceDisplay }}
          </div>
          <button
            class="bg-roll-btn"
            :disabled="!bgStore.canRoll"
            @click="handleRoll"
          >
            <i class="fa-solid fa-dice" style="margin-right:5px;" />
            {{ phase === 'rolling' ? '掷骰中…' : '掷骰子' }}
          </button>
        </div>

        <!-- Seed control -->
        <div class="bg-seed-panel">
          <div class="bg-seed-title">
            <i class="fa-solid fa-seedling" style="font-size:0.6rem;" />
            地图种子
          </div>
          <div class="bg-seed-row">
            <input
              v-model.number="seedInput"
              class="bg-seed-input"
              type="number"
              placeholder="种子数字"
              @keydown.enter="refreshMap"
            />
            <button class="bg-seed-btn" @click="refreshMap" title="用当前种子重新生成地图">
              <i class="fa-solid fa-rotate" />
            </button>
            <button class="bg-seed-btn" @click="randomSeed" title="随机种子">
              <i class="fa-solid fa-shuffle" />
            </button>
          </div>
          <div class="bg-seed-info">
            {{ bgStore.mapConfig.nodes.length }} 个格子
          </div>
        </div>

        <!-- Game log -->
        <div class="bg-log-panel">
          <div class="bg-log-title">
            <i class="fa-solid fa-scroll" style="font-size:0.6rem;" />
            行路记录
          </div>
          <div ref="logScrollRef" class="bg-log-body">
            <div
              v-for="(entry, i) in bgStore.gameLog"
              :key="i"
              class="bg-log-entry"
              :class="{ 'bg-log-event': entry.startsWith('⚡'), 'bg-log-transfer': entry.startsWith('⊙'), 'bg-log-indent': entry.startsWith('  └') }"
            >
              {{ entry }}
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- ══ Event Overlay ══════════════════════════════════════ -->
    <Transition name="bg-overlay-fade">
      <div
        v-if="bgStore.phase === 'event' || bgStore.phase === 'resolving'"
        class="bg-event-overlay"
      >
        <div class="bg-event-panel">
          <!-- Event header -->
          <div class="bg-event-header">
            <div class="bg-event-type-badge" :class="`bg-badge-${bgStore.currentEvent?.nodeType}`">
              {{ nodeTypeLabel(bgStore.currentEvent?.nodeType) }}
            </div>
            <div class="bg-event-title">{{ bgStore.currentEvent?.title }}</div>
            <div class="bg-event-flavor">{{ bgStore.currentEvent?.flavor }}</div>
          </div>

          <!-- Phase: event → show card selection -->
          <div v-if="bgStore.phase === 'event'" class="bg-cards-area">
            <div class="bg-cards-hint">· 选择一张命运之牌 ·</div>
            <div class="bg-cards-row" :class="`bg-cards-count-${bgStore.currentEvent?.cards.length}`">
              <div
                v-for="(card, idx) in bgStore.currentEvent?.cards"
                :key="card.id"
                class="bg-tarot-wrapper"
                :style="tarotRotation(idx, bgStore.currentEvent?.cards.length ?? 1)"
                @click="handleCardClick(card.id)"
              >
                <div
                  class="bg-tarot-inner"
                  :class="{ 'bg-tarot-flipped': flippedCards.has(card.id) }"
                >
                  <!-- Back face -->
                  <div class="bg-tarot-face bg-tarot-back">
                    <div class="bg-tarot-back-deco">
                      <div class="bg-tarot-back-border" />
                      <div class="bg-tarot-back-center">
                        <div class="bg-tarot-back-symbol">✦</div>
                        <div class="bg-tarot-back-lines">
                          <div class="bg-tarot-back-line" />
                          <div class="bg-tarot-back-line" />
                          <div class="bg-tarot-back-line" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Front face -->
                  <div class="bg-tarot-face bg-tarot-front">
                    <div class="bg-tarot-front-content">
                      <div class="bg-tarot-front-title">{{ card.title }}</div>
                      <div class="bg-tarot-front-divider" />
                      <div class="bg-tarot-front-desc">{{ card.description }}</div>
                      <div class="bg-tarot-front-confirm">
                        <span>点击确认选择</span>
                        <i class="fa-solid fa-hand-pointer" style="font-size:0.6rem;" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Phase: resolving → show result -->
          <div v-else-if="bgStore.phase === 'resolving'" class="bg-resolve-area">
            <div class="bg-resolve-card-title">{{ bgStore.selectedCard?.title }}</div>
            <div class="bg-resolve-message">{{ bgStore.resolveMessage }}</div>
            <div class="bg-resolve-effects">
              <span
                v-if="bgStore.selectedCard?.effect.hp"
                class="bg-effect-chip"
                :class="(bgStore.selectedCard.effect.hp ?? 0) > 0 ? 'bg-effect-pos' : 'bg-effect-neg'"
              >
                ❤ {{ (bgStore.selectedCard.effect.hp ?? 0) > 0 ? '+' : '' }}{{ bgStore.selectedCard.effect.hp }}
              </span>
              <span
                v-if="bgStore.selectedCard?.effect.sanity"
                class="bg-effect-chip"
                :class="(bgStore.selectedCard.effect.sanity ?? 0) > 0 ? 'bg-effect-pos' : 'bg-effect-neg'"
              >
                🧠 {{ (bgStore.selectedCard.effect.sanity ?? 0) > 0 ? '+' : '' }}{{ bgStore.selectedCard.effect.sanity }}
              </span>
              <span
                v-if="bgStore.selectedCard?.effect.luck"
                class="bg-effect-chip"
                :class="(bgStore.selectedCard.effect.luck ?? 0) > 0 ? 'bg-effect-pos' : 'bg-effect-neg'"
              >
                🍀 {{ (bgStore.selectedCard.effect.luck ?? 0) > 0 ? '+' : '' }}{{ bgStore.selectedCard.effect.luck }}
              </span>
              <span v-if="bgStore.selectedCard?.effect.transfer" class="bg-effect-chip bg-effect-transfer">
                ⊙ 传送
              </span>
            </div>
            <button class="bg-continue-btn" @click="handleContinue">
              <i class="fa-solid fa-person-walking" style="margin-right:6px;" />
              继续前行
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</div>
</template>

<script setup lang="ts">
import { gsap } from 'gsap'
import { useBoardGameStore } from './boardgame/boardGameStore'
import type { MapNode } from './boardgame/types'

const bgStore = useBoardGameStore()

// ── Constants ──────────────────────────────────────────────────
const NODE_SIZE = 32
const NODE_HALF = NODE_SIZE / 2
const TOKEN_SIZE = 28
const TOKEN_HALF = TOKEN_SIZE / 2

// ── Refs ───────────────────────────────────────────────────────
const playerTokenRef = ref<HTMLElement>()
const mapViewportRef = ref<HTMLElement>()
const logScrollRef = ref<HTMLElement>()
const seedInput = ref(bgStore.seed)
const diceDisplay = ref<string | number>('?')
const phase = computed(() => bgStore.phase)

// ── Tarot card flip state ──────────────────────────────────────
const flippedCards = ref(new Set<string>())

// ── Computed edges ─────────────────────────────────────────────
interface Edge { id: string; x1: number; y1: number; x2: number; y2: number }

const edges = computed<Edge[]>(() => {
  const seen = new Set<string>()
  const result: Edge[] = []
  for (const node of bgStore.mapConfig.nodes) {
    for (const nbId of node.neighbors) {
      const key = [node.id, nbId].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      const nb = bgStore.nodeMap.get(nbId)
      if (!nb) continue
      result.push({ id: key, x1: node.x, y1: node.y, x2: nb.x, y2: nb.y })
    }
  }
  return result
})

const walkableEdges = computed<Edge[]>(() => {
  const cur = bgStore.currentNodeId
  const walkable = new Set(bgStore.walkableNodeIds)
  return edges.value.filter(e => {
    return (e.id.includes(cur) && (walkable.has(e.id.split('|')[0]!) || walkable.has(e.id.split('|')[1]!)))
  })
})

// ── Helper functions ───────────────────────────────────────────
function nodeStyle(node: MapNode) {
  const size = node.type === 'start' ? 38 : node.type === 'empty' ? 24 : 32
  const half = size / 2
  return { left: (node.x - half) + 'px', top: (node.y - half) + 'px', width: size + 'px', height: size + 'px' }
}

function nodeIcon(type: MapNode['type']): string {
  const icons: Record<string, string> = {
    start: 'fa-solid fa-flag-checkered',
    encounter: 'fa-solid fa-skull',
    trap: 'fa-solid fa-triangle-exclamation',
    fortune: 'fa-solid fa-star',
    transfer: 'fa-solid fa-circle-dot',
    empty: '',
  }
  return icons[type] ?? ''
}

function nodeLabel(node: MapNode): string {
  const labels: Record<string, string> = {
    start: '起点', empty: '空地',
    encounter: '遭遇', trap: '陷阱', fortune: '意外之喜', transfer: '传送',
  }
  return labels[node.type] ?? node.type
}

function nodeTypeLabel(type?: string): string {
  const m: Record<string, string> = {
    encounter: '⚔ 遭遇', trap: '⚠ 陷阱', fortune: '✦ 意外之喜', transfer: '⊙ 传送',
  }
  return m[type ?? ''] ?? ''
}

const phaseLabel = computed(() => {
  const labels: Record<string, string> = {
    idle: '等待掷骰', rolling: '掷骰中…',
    choosingPath: '选择路径', event: '事件触发', resolving: '结算中…',
  }
  return labels[bgStore.phase] ?? ''
})

function tarotRotation(idx: number, total: number) {
  const mid = (total - 1) / 2
  const deg = (idx - mid) * 5
  return { transform: `rotate(${deg}deg)` }
}

// ── Player token animation ─────────────────────────────────────
function setTokenPosition(nodeId: string, animate = false, fromNodeId?: string) {
  const newNode = bgStore.nodeMap.get(nodeId)
  if (!newNode || !playerTokenRef.value) return
  const toL = (newNode.x - TOKEN_HALF) + 'px'
  const toT = (newNode.y - TOKEN_HALF) + 'px'

  if (!animate) {
    gsap.set(playerTokenRef.value, { left: toL, top: toT })
    return
  }

  const oldNode = fromNodeId ? bgStore.nodeMap.get(fromNodeId) : null
  const fromL = oldNode ? (oldNode.x - TOKEN_HALF) + 'px' : toL
  const fromT = oldNode ? (oldNode.y - TOKEN_HALF) + 'px' : toT

  gsap.fromTo(
    playerTokenRef.value,
    { left: fromL, top: fromT },
    { left: toL, top: toT, duration: 0.38, ease: 'power2.inOut', onComplete: () => bgStore.onMoveAnimationDone() },
  )
}

watch(
  () => bgStore.currentNodeId,
  (newId, oldId) => {
    setTokenPosition(newId, bgStore.isAnimating, bgStore.isAnimating ? oldId : undefined)
  },
)

onMounted(() => {
  nextTick(() => setTokenPosition(bgStore.currentNodeId))
})

// ── Auto-scroll log ────────────────────────────────────────────
watch(
  () => bgStore.gameLog.length,
  () => nextTick(() => {
    if (logScrollRef.value) logScrollRef.value.scrollTop = logScrollRef.value.scrollHeight
  }),
)

// ── Dice ───────────────────────────────────────────────────────
let diceInterval: ReturnType<typeof setInterval> | null = null

function handleRoll() {
  if (!bgStore.canRoll) return
  bgStore.rollDice()
  diceDisplay.value = '?'

  let count = 0
  diceInterval = setInterval(() => {
    diceDisplay.value = Math.floor(Math.random() * 6) + 1
    count++
    if (count >= 14) {
      clearInterval(diceInterval!)
      diceInterval = null
      diceDisplay.value = bgStore.diceValue
      bgStore.finishRoll()
    }
  }, 75)
}

// ── Node click ─────────────────────────────────────────────────
function handleNodeClick(nodeId: string) {
  if (!bgStore.canChoose) return
  if (!bgStore.walkableNodeIds.includes(nodeId)) return
  bgStore.moveToNode(nodeId)
}

// ── Card interaction ───────────────────────────────────────────
function handleCardClick(cardId: string) {
  if (bgStore.phase !== 'event') return
  if (!flippedCards.value.has(cardId)) {
    // First click: flip to reveal
    flippedCards.value.add(cardId)
  } else {
    // Second click: select this card
    const card = bgStore.currentEvent?.cards.find(c => c.id === cardId)
    if (card) bgStore.selectCard(card)
  }
}

function handleContinue() {
  flippedCards.value.clear()
  bgStore.finishResolve()
}

// ── Seed / map ─────────────────────────────────────────────────
function refreshMap() {
  bgStore.regenerateMap(seedInput.value)
  nextTick(() => setTokenPosition(bgStore.currentNodeId))
}

function randomSeed() {
  seedInput.value = Math.floor(Math.random() * 999999)
  refreshMap()
}

// Sync seedInput when store seed changes (e.g. on initial load)
watch(() => bgStore.seed, s => { seedInput.value = s })
</script>

<style scoped>
/* ── Root layout ──────────────────────────────────────────────── */
.bg-root {
  display: flex;
  flex-direction: column;
  height: calc(80vh - 60px);
  background: var(--vn-bg);
  position: relative;
  overflow: hidden;
}

.bg-layout {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.bg-map-area {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── Map viewport ────────────────────────────────────────────── */
.bg-map-viewport {
  flex: 1;
  overflow: auto;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 38px,
    rgba(90, 79, 64, 0.04) 38px,
    rgba(90, 79, 64, 0.04) 39px
  ),
  repeating-linear-gradient(
    90deg,
    transparent,
    transparent 38px,
    rgba(90, 79, 64, 0.04) 38px,
    rgba(90, 79, 64, 0.04) 39px
  );
}

.bg-map-canvas {
  position: relative;
}

/* ── SVG edges ───────────────────────────────────────────────── */
.bg-edges-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.bg-edge {
  stroke: rgba(90, 79, 64, 0.4);
  stroke-width: 2;
  stroke-linecap: round;
}

.bg-edge-walkable {
  stroke: rgba(196, 162, 101, 0.7);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 6 4;
  animation: bg-dash-flow 1s linear infinite;
}

@keyframes bg-dash-flow {
  to { stroke-dashoffset: -10; }
}

/* ── Nodes ────────────────────────────────────────────────────── */
.bg-node {
  position: absolute;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  border: 1.5px solid rgba(90, 79, 64, 0.5);
  background: rgba(42, 36, 32, 0.85);
  transition: transform 0.15s, box-shadow 0.15s;
  z-index: 2;
}

.bg-node-icon {
  font-size: 0.6rem;
  pointer-events: none;
}

/* Type colours */
.bg-node-start {
  background: rgba(196, 162, 101, 0.25);
  border-color: var(--stain);
  color: var(--stain);
}
.bg-node-empty {
  border-color: rgba(90, 79, 64, 0.35);
  background: rgba(42, 36, 32, 0.6);
}
.bg-node-encounter {
  background: rgba(110, 26, 14, 0.35);
  border-color: rgba(110, 26, 14, 0.7);
  color: #c46060;
}
.bg-node-trap {
  background: rgba(139, 69, 19, 0.35);
  border-color: var(--rust);
  color: var(--rust);
}
.bg-node-fortune {
  background: rgba(74, 103, 65, 0.35);
  border-color: rgba(90, 140, 74, 0.7);
  color: var(--vn-success);
}
.bg-node-transfer {
  background: rgba(62, 84, 112, 0.35);
  border-color: rgba(80, 120, 170, 0.7);
  color: #7ab0d4;
}

/* States */
.bg-node-current {
  border-color: var(--stain) !important;
  box-shadow: 0 0 10px rgba(196, 162, 101, 0.5);
  z-index: 4;
}

.bg-node-walkable {
  cursor: pointer;
  border-color: rgba(196, 162, 101, 0.8) !important;
  box-shadow: 0 0 8px rgba(196, 162, 101, 0.4);
  animation: bg-node-pulse 1.2s ease-in-out infinite;
  z-index: 3;
}

.bg-node-walkable:hover {
  transform: scale(1.2);
  box-shadow: 0 0 14px rgba(196, 162, 101, 0.7);
}

@keyframes bg-node-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(196, 162, 101, 0.3); }
  50% { box-shadow: 0 0 14px rgba(196, 162, 101, 0.6); }
}

.bg-node-visited {
  opacity: 0.45;
}

/* ── Player token ────────────────────────────────────────────── */
.bg-player-token {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--stain);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--ink-black);
  z-index: 10;
  box-shadow: 0 0 12px rgba(196, 162, 101, 0.6), 0 2px 6px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  border: 2px solid rgba(212, 197, 160, 0.7);
}

/* ── Sidebar ─────────────────────────────────────────────────── */
.bg-sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-left: 1px solid rgba(90, 79, 64, 0.3);
  background: rgba(35, 30, 26, 0.5);
  overflow-y: auto;
}

/* Phase badge */
.bg-phase-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 10px;
  font-family: monospace;
  letter-spacing: 0.08em;
  border-bottom: 1px solid rgba(90, 79, 64, 0.2);
  color: var(--vn-muted);
}

.bg-phase-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--vn-muted);
  flex-shrink: 0;
}

.bg-phase-choosingPath .bg-phase-dot { background: var(--stain); animation: bg-dot-pulse 1s infinite; }
.bg-phase-event .bg-phase-dot, .bg-phase-resolving .bg-phase-dot { background: var(--rust); animation: bg-dot-pulse 0.8s infinite; }
.bg-phase-rolling .bg-phase-dot { background: rgba(90, 140, 74, 0.8); animation: bg-dot-pulse 0.5s infinite; }

@keyframes bg-dot-pulse {
  0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
}

.bg-steps-badge {
  margin-left: auto;
  background: rgba(196, 162, 101, 0.15);
  border: 1px solid rgba(196, 162, 101, 0.3);
  padding: 1px 6px;
  border-radius: 3px;
  color: var(--stain);
  font-weight: bold;
}

/* Stats */
.bg-stats-panel {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(90, 79, 64, 0.2);
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.bg-stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bg-stat-label {
  font-size: 9px;
  color: var(--vn-muted);
  width: 42px;
  flex-shrink: 0;
}

.bg-stat-track {
  flex: 1;
  height: 5px;
  background: rgba(90, 79, 64, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.bg-stat-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.bg-stat-hp { background: linear-gradient(to right, #8b2500, #c46060); }
.bg-stat-san { background: linear-gradient(to right, #3e5470, #7ab0d4); }

.bg-stat-val {
  font-size: 9px;
  font-family: monospace;
  color: var(--vn-muted);
  width: 40px;
  text-align: right;
  flex-shrink: 0;
}

.bg-stat-luck {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  color: var(--vn-muted);
}

.bg-steps-total {
  margin-left: auto;
  font-family: monospace;
  font-size: 9px;
  color: rgba(139, 125, 107, 0.5);
}

/* Dice */
.bg-dice-panel {
  padding: 12px;
  border-bottom: 1px solid rgba(90, 79, 64, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bg-dice-face {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: bold;
  font-family: monospace;
  color: var(--stain);
  border: 2px solid rgba(196, 162, 101, 0.3);
  background: rgba(42, 36, 32, 0.8);
  border-radius: 8px;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
  transition: transform 0.08s;
}

.bg-dice-rolling {
  animation: bg-dice-shake 0.12s linear infinite;
  border-color: var(--stain);
  color: var(--rust);
}

@keyframes bg-dice-shake {
  0%, 100% { transform: rotate(-3deg) scale(1.02); }
  50% { transform: rotate(3deg) scale(1.02); }
}

.bg-roll-btn {
  width: 100%;
  padding: 6px 0;
  font-size: 11px;
  font-family: 'Noto Serif SC', serif;
  border: 1px solid rgba(139, 69, 19, 0.5);
  background: rgba(139, 69, 19, 0.15);
  color: var(--stain);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.06em;
}

.bg-roll-btn:hover:not(:disabled) {
  background: rgba(139, 69, 19, 0.28);
  border-color: var(--rust);
  color: rgba(212, 197, 160, 0.9);
}

.bg-roll-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Seed */
.bg-seed-panel {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(90, 79, 64, 0.2);
}

.bg-seed-title {
  font-size: 8px;
  font-family: monospace;
  letter-spacing: 0.15em;
  color: rgba(139, 125, 107, 0.6);
  text-transform: uppercase;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.bg-seed-row {
  display: flex;
  gap: 4px;
}

.bg-seed-input {
  flex: 1;
  height: 26px;
  background: rgba(42, 36, 32, 0.6);
  border: 1px solid rgba(90, 79, 64, 0.4);
  color: var(--vn-fg);
  padding: 0 6px;
  font-size: 11px;
  font-family: monospace;
  border-radius: 2px;
  outline: none;
  min-width: 0;
}

.bg-seed-input:focus {
  border-color: rgba(139, 69, 19, 0.5);
}

.bg-seed-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(90, 79, 64, 0.4);
  background: rgba(74, 64, 53, 0.3);
  color: var(--vn-muted);
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.65rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.bg-seed-btn:hover { color: var(--stain); border-color: rgba(196, 162, 101, 0.4); }

.bg-seed-info {
  font-size: 8px;
  font-family: monospace;
  color: rgba(139, 125, 107, 0.4);
  margin-top: 4px;
}

/* Game log */
.bg-log-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0;
}

.bg-log-title {
  padding: 8px 12px 6px;
  font-size: 8px;
  font-family: monospace;
  letter-spacing: 0.15em;
  color: rgba(139, 125, 107, 0.6);
  text-transform: uppercase;
  border-bottom: 1px solid rgba(90, 79, 64, 0.15);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.bg-log-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bg-log-entry {
  font-size: 9px;
  font-family: monospace;
  color: rgba(139, 125, 107, 0.7);
  line-height: 1.5;
  word-break: break-all;
}

.bg-log-event { color: rgba(196, 162, 101, 0.8); }
.bg-log-transfer { color: rgba(122, 176, 212, 0.8); }
.bg-log-indent { color: rgba(90, 122, 74, 0.7); padding-left: 4px; }

/* ── Event overlay ───────────────────────────────────────────── */
.bg-event-overlay {
  position: absolute;
  inset: 0;
  background: rgba(20, 16, 12, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
  backdrop-filter: blur(4px);
}

.bg-event-panel {
  width: 100%;
  max-width: 520px;
  background: rgba(42, 36, 32, 0.98);
  border: 1px solid rgba(90, 79, 64, 0.5);
  border-top: 3px solid rgba(139, 69, 19, 0.6);
  display: flex;
  flex-direction: column;
  gap: 0;
}

.bg-event-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(90, 79, 64, 0.25);
}

.bg-event-type-badge {
  display: inline-block;
  font-size: 9px;
  font-family: monospace;
  letter-spacing: 0.15em;
  padding: 2px 8px;
  border-radius: 2px;
  margin-bottom: 8px;
  font-weight: bold;
}

.bg-badge-encounter { background: rgba(110, 26, 14, 0.4); color: #c46060; border: 1px solid rgba(110, 26, 14, 0.5); }
.bg-badge-trap { background: rgba(139, 69, 19, 0.3); color: var(--rust); border: 1px solid rgba(139, 69, 19, 0.4); }
.bg-badge-fortune { background: rgba(74, 103, 65, 0.3); color: var(--vn-success); border: 1px solid rgba(90, 140, 74, 0.4); }
.bg-badge-transfer { background: rgba(62, 84, 112, 0.3); color: #7ab0d4; border: 1px solid rgba(80, 120, 170, 0.4); }

.bg-event-title {
  font-size: 1rem;
  font-weight: bold;
  color: rgba(212, 197, 160, 0.92);
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}

.bg-event-flavor {
  font-size: 11px;
  color: var(--vn-muted);
  font-family: 'Noto Serif SC', serif;
  line-height: 1.7;
  font-style: italic;
}

/* Cards area */
.bg-cards-area {
  padding: 20px;
}

.bg-cards-hint {
  text-align: center;
  font-size: 9px;
  font-family: monospace;
  letter-spacing: 0.15em;
  color: rgba(139, 125, 107, 0.6);
  margin-bottom: 20px;
}

.bg-cards-row {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 12px;
  min-height: 160px;
}

/* Tarot cards */
.bg-tarot-wrapper {
  transform-origin: bottom center;
  cursor: pointer;
  flex-shrink: 0;
}

.bg-tarot-inner {
  width: 100px;
  height: 155px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.4, 0.2, 0.2, 1.2);
}

.bg-tarot-flipped {
  transform: rotateY(180deg);
}

.bg-tarot-face {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border: 1.5px solid rgba(90, 79, 64, 0.6);
  overflow: hidden;
}

/* Back face (initially visible) */
.bg-tarot-back {
  background: rgba(35, 30, 26, 0.95);
  transform: rotateY(0deg);
}

.bg-tarot-back-deco {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-tarot-back-border {
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(139, 69, 19, 0.3);
  border-radius: 3px;
}

.bg-tarot-back-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bg-tarot-back-symbol {
  font-size: 1.4rem;
  color: rgba(139, 69, 19, 0.5);
}

.bg-tarot-back-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.bg-tarot-back-line {
  height: 1px;
  width: 40px;
  background: rgba(139, 69, 19, 0.25);
}

.bg-tarot-back-line:nth-child(2) { width: 28px; }
.bg-tarot-back-line:nth-child(3) { width: 18px; }

/* Front face (revealed on flip) */
.bg-tarot-front {
  background: rgba(48, 42, 36, 0.98);
  transform: rotateY(180deg);
}

.bg-tarot-front-content {
  padding: 12px 10px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bg-tarot-front-title {
  font-size: 11px;
  font-weight: bold;
  color: rgba(212, 197, 160, 0.9);
  font-family: 'Noto Serif SC', serif;
  text-align: center;
  letter-spacing: 0.04em;
}

.bg-tarot-front-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(139, 69, 19, 0.4), transparent);
}

.bg-tarot-front-desc {
  flex: 1;
  font-size: 9px;
  color: var(--vn-muted);
  font-family: 'Noto Serif SC', serif;
  line-height: 1.6;
  overflow: hidden;
}

.bg-tarot-front-confirm {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 8px;
  font-family: monospace;
  color: rgba(196, 162, 101, 0.5);
  letter-spacing: 0.05em;
}

.bg-tarot-wrapper:hover .bg-tarot-inner:not(.bg-tarot-flipped) {
  transform: translateY(-6px);
}

/* Resolve area */
.bg-resolve-area {
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.bg-resolve-card-title {
  font-size: 0.95rem;
  font-weight: bold;
  color: rgba(212, 197, 160, 0.9);
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 0.06em;
}

.bg-resolve-message {
  font-size: 12px;
  color: var(--vn-muted);
  font-family: 'Noto Serif SC', serif;
  line-height: 1.8;
  text-align: center;
  max-width: 360px;
  font-style: italic;
}

.bg-resolve-effects {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.bg-effect-chip {
  font-size: 10px;
  font-family: monospace;
  padding: 2px 8px;
  border-radius: 3px;
  font-weight: bold;
  letter-spacing: 0.04em;
}

.bg-effect-pos { background: rgba(90, 122, 74, 0.25); color: var(--vn-success); border: 1px solid rgba(90, 122, 74, 0.4); }
.bg-effect-neg { background: rgba(139, 69, 19, 0.2); color: #c46060; border: 1px solid rgba(139, 37, 14, 0.4); }
.bg-effect-transfer { background: rgba(62, 84, 112, 0.25); color: #7ab0d4; border: 1px solid rgba(80, 120, 170, 0.35); }

.bg-continue-btn {
  margin-top: 4px;
  padding: 8px 28px;
  font-size: 12px;
  font-family: 'Noto Serif SC', serif;
  border: 1px solid rgba(139, 69, 19, 0.5);
  background: rgba(139, 69, 19, 0.18);
  color: var(--stain);
  border-radius: 3px;
  cursor: pointer;
  letter-spacing: 0.08em;
  transition: all 0.2s;
}

.bg-continue-btn:hover {
  background: rgba(139, 69, 19, 0.32);
  border-color: var(--rust);
  color: rgba(212, 197, 160, 0.9);
}

/* ── Overlay transition ──────────────────────────────────────── */
.bg-overlay-fade-enter-active,
.bg-overlay-fade-leave-active {
  transition: opacity 0.3s ease;
}

.bg-overlay-fade-enter-from,
.bg-overlay-fade-leave-to {
  opacity: 0;
}
</style>
