<template>
  <div class="absolute inset-0 flex items-center justify-center" style="z-index:50;">
    <div class="absolute inset-0 backdrop-blur-sm" style="background:rgba(42,36,32,0.7);" @click="store.setOverlay('none')" />

    <!-- Full avatar preview -->
    <div
      v-if="showFullAvatar && store.userCharacter.avatarUrl"
      class="absolute inset-0 flex items-center justify-center cursor-pointer"
      style="z-index:60; background:rgba(42,36,32,0.9);"
      @click="showFullAvatar = false"
    >
      <img
        :src="store.userCharacter.avatarUrl"
        :alt="store.userCharacter.name"
        class="object-contain border"
        style="max-width:80%; max-height:600px; border-color:rgba(90,79,64,0.3); filter:sepia(0.2) contrast(0.9);"
      />
    </div>

    <div class="relative w-full max-w-2xl mx-4 border overflow-hidden animate-fade-in-up" :style="panelStyle">
      <div :style="decoTop" />
      <div :style="decoTopThin" />

      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4" :style="headerBorder">
        <div class="flex items-center gap-3">
          <div class="stamp-effect">
            <span style="color:var(--rust); font-size:0.75rem; font-weight:bold; letter-spacing:0.15em;">PROFILE</span>
          </div>
          <h2 class="text-lg font-bold tracking-widest" style="color:rgba(212,197,160,0.9);">角色</h2>
        </div>
        <button class="w-8 h-8 flex items-center justify-center cursor-pointer" style="color:var(--vn-muted);" @click="store.setOverlay('none')">
          <i class="fa-solid fa-xmark" />
        </button>
      </div>

      <!-- Content -->
      <div class="px-6 py-5 overflow-y-auto no-scrollbar" style="max-height:600px;">
        <!-- User character section -->
        <div class="mb-8">
          <div class="flex items-center gap-2 mb-4">
            <i class="fa-solid fa-user" style="color:var(--rust); font-size:0.875rem;" />
            <h3 class="text-sm font-bold tracking-widest" style="color:rgba(212,197,160,0.9);">我的角色</h3>
            <div class="flex-1" :style="{ height:'1px', background:'linear-gradient(to right, rgba(90,79,64,0.6), transparent)' }" />
          </div>

          <div class="flex gap-5">
            <!-- Avatar -->
            <div class="flex flex-col items-center gap-2">
              <div
                class="relative w-24 h-24 border overflow-hidden cursor-pointer group"
                :style="{ borderColor:'rgba(90,79,64,0.5)', background:'rgba(74,64,53,0.2)' }"
                @click="store.userCharacter.avatarUrl ? (showFullAvatar = true) : fileInput?.click()"
              >
                <template v-if="store.userCharacter.avatarUrl">
                  <img
                    :src="store.userCharacter.avatarUrl"
                    :alt="store.userCharacter.name"
                    class="w-full h-full object-cover"
                    style="filter:sepia(0.3) contrast(0.9);"
                  />
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style="background:rgba(42,36,32,0.5);">
                    <i class="fa-solid fa-eye" style="color:var(--vn-fg);" />
                  </div>
                </template>
                <div v-else class="w-full h-full flex flex-col items-center justify-center" style="color:var(--vn-muted);">
                  <i class="fa-solid fa-upload mb-1" />
                  <span style="font-size:9px;">上传头像</span>
                </div>
              </div>
              <button class="cursor-pointer transition-colors" style="font-size:10px; color:var(--vn-muted);" @click="fileInput?.click()">
                {{ store.userCharacter.avatarUrl ? '更换头像' : '选择图片' }}
              </button>
              <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="handleAvatarUpload" />
            </div>

            <!-- Info -->
            <div class="flex-1">
              <div class="mb-3">
                <span class="block mb-1" style="font-size:10px; color:var(--vn-muted);">姓名</span>
                <input
                  v-if="editingName"
                  v-model="nameValue"
                  type="text"
                  class="w-full border px-2 py-1 text-sm outline-none"
                  :style="{ background:'rgba(74,64,53,0.3)', borderColor:'rgba(90,79,64,0.4)', color:'var(--vn-fg)', borderRadius:'2px' }"
                  autofocus
                  @blur="handleNameSave"
                  @keydown.enter="handleNameSave"
                />
                <div
                  v-else
                  class="text-sm cursor-pointer transition-colors"
                  style="color:rgba(212,197,160,0.9);"
                  @click="editingName = true"
                >
                  {{ store.userCharacter.name }}
                  <span style="font-size:9px; color:var(--vn-muted); margin-left:8px;">(点击编辑)</span>
                </div>
              </div>

              <div class="flex items-center justify-between py-2">
                <div class="flex items-center gap-2">
                  <i :class="store.userCharacter.showSprite ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'" :style="{ fontSize:'0.8rem', color: store.userCharacter.showSprite ? 'var(--rust)' : 'var(--vn-muted)' }" />
                  <span class="text-xs" style="color:rgba(212,197,160,0.7);">显示对话框立绘</span>
                </div>
                <ToggleSwitch
                  :checked="store.userCharacter.showSprite"
                  @update="v => store.updateUserCharacter({ showSprite: v })"
                />
              </div>
              <p v-if="!store.userCharacter.avatarUrl" style="font-size:9px; color:rgba(139,125,107,0.6); margin-top:4px;">
                请先上传头像才能开启立绘显示
              </p>
            </div>
          </div>
        </div>

        <!-- Character roster divider -->
        <div class="headline-rule mb-6">
          <span style="font-size:9px; color:var(--vn-muted); font-family:monospace; letter-spacing:0.15em; padding:0 8px; background:var(--vn-panel-bg); position:relative; z-index:10;">
            --- 角色图鉴 ---
          </span>
        </div>

        <!-- Character roster -->
        <div class="flex flex-col gap-3">
          <div
            v-for="char in store.characterRoster"
            :key="char.id"
            class="border transition-all duration-200"
            :style="{
              borderColor: char.unlocked ? 'rgba(90,79,64,0.4)' : 'rgba(90,79,64,0.2)',
              background: char.unlocked ? 'rgba(212,197,160,0.02)' : 'rgba(74,64,53,0.1)',
              opacity: char.unlocked ? 1 : 0.5,
              borderRadius: '2px',
            }"
          >
            <div class="p-3 flex items-center gap-3">
              <div class="w-12 h-12 border flex items-center justify-center shrink-0 overflow-hidden" :style="{ borderColor:'rgba(90,79,64,0.3)', background:'rgba(74,64,53,0.2)' }">
                <img v-if="char.avatarUrl" :src="char.avatarUrl" :alt="char.name" class="w-full h-full object-cover" style="filter:sepia(0.4);" />
                <i v-else class="fa-solid fa-user" style="color:rgba(139,125,107,0.3);" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold" :style="{ color: char.unlocked ? 'rgba(212,197,160,0.9)' : 'var(--vn-muted)' }">
                    {{ char.unlocked ? char.name : '???' }}
                  </span>
                  <span v-if="!char.unlocked" class="border px-1" style="font-size:8px; color:var(--vn-muted); border-color:rgba(90,79,64,0.3);">未解锁</span>
                </div>
                <p v-if="char.unlocked && char.description" class="truncate" style="font-size:11px; color:var(--vn-muted); margin-top:2px;">{{ char.description }}</p>
              </div>
              <div v-if="char.unlocked" class="flex items-center gap-1 shrink-0">
                <i class="fa-solid fa-heart" style="font-size:0.75rem; color:rgba(139,69,19,0.6);" />
                <span class="text-xs font-mono" style="color:var(--vn-muted);">{{ char.affection }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div :style="decoBottomThin" />
      <div :style="decoBottom" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVNStore } from './store';
import ToggleSwitch from './ToggleSwitch.vue';

const store = useVNStore();
const fileInput = ref<HTMLInputElement | null>(null);
const showFullAvatar = ref(false);
const editingName = ref(false);
const nameValue = ref(store.userCharacter.name);

const panelStyle = {
  maxHeight: '700px',
  borderColor: 'rgba(90,79,64,0.6)',
  background: 'var(--vn-panel-bg)',
  backdropFilter: 'blur(12px)',
};
const headerBorder = { borderBottom: '1px solid rgba(90,79,64,0.3)' };
const decoTop = { height: '3px', background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.6), transparent)' };
const decoTopThin = { height: '1px', marginTop: '1px', background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.3), transparent)' };
const decoBottomThin = { height: '1px', background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.3), transparent)' };
const decoBottom = { height: '2px', marginTop: '1px', background: 'linear-gradient(to right, transparent, rgba(139,69,19,0.5), transparent)' };

function handleAvatarUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  store.updateUserCharacter({ avatarUrl: url });
}

function handleNameSave() {
  if (nameValue.value.trim()) {
    store.updateUserCharacter({ name: nameValue.value.trim() });
  }
  editingName.value = false;
}
</script>
