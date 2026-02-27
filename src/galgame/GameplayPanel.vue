<template>
  <div class="absolute inset-0 flex items-center justify-center" style="z-index: 50">
    <div
      class="absolute inset-0 backdrop-blur-sm"
      style="background: rgba(42, 36, 32, 0.7)"
      @click="handleBackdropClick"
    />

    <ModuleView v-if="store.activeModuleId" :module-id="store.activeModuleId" @close="store.activeModuleId = null" />

    <div class="relative w-full max-w-2xl mx-4 border overflow-hidden animate-fade-in-up" :style="panelStyle">
      <div :style="decoTop" />
      <div :style="decoTopThin" />

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4" :style="headerBorder">
        <div class="flex items-center gap-3">
          <div class="stamp-effect">
            <span style="color: var(--rust); font-size: 0.75rem; font-weight: bold; letter-spacing: 0.15em"
              >GAMEPLAY</span
            >
          </div>
          <h2 class="text-lg font-bold tracking-widest" style="color: rgba(212, 197, 160, 0.9)">玩法</h2>
        </div>
        <button
          class="w-8 h-8 flex items-center justify-center cursor-pointer"
          style="color: var(--vn-muted)"
          @click="store.setOverlay('none')"
        >
          <i class="fa-solid fa-xmark" />
        </button>
      </div>

      <!-- Gold / Inventory Bar -->
      <div class="px-6 py-3 flex items-center gap-3" :style="{ borderBottom: '1px solid rgba(90,79,64,0.2)' }">
        <button class="gold-counter cursor-pointer" @click="store.activeModuleId = 'gold_log'">
          <i class="fa-solid fa-coins" style="font-size: 0.75rem" />
          <span class="font-bold">{{ store.gold }}</span>
          <i class="fa-solid fa-chevron-right" style="font-size: 0.5rem; opacity: 0.5" />
        </button>
        <button
          class="flex items-center gap-1.5 px-2.5 py-1 border text-xs cursor-pointer transition-all"
          style="border-color: rgba(90, 79, 64, 0.4); border-radius: 2px; color: var(--vn-muted)"
          @click="store.activeModuleId = 'inventory'"
        >
          <i class="fa-solid fa-box-open" style="font-size: 0.7rem" />
          <span>背包</span>
          <span v-if="store.inventory.length > 0" style="color: var(--rust); font-family: monospace">{{
            store.inventory.length
          }}</span>
        </button>
        <div class="flex-1" />
        <div style="font-size: 9px; color: var(--vn-muted); font-family: monospace">
          Lv.{{ store.workshopLevel }} 工坊
        </div>
      </div>

      <!-- Section -->
      <div class="px-6 py-2 text-center" :style="{ borderBottom: '1px solid rgba(90,79,64,0.2)' }">
        <div style="font-size: 9px; color: var(--vn-muted); font-family: monospace; letter-spacing: 0.1em">
          --- 选择一个功能模块进入 ---
        </div>
      </div>

      <!-- Module grid -->
      <div class="px-6 py-5 overflow-y-auto no-scrollbar" style="max-height: calc(85vh - 200px)">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            v-for="mod in displayModules"
            :key="mod.moduleId"
            class="relative text-left border transition-all duration-200"
            :style="{
              borderColor: mod.lockReason ? 'rgba(90,79,64,0.2)' : 'rgba(90,79,64,0.4)',
              opacity: mod.lockReason ? 0.4 : 1,
              cursor: mod.lockReason ? 'not-allowed' : 'pointer',
              borderRadius: '2px',
            }"
            :disabled="!!mod.lockReason"
            @click="!mod.lockReason && handleModuleClick(mod.moduleId)"
          >
            <div
              :style="{
                height: '1px',
                background: 'linear-gradient(to right, transparent, rgba(212,197,160,0.15), transparent)',
              }"
            />
            <div class="p-4">
              <div class="flex items-start gap-3">
                <div
                  class="shrink-0"
                  :style="{ color: mod.lockReason ? 'rgba(139,125,107,0.3)' : 'rgba(139,69,19,0.7)' }"
                >
                  <i :class="mod.lockReason ? 'fa-solid fa-lock' : 'fa-solid ' + mod.icon" style="font-size: 1.1rem" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="text-sm font-bold"
                      :style="{ color: mod.lockReason ? 'var(--vn-muted)' : 'rgba(212,197,160,0.9)' }"
                      >{{ mod.displayName }}</span
                    >
                    <span
                      v-if="mod.badge"
                      class="border px-1"
                      style="font-size: 8px; color: var(--rust); border-color: rgba(139, 69, 19, 0.3)"
                      >{{ mod.badge }}</span
                    >
                    <!-- Workshop producing indicator + quick actions -->
                    <template v-if="mod.moduleId === 'idle_workshop' && store.workshopCharacterId">
                      <span
                        v-if="store.workshopProducing"
                        class="border px-1"
                        style="font-size: 8px; color: var(--vn-success); border-color: rgba(90, 122, 74, 0.3)"
                        >生产中</span
                      >
                      <span
                        v-else
                        class="border px-1"
                        style="font-size: 8px; color: var(--stain); border-color: rgba(196, 162, 101, 0.3)"
                        >已暂停</span
                      >
                      <button
                        class="w-5 h-5 flex items-center justify-center border cursor-pointer"
                        style="border-color: rgba(90, 79, 64, 0.3); border-radius: 2px; font-size: 0.55rem"
                        :style="{ color: store.workshopProducing ? 'var(--stain)' : 'var(--vn-success)' }"
                        @click.stop="store.workshopProducing ? store.pauseProduction() : store.resumeProduction()"
                      >
                        <i :class="store.workshopProducing ? 'fa-solid fa-pause' : 'fa-solid fa-play'" />
                      </button>
                    </template>
                  </div>
                  <p style="font-size: 11px; color: var(--vn-muted); margin-top: 4px; line-height: 1.6">
                    {{ mod.description }}
                  </p>
                  <p
                    v-if="mod.lockReason"
                    style="font-size: 9px; color: rgba(139, 125, 107, 0.5); margin-top: 6px; font-family: monospace"
                  >
                    [ {{ mod.lockReason }} ]
                  </p>
                </div>
                <!-- 2048 fee on right side -->
                <div
                  v-if="mod.moduleId === 'puzzle_2048'"
                  class="shrink-0 flex flex-col items-end justify-center"
                >
                  <span
                    style="font-size: 9px; color: var(--stain); font-family: monospace; font-weight: bold"
                  >
                    {{ puzzleFee > 0 ? `${puzzleFee}G` : '免费' }}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </div>

        <div class="mt-6 pt-4 text-center" :style="{ borderTop: '1px solid rgba(90,79,64,0.2)' }">
          <p style="font-size: 9px; color: rgba(139, 125, 107, 0.4); font-family: monospace">
            模块不会影响当前剧情进度 · 关闭后返回此界面
          </p>
        </div>
      </div>

      <div :style="decoBottomThin" />
      <div :style="decoBottom" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ModuleView from './ModuleView.vue';
import { calcCommission, useVNStore } from './store';

const store = useVNStore();

const panelStyle = {
  maxHeight: '85vh',
  borderColor: 'rgba(90,79,64,0.6)',
  background: 'var(--vn-panel-bg)',
  backdropFilter: 'blur(12px)',
};
const headerBorder = { borderBottom: '1px solid rgba(90,79,64,0.3)' };
const decoTop = {
  height: '3px',
  background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.6), transparent)',
};
const decoTopThin = {
  height: '1px',
  marginTop: '1px',
  background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.3), transparent)',
};
const decoBottomThin = {
  height: '1px',
  background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.3), transparent)',
};
const decoBottom = {
  height: '2px',
  marginTop: '1px',
  background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.5), transparent)',
};

const puzzleFee = computed(() => calcCommission(store.gold, store.workshopLevel, 0));

const displayModules = computed(() =>
  store.gameModules
    .filter(m => m.moduleId !== 'inventory')
    .map(m => ({
      ...m,
      lockReason: store.getModuleLockReason(m.moduleId),
    })),
);

function handleModuleClick(moduleId: string) {
  if (moduleId === 'puzzle_2048') {
    if (!store.autoStart2048()) {
      store.showToast('金币不足');
      return;
    }
  }
  store.activeModuleId = moduleId;
}

function handleBackdropClick() {
  if (store.workshopProducing) return;
  store.setOverlay('none');
}
</script>
