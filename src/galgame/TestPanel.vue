<template>
  <div
    class="flex items-center gap-1 flex-wrap px-3 py-1"
    style="background: rgba(20,15,12,0.97); border-top: 1px solid rgba(139,69,19,0.55);"
  >
    <span style="font-size:8px; color:rgba(139,69,19,0.9); font-family:monospace; letter-spacing:0.12em; flex-shrink:0;">▶ TEST</span>

    <!-- Dialogue / Choices -->
    <button class="t-btn" @click="testDialogue">对话框</button>
    <button class="t-btn" @click="testChoices">选择框</button>
    <button
      class="t-btn t-btn-dim"
      :style="{ opacity: store.testModeContent ? 1 : 0.4 }"
      @click="store.testModeContent = null"
    >清除</button>

    <span class="t-sep">·</span>

    <!-- Danmaku -->
    <button class="t-btn" @click="testDanmaku">弹幕×3</button>

    <span class="t-sep">·</span>

    <!-- Panels -->
    <button class="t-btn" @click="store.setOverlay('gameplay')">玩法</button>
    <button class="t-btn" @click="openShop">商店</button>
    <button class="t-btn" @click="openMessenger">系统对话</button>
    <button class="t-btn" @click="openRiddle">情报交换</button>
    <button class="t-btn" @click="store.setOverlay('character')">角色</button>
    <button class="t-btn" @click="store.setOverlay('settings')">设置</button>

    <span class="t-sep">·</span>

    <!-- System events -->
    <button class="t-btn t-btn-event" @click="store.addSystemProactiveMessage('workshop_upgrade')">工坊↑</button>
    <button class="t-btn t-btn-event" @click="store.addSystemProactiveMessage('stock_profit')">股市↑</button>
    <button class="t-btn t-btn-event" @click="store.addSystemProactiveMessage('stock_bankrupt')">破产</button>

    <span class="t-sep">·</span>

    <!-- Gold shortcut -->
    <button class="t-btn t-btn-dim" @click="store.changeGold(1000, 'debug', '测试充值')">+1000G</button>
  </div>
</template>

<script setup lang="ts">
import { useVNStore } from './store';

const store = useVNStore();

const TEST_DIALOGUE = `**旧报童**：测试对话文本，对话框功能正常运作中。这是一段较长的内容，用于确认打字机逐字效果是否流畅。测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本测试文本

旁白测试文本。这是一段旁白，检验旁白缩进和样式是否正确显示。

**铁匠**：这是第二段对话，用于测试多角色轮流发言的排版效果。`;

const TEST_CHOICES = `**旧报童**：请做出选择。

<roleplay_options>
<option>测试选项一：继续前进</option>
<option>测试选项二：原路返回</option>
<option>测试选项三：询问更多情况</option>
</roleplay_options>`;

function testDialogue() {
  store.testModeContent = TEST_DIALOGUE;
}

function testChoices() {
  store.testModeContent = TEST_CHOICES;
}

function testDanmaku() {
  store.pushDanmaku('测试弹幕文本');
  store.pushDanmaku('末日生存好难啊');
  store.pushDanmaku('旧报纸上写着什么？');
}

function openShop() {
  store.testFillShop();
  store.setOverlay('gameplay');
  store.activeModuleId = 'shop';
}

function openMessenger() {
  store.pendingGameplayMode = 'messenger';
  store.setOverlay('gameplay');
}

function openRiddle() {
  store.pendingGameplayMode = 'riddle';
  store.setOverlay('gameplay');
}
</script>

<style scoped>
.t-btn {
  font-size: 9px;
  padding: 2px 6px;
  border: 1px solid rgba(90, 79, 64, 0.45);
  color: rgba(212, 197, 160, 0.65);
  cursor: pointer;
  border-radius: 2px;
  background: transparent;
  transition: all 0.15s;
  flex-shrink: 0;
  font-family: monospace;
  letter-spacing: 0.05em;
}
.t-btn:hover {
  border-color: rgba(139, 69, 19, 0.7);
  color: rgba(212, 197, 160, 0.95);
  background: rgba(139, 69, 19, 0.12);
}
.t-btn-event {
  border-color: rgba(100, 70, 140, 0.4);
  color: rgba(180, 150, 220, 0.65);
}
.t-btn-event:hover {
  border-color: rgba(100, 70, 140, 0.8);
  color: rgba(200, 170, 240, 0.95);
  background: rgba(100, 70, 140, 0.1);
}
.t-btn-dim {
  opacity: 0.55;
}
.t-btn-dim:hover {
  opacity: 1;
}
.t-sep {
  font-size: 10px;
  color: rgba(90, 79, 64, 0.4);
  flex-shrink: 0;
  line-height: 1;
}
</style>
