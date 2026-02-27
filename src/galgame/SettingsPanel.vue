<template>
  <div class="absolute inset-0 flex items-center justify-center" style="z-index: 50">
    <div
      class="absolute inset-0 backdrop-blur-sm"
      style="background: rgba(42, 36, 32, 0.7)"
      @click="store.setOverlay('none')"
    />

    <div class="relative w-full max-w-2xl mx-4 border overflow-hidden animate-fade-in-up" :style="panelStyle">
      <div :style="decoTopThick" />
      <div :style="decoTopThin" />

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4" :style="headerBorder">
        <div class="flex items-center gap-3">
          <div class="stamp-effect">
            <span style="color: var(--rust); font-size: 0.75rem; font-weight: bold; letter-spacing: 0.15em"
              >SETTINGS</span
            >
          </div>
          <h2 class="text-lg font-bold tracking-widest" style="color: rgba(212, 197, 160, 0.9)">设置</h2>
        </div>
        <button
          class="w-8 h-8 flex items-center justify-center cursor-pointer transition-colors"
          style="color: var(--vn-muted)"
          @click="store.setOverlay('none')"
        >
          <i class="fa-solid fa-xmark" />
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-5 overflow-y-auto no-scrollbar" style="max-height: calc(85vh - 80px)">
        <!-- Volume -->
        <SectionHeader icon="fa-volume-high" title="音量设置" />
        <div class="mb-6 pl-2">
          <SliderRow
            label="背景音乐"
            :value="store.settings.bgmVolume"
            @update="v => store.updateSettings({ bgmVolume: v })"
          />
          <SliderRow
            label="音效"
            :value="store.settings.sfxVolume"
            @update="v => store.updateSettings({ sfxVolume: v })"
          />
          <SliderRow
            label="语音"
            :value="store.settings.voiceVolume"
            @update="v => store.updateSettings({ voiceVolume: v })"
          />
        </div>

        <!-- Text -->
        <SectionHeader icon="fa-font" title="文字显示" />
        <div class="mb-6 pl-2">
          <SliderRow
            label="文字速度"
            :value="store.settings.textSpeed"
            :min="1"
            :max="10"
            @update="v => store.updateSettings({ textSpeed: v })"
          />
          <SliderRow
            label="自动速度"
            :value="store.settings.autoPlaySpeed"
            :min="1"
            :max="10"
            @update="v => store.updateSettings({ autoPlaySpeed: v })"
          />
          <div class="flex items-center justify-between py-2">
            <span class="text-xs" style="color: rgba(212, 197, 160, 0.7)">自动播放</span>
            <ToggleSwitch :checked="store.settings.autoPlay" @update="v => store.updateSettings({ autoPlay: v })" />
          </div>
        </div>

        <!-- Danmaku -->
        <SectionHeader icon="fa-comment-dots" title="弹幕设置" />
        <div class="mb-6 pl-2">
          <div class="flex items-center justify-between py-2">
            <span class="text-xs" style="color: rgba(212, 197, 160, 0.7)">启用弹幕</span>
            <ToggleSwitch
              :checked="store.settings.danmakuEnabled"
              @update="v => store.updateSettings({ danmakuEnabled: v })"
            />
          </div>
          <template v-if="store.settings.danmakuEnabled">
            <SliderRow
              label="弹幕速度"
              :value="store.settings.danmakuSpeed"
              :min="1"
              :max="10"
              @update="v => store.updateSettings({ danmakuSpeed: v })"
            />
            <div class="flex items-center justify-between py-2">
              <span class="text-xs" style="color: rgba(212, 197, 160, 0.7)">循环弹幕</span>
              <ToggleSwitch
                :checked="store.settings.danmakuLoop"
                @update="v => store.updateSettings({ danmakuLoop: v })"
              />
            </div>
            <div class="py-2">
              <span class="text-xs block mb-2" style="color: rgba(212, 197, 160, 0.7)">显示区域</span>
              <div class="flex gap-2">
                <button
                  v-for="opt in danmakuDisplayOptions"
                  :key="opt.value"
                  class="px-3 py-1.5 text-xs border cursor-pointer transition-all"
                  :style="{
                    borderColor: store.settings.danmakuDisplay === opt.value ? 'var(--rust)' : 'rgba(90,79,64,0.4)',
                    background: store.settings.danmakuDisplay === opt.value ? 'rgba(139,69,19,0.15)' : 'transparent',
                    color: store.settings.danmakuDisplay === opt.value ? 'var(--vn-fg)' : 'var(--vn-muted)',
                    borderRadius: '2px',
                  }"
                  @click="store.updateSettings({ danmakuDisplay: opt.value as any })"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Display -->
        <SectionHeader icon="fa-desktop" title="显示设置" />
        <div class="mb-6 pl-2">
          <div class="flex items-center justify-between py-2">
            <div>
              <span class="text-xs" style="color: rgba(212, 197, 160, 0.7)">竖屏模式</span>
              <p style="font-size: 10px; color: var(--vn-muted); margin-top: 2px">
                开启后支持手势操作，左划/右划快速切换界面
              </p>
            </div>
            <ToggleSwitch
              :checked="store.settings.portraitMode"
              @update="v => store.updateSettings({ portraitMode: v })"
            />
          </div>
        </div>

        <!-- API Configuration -->
        <SectionHeader icon="fa-server" title="API 配置" />
        <div class="mb-6 pl-2">
          <!-- Second API -->
          <div class="mb-4 p-3 border" style="border-color: rgba(90, 79, 64, 0.3); border-radius: 2px">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold" style="color: rgba(212, 197, 160, 0.9)">第二 API</span>
              <span class="text-xs" :class="'provider-' + store.secondApiStatus">
                <i class="fa-solid fa-circle" style="font-size: 6px; margin-right: 4px" />
                {{ store.secondApiStatus === 'available' ? '已连接' : '未配置' }}
              </span>
            </div>
            <p style="font-size: 9px; color: var(--vn-muted); margin-bottom: 8px">用于商店刷新、弹幕生成等功能</p>
            <input
              class="vn-input mb-2"
              placeholder="API URL"
              :value="store.settings.secondApiUrl"
              @input="store.updateSettings({ secondApiUrl: ($event.target as HTMLInputElement).value })"
            />
            <input
              class="vn-input mb-2"
              type="password"
              placeholder="API Key"
              :value="store.settings.secondApiKey"
              @input="store.updateSettings({ secondApiKey: ($event.target as HTMLInputElement).value })"
            />
            <button
              class="flex items-center gap-1.5 px-2.5 py-1 border text-xs cursor-pointer transition-all"
              :style="{
                borderColor: store.secondApiStatus === 'available' ? 'var(--rust)' : 'rgba(90,79,64,0.2)',
                color: store.secondApiStatus === 'available' ? 'var(--vn-fg)' : 'var(--vn-muted)',
                borderRadius: '2px',
                opacity: store.secondApiStatus === 'available' ? 1 : 0.4,
              }"
              :disabled="store.secondApiStatus !== 'available' || testingSecondApi"
              @click="testSecondApi"
            >
              <i
                :class="testingSecondApi ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug'"
                style="font-size: 0.6rem"
              />
              <span>{{ secondApiTestResult ?? '测试连接' }}</span>
            </button>
          </div>

          <!-- Image API -->
          <div class="p-3 border" style="border-color: rgba(90, 79, 64, 0.3); border-radius: 2px">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold" style="color: rgba(212, 197, 160, 0.9)">生图 API</span>
              <span class="text-xs" :class="'provider-' + store.imageApiStatus">
                <i class="fa-solid fa-circle" style="font-size: 6px; margin-right: 4px" />
                {{ store.imageApiStatus === 'available' ? '已连接' : '未配置' }}
              </span>
            </div>
            <p style="font-size: 9px; color: var(--vn-muted); margin-bottom: 8px">用于生成背景或 CG</p>
            <input
              class="vn-input mb-2"
              placeholder="API URL"
              :value="store.settings.imageApiUrl"
              @input="store.updateSettings({ imageApiUrl: ($event.target as HTMLInputElement).value })"
            />
            <input
              class="vn-input mb-2"
              type="password"
              placeholder="API Key"
              :value="store.settings.imageApiKey"
              @input="store.updateSettings({ imageApiKey: ($event.target as HTMLInputElement).value })"
            />
            <button
              class="flex items-center gap-1.5 px-2.5 py-1 border text-xs cursor-pointer transition-all"
              :style="{
                borderColor: store.imageApiStatus === 'available' ? 'var(--rust)' : 'rgba(90,79,64,0.2)',
                color: store.imageApiStatus === 'available' ? 'var(--vn-fg)' : 'var(--vn-muted)',
                borderRadius: '2px',
                opacity: store.imageApiStatus === 'available' ? 1 : 0.4,
              }"
              :disabled="store.imageApiStatus !== 'available' || testingImageApi"
              @click="testImageApi"
            >
              <i
                :class="testingImageApi ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-plug'"
                style="font-size: 0.6rem"
              />
              <span>{{ imageApiTestResult ?? '测试连接' }}</span>
            </button>
          </div>
        </div>

        <!-- Skin -->
        <SectionHeader icon="fa-palette" title="界面皮肤" />
        <div class="mb-6 pl-2">
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="skin in SKIN_PRESETS"
              :key="skin.id"
              class="p-3 border text-left transition-all duration-200 cursor-pointer"
              :style="{
                borderColor: store.settings.skinId === skin.id ? 'var(--rust)' : 'rgba(90,79,64,0.4)',
                background: store.settings.skinId === skin.id ? 'rgba(139,69,19,0.1)' : 'transparent',
                borderRadius: '2px',
              }"
              @click="store.updateSettings({ skinId: skin.id })"
            >
              <div class="text-xs font-bold mb-1" style="color: rgba(212, 197, 160, 0.9)">{{ skin.name }}</div>
              <div style="font-size: 10px; color: var(--vn-muted)">{{ skin.description }}</div>
              <div
                v-if="store.settings.skinId === skin.id"
                style="
                  margin-top: 6px;
                  font-size: 9px;
                  color: var(--rust);
                  font-family: monospace;
                  letter-spacing: 0.1em;
                "
              >
                [ 当前使用 ]
              </div>
            </button>
          </div>
        </div>

        <!-- Reset -->
        <div class="pt-4" :style="{ borderTop: '1px solid rgba(90,79,64,0.2)' }">
          <button
            class="flex items-center gap-2 text-xs cursor-pointer transition-colors"
            style="color: var(--vn-muted)"
            @click="handleReset"
          >
            <i class="fa-solid fa-rotate-left" style="font-size: 0.75rem" />
            <span>恢复默认设置</span>
          </button>
        </div>
      </div>

      <div :style="decoBottomThin" />
      <div :style="decoBottomThick" />
    </div>
  </div>
</template>

<script setup lang="ts">
import SectionHeader from './SectionHeader.vue';
import SliderRow from './SliderRow.vue';
import { useVNStore } from './store';
import ToggleSwitch from './ToggleSwitch.vue';

const store = useVNStore();

const testingSecondApi = ref(false);
const secondApiTestResult = ref<string | null>(null);
const testingImageApi = ref(false);
const imageApiTestResult = ref<string | null>(null);

async function testSecondApi() {
  testingSecondApi.value = true;
  secondApiTestResult.value = null;
  try {
    const resp = await fetch(store.settings.secondApiUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${store.settings.secondApiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    secondApiTestResult.value = resp.ok ? '连接成功 ✓' : `失败 (${resp.status})`;
  } catch {
    secondApiTestResult.value = '连接失败';
  } finally {
    testingSecondApi.value = false;
    setTimeout(() => {
      secondApiTestResult.value = null;
    }, 4000);
  }
}

async function testImageApi() {
  testingImageApi.value = true;
  imageApiTestResult.value = null;
  try {
    const resp = await fetch(store.settings.imageApiUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${store.settings.imageApiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    imageApiTestResult.value = resp.ok ? '连接成功 ✓' : `失败 (${resp.status})`;
  } catch {
    imageApiTestResult.value = '连接失败';
  } finally {
    testingImageApi.value = false;
    setTimeout(() => {
      imageApiTestResult.value = null;
    }, 4000);
  }
}

const SKIN_PRESETS = [
  { id: 'newspaper-default', name: '旧报', description: '泛黄报纸，油墨褪色' },
  { id: 'telegram', name: '电报', description: '深灰背景，打字机字体' },
  { id: 'wartime', name: '战时', description: '深红点缀，军事通讯风' },
  { id: 'archive', name: '档案', description: '牛皮纸色，公文档案风' },
];

const danmakuDisplayOptions = [
  { value: 'third', label: '1/3 屏' },
  { value: 'half', label: '半屏' },
  { value: 'full', label: '全屏' },
];

const panelStyle = {
  maxHeight: '85vh',
  borderColor: 'rgba(90,79,64,0.6)',
  background: 'var(--vn-panel-bg)',
  backdropFilter: 'blur(12px)',
};
const headerBorder = { borderBottom: '1px solid rgba(90,79,64,0.3)' };
const decoTopThick = {
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
const decoBottomThick = {
  height: '2px',
  marginTop: '1px',
  background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.5), transparent)',
};

function handleReset() {
  store.updateSettings({
    textSpeed: 5,
    autoPlaySpeed: 5,
    autoPlay: false,
    bgmVolume: 70,
    sfxVolume: 80,
    voiceVolume: 100,
    portraitMode: false,
    skinId: 'newspaper-default',
    danmakuEnabled: false,
    danmakuSpeed: 5,
    danmakuLoop: false,
    danmakuDisplay: 'third',
  });
}
</script>
