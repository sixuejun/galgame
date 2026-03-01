# 长程记忆与第二API增强系统 - 实现计划

## 📋 项目概述

为 galgame 项目添加以下核心功能：
1. **长程记忆系统**：小总结 + 大总结机制
2. **第二API生图增强**：tag生成 + 内容追踪
3. **功能API分配**：每个功能可选择主API/第二API
4. **世界书绿灯机制**：动态条目启用/禁用

---

## 🎯 核心需求确认

- ✅ 总结按**消息轮数**触发（不需要超级大总结）
- ✅ 第二API生成内容**直接插入楼层消息末尾**（不前端展示）
- ✅ 支持**世界书绿灯条目**（根据上下文自动启用）
- ✅ 总结数据存储到**聊天变量**

---

## 📐 系统架构设计

### 数据结构设计

```typescript
// 1. 总结系统配置
interface SummaryConfig {
  smallInterval: number;        // 小总结间隔（轮数）
  bigThreshold: number;          // 大总结阈值（小总结数量）
  autoEnabled: boolean;          // 是否自动总结
  apiType: 'main' | 'second';   // 使用哪个API
}

// 2. 总结数据
interface SummaryData {
  small: SmallSummary[];         // 小总结列表
  big: BigSummary[];             // 大总结列表
  currentRound: number;          // 当前轮数
}

interface SmallSummary {
  id: string;
  content: string;
  rounds: string;                // 如 "1-5"
  timestamp: number;
}

interface BigSummary {
  id: string;
  content: string;
  rounds: string;                // 如 "1-30"
  timestamp: number;
  smallCount: number;            // 包含的小总结数量
}

// 3. 第二API任务配置
interface ApiTaskConfig {
  danmaku: 'main' | 'second' | 'disabled';
  summary: 'main' | 'second' | 'disabled';
  imageTag: 'main' | 'second' | 'disabled';
  variableUpdate: 'main' | 'second' | 'disabled';
}

// 4. 第二API生成记录
interface SecondApiGeneration {
  id: string;
  type: 'danmaku' | 'summary' | 'imageTag' | 'variable';
  content: string;
  timestamp: number;
  messageId: number;             // 插入到哪个消息
  inserted: boolean;             // 是否已插入
}

// 5. 世界书条目增强
interface WorldbookEntryEnhanced {
  // 原有字段...
  enabled: boolean;              // 是否启用
  targetApi: 'main' | 'second';  // 发送给哪个API
  greenLight: boolean;           // 是否启用绿灯机制
  greenLightKeywords: string[];  // 绿灯关键词
  _showInContext: boolean;       // 当前是否在上下文中显示
}
```

---

## 📦 Phase 1: 基础总结系统

### 1.1 store.ts 添加总结相关状态

**文件**: `src/galgame/store.ts`

**任务**:
- [ ] 添加 `SummaryConfig` schema
- [ ] 添加 `summaryData` ref
- [ ] 添加 `summaryConfig` 到 settings
- [ ] 实现 `watchEffect` 持久化到聊天变量

**代码位置**: 在 `VNSettings` schema 后添加

```typescript
const SummaryConfig = z.object({
  smallInterval: z.number().min(1).max(50).default(5),
  bigThreshold: z.number().min(2).max(20).default(6),
  autoEnabled: z.boolean().default(true),
  apiType: z.enum(['main', 'second']).default('second'),
});

const SummaryData = z.object({
  small: z.array(z.object({
    id: z.string(),
    content: z.string(),
    rounds: z.string(),
    timestamp: z.number(),
  })).default([]),
  big: z.array(z.object({
    id: z.string(),
    content: z.string(),
    rounds: z.string(),
    timestamp: z.number(),
    smallCount: z.number(),
  })).default([]),
  currentRound: z.number().default(0),
}).prefault({});
```

### 1.2 实现总结生成逻辑

**任务**:
- [ ] `generateSmallSummary()` - 生成小总结
- [ ] `generateBigSummary()` - 生成大总结
- [ ] `onMessageGenerated()` - 消息生成后触发检查
- [ ] `manualTriggerBigSummary()` - 手动触发大总结

**核心逻辑**:

```typescript
// 监听消息生成
async function onMessageGenerated(message_id: number) {
  if (!settings.value.summaryConfig.autoEnabled) return;
  
  summaryData.value.currentRound++;
  
  // 检查是否需要小总结
  if (summaryData.value.currentRound % settings.value.summaryConfig.smallInterval === 0) {
    await generateSmallSummary();
  }
  
  // 检查是否需要大总结
  if (summaryData.value.small.length >= settings.value.summaryConfig.bigThreshold) {
    await generateBigSummary();
  }
}

// 生成小总结
async function generateSmallSummary() {
  const interval = settings.value.summaryConfig.smallInterval;
  const startRound = summaryData.value.currentRound - interval + 1;
  const endRound = summaryData.value.currentRound;
  
  // 获取最近N轮消息
  const recentMessages = getChatMessages(`-${interval}-latest`);
  const content = recentMessages.map(m => m.message).join('\n\n');
  
  const prompt = `请简要总结以下${interval}轮对话的关键信息（200字以内）：\n\n${content}`;
  
  const summary = await callApiForTask('summary', prompt);
  
  summaryData.value.small.push({
    id: `small-${Date.now()}`,
    content: summary,
    rounds: `${startRound}-${endRound}`,
    timestamp: Date.now(),
  });
  
  showToast(`已生成第 ${summaryData.value.small.length} 个小总结`);
}

// 生成大总结
async function generateBigSummary() {
  const smallSummaries = summaryData.value.small;
  const firstRound = parseInt(smallSummaries[0].rounds.split('-')[0]);
  const lastRound = summaryData.value.currentRound;
  
  const content = smallSummaries.map((s, i) => `[${i+1}] ${s.content}`).join('\n\n');
  
  const prompt = `请将以下${smallSummaries.length}个小总结提炼为一个关键的长期记忆（300字以内）：\n\n${content}`;
  
  const bigSummary = await callApiForTask('summary', prompt);
  
  summaryData.value.big.push({
    id: `big-${Date.now()}`,
    content: bigSummary,
    rounds: `${firstRound}-${lastRound}`,
    timestamp: Date.now(),
    smallCount: smallSummaries.length,
  });
  
  // 清空小总结
  summaryData.value.small = [];
  
  showToast(`已生成大总结（包含 ${smallSummaries.length} 个小总结）`);
}
```

### 1.3 集成到 index.ts

**文件**: `src/galgame/index.ts`

**任务**:
- [ ] 在 `GENERATION_ENDED` 事件中调用 `onMessageGenerated`

```typescript
eventOn(tavern_events.GENERATION_ENDED, (message_id: number) => {
  // ... 现有代码
  state.mainStore?.onMessageGenerated(message_id);
});
```

---

## 📦 Phase 2: 总结UI界面

### 2.1 创建 SummaryPanel.vue

**文件**: `src/galgame/SummaryPanel.vue`

**功能**:
- [ ] 显示小总结列表（可折叠）
- [ ] 显示大总结列表
- [ ] 编辑总结内容
- [ ] 删除总结
- [ ] 重命名总结
- [ ] 手动触发大总结按钮
- [ ] 总结配置区域

**布局**:
```
┌─────────────────────────────────┐
│  [ 总结 ]              [×]      │
├─────────────────────────────────┤
│  配置区:                         │
│  小总结间隔: [5] 轮              │
│  大总结阈值: [6] 个小总结        │
│  使用API: [第二API ▼]           │
│  [√] 自动总结                    │
├─────────────────────────────────┤
│  大总结 (2)                      │
│  ┌───────────────────────────┐  │
│  │ #1 [1-30轮] 2024-03-01   │  │
│  │ 内容...                   │  │
│  │ [编辑] [删除]             │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  小总结 (3) [展开▼]             │
│  ┌───────────────────────────┐  │
│  │ #1 [31-35轮]             │  │
│  │ 内容...                   │  │
│  └───────────────────────────┘  │
├─────────────────────────────────┤
│  [手动触发大总结]                │
└─────────────────────────────────┘
```

### 2.2 集成到 HistoryPanel.vue

**任务**:
- [ ] 添加 Tab 切换（对话记录 / 总结）
- [ ] 在总结 Tab 中显示 SummaryPanel 内容

---

## 📦 Phase 3: 第二API增强

### 3.1 添加 ApiTaskConfig

**文件**: `src/galgame/store.ts`

**任务**:
- [ ] 添加 `ApiTaskConfig` schema
- [ ] 添加到 settings
- [ ] 实现统一的 `callApiForTask()` 函数

```typescript
const ApiTaskConfig = z.object({
  danmaku: z.enum(['main', 'second', 'disabled']).default('second'),
  summary: z.enum(['main', 'second', 'disabled']).default('second'),
  imageTag: z.enum(['main', 'second', 'disabled']).default('second'),
  variableUpdate: z.enum(['main', 'second', 'disabled']).default('main'),
});

// 统一任务执行
async function callApiForTask(
  task: 'danmaku' | 'summary' | 'imageTag' | 'variableUpdate',
  prompt: string,
): Promise<string> {
  const apiType = settings.value.apiTaskConfig[task];
  
  if (apiType === 'disabled') return '';
  
  if (apiType === 'second') {
    return await callSecondApiWithTracking(task, { systemPrompt: prompt });
  } else {
    // 使用主API
    const result = await generate({ user_input: prompt, should_silence: true });
    return result;
  }
}
```

### 3.2 第二API内容追踪

**任务**:
- [ ] 添加 `secondApiGenerations` ref
- [ ] 实现 `callSecondApiWithTracking()` 包装函数
- [ ] 实现 `insertGenerationToMessage()` - 插入到消息末尾
- [ ] 实现弹窗通知

```typescript
const secondApiGenerations = ref<SecondApiGeneration[]>([]);

async function callSecondApiWithTracking(
  task: 'danmaku' | 'summary' | 'imageTag' | 'variable',
  payload: any,
): Promise<string> {
  const result = await callSecondApi(task, payload);
  const content = typeof result === 'string' ? result : JSON.stringify(result);
  
  // 记录生成
  const generation: SecondApiGeneration = {
    id: `gen-${Date.now()}`,
    type: task,
    content,
    timestamp: Date.now(),
    messageId: -1,
    inserted: false,
  };
  
  secondApiGenerations.value.push(generation);
  
  // 插入到最新消息末尾
  await insertGenerationToMessage(generation);
  
  // 弹窗通知
  showToast(`第二API已生成${task}内容`);
  
  return content;
}

async function insertGenerationToMessage(gen: SecondApiGeneration) {
  const messages = getChatMessages('latest');
  const lastMessage = messages[messages.length - 1];
  
  if (!lastMessage) return;
  
  const marker = `\n<!-- 第二API生成(${gen.type}): ${gen.content} -->`;
  const updatedMessage = lastMessage.message + marker;
  
  await setChatMessages([{ ...lastMessage, message: updatedMessage }], lastMessage.id);
  
  gen.messageId = lastMessage.id;
  gen.inserted = true;
}
```

### 3.3 生图tag生成

**任务**:
- [ ] 修改 `triggerImageGenAfterGeneration()` 使用第二API生成tag

```typescript
async function triggerImageGenAfterGeneration(message_id: number) {
  if (!settings.value.imageGenEnabled) return;
  
  const messages = getChatMessages(message_id);
  const context = messages[0]?.message?.slice(0, 500) || '';
  
  let prompt = context;
  
  // 如果启用第二API生成tag
  if (settings.value.apiTaskConfig.imageTag === 'second') {
    const tagPrompt = `根据以下场景描述，生成适合的图片tag（英文，逗号分隔，不超过50词）：\n${context}`;
    prompt = await callApiForTask('imageTag', tagPrompt);
  }
  
  if (settings.value.backgroundGenEnabled) requestBackgroundImage(prompt);
  if (settings.value.cgGenEnabled) requestCgImage(prompt);
}
```

---

## 📦 Phase 4: API配置UI

### 4.1 创建 ApiTaskConfigPanel.vue

**文件**: `src/galgame/ApiTaskConfigPanel.vue`

**功能**:
- [ ] 每个功能选择使用哪个API
- [ ] 第二API生成历史查看
- [ ] 跳转到对应消息

**布局**:
```
┌─────────────────────────────────┐
│  [ API任务分配 ]        [×]     │
├─────────────────────────────────┤
│  功能          使用API           │
│  弹幕生成      [第二API ▼]      │
│  总结生成      [第二API ▼]      │
│  生图tag       [第二API ▼]      │
│  变量更新      [主API ▼]        │
├─────────────────────────────────┤
│  第二API生成历史 (5)             │
│  ┌───────────────────────────┐  │
│  │ [弹幕] 2024-03-01 12:30  │  │
│  │ 内容: ...                 │  │
│  │ [查看消息]                │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 4.2 集成到 SettingsPanel.vue

**任务**:
- [ ] 在设置面板添加"API配置"按钮
- [ ] 点击打开 ApiTaskConfigPanel

---

## 📦 Phase 5: 世界书绿灯机制

### 5.1 世界书条目增强

**任务**:
- [ ] 扩展世界书条目数据结构
- [ ] 实现绿灯关键词提取
- [ ] 实现上下文扫描
- [ ] 实现动态启用/禁用

```typescript
// 绿灯机制
function updateWorldbookGreenLights() {
  const worldbook = getWorldbook();
  const recentMessages = getChatMessages('-5-latest'); // 最近5轮
  const recentText = recentMessages.map(m => m.message).join('\n');
  
  worldbook.entries.forEach(entry => {
    if (!entry.greenLight) return;
    
    // 检查关键词是否在最近消息中
    const hasKeyword = entry.greenLightKeywords.some(kw => 
      recentText.includes(kw)
    );
    
    entry._showInContext = hasKeyword;
  });
  
  replaceWorldbook(worldbook);
}

// 在消息生成后调用
eventOn(tavern_events.GENERATION_ENDED, () => {
  updateWorldbookGreenLights();
});
```

### 5.2 世界书管理UI

**任务**:
- [ ] 创建世界书条目编辑界面
- [ ] 添加绿灯开关
- [ ] 添加关键词编辑
- [ ] 添加API分配选择

---

## 📦 Phase 6: 测试与优化

### 6.1 功能测试

- [ ] 小总结自动生成测试
- [ ] 大总结自动生成测试
- [ ] 手动触发总结测试
- [ ] 总结编辑/删除测试
- [ ] 第二API生图tag测试
- [ ] 第二API内容插入测试
- [ ] 绿灯条目测试
- [ ] API切换测试

### 6.2 性能优化

- [ ] 总结数据量控制（大总结最多保留10个）
- [ ] 第二API生成历史清理（最多保留50条）
- [ ] 世界书扫描性能优化

### 6.3 错误处理

- [ ] 第二API失败降级
- [ ] 总结生成失败重试
- [ ] 数据持久化失败恢复

---

## 📊 实现优先级

### P0 - 核心功能（必须完成）
1. Phase 1.1-1.2: 基础总结系统
2. Phase 3.1-3.2: 第二API增强
3. Phase 1.3: 集成到 index.ts

### P1 - UI界面（重要）
4. Phase 2.1-2.2: 总结UI
5. Phase 4.1-4.2: API配置UI

### P2 - 高级功能
6. Phase 5.1-5.2: 世界书绿灯机制
7. Phase 6: 测试与优化

---

## 🔧 技术细节

### 数据持久化

所有数据存储到聊天变量：

```typescript
watchEffect(() => {
  insertOrAssignVariables({
    vn_summary_data: klona(summaryData.value),
    vn_summary_config: klona(settings.value.summaryConfig),
    vn_second_api_generations: klona(secondApiGenerations.value),
    vn_api_task_config: klona(settings.value.apiTaskConfig),
  }, { type: 'chat' });
});
```

### 消息插入格式

第二API生成内容插入格式：

```html
<!-- 第二API生成(summary): 这是一个总结内容... -->
<!-- 第二API生成(imageTag): post-apocalyptic, wasteland, newspaper style -->
<!-- 第二API生成(danmaku): 弹幕1\n弹幕2\n弹幕3 -->
```

### API调用流程

```
用户输入 → 主API生成 → GENERATION_ENDED事件
                          ↓
                    检查是否需要总结
                          ↓
                    调用第二API生成总结
                          ↓
                    插入到消息末尾
                          ↓
                    弹窗通知用户
```

---

## 📝 注意事项

1. **总结触发时机**: 在 `GENERATION_ENDED` 事件中触发，确保消息已完全生成
2. **第二API降级**: 当第二API不可用时，自动跳过并弹窗提示错误
3. **数据清理**: 定期清理过多的历史数据，避免变量过大
4. **绿灯性能**: 世界书扫描只检查最近5轮，避免性能问题
5. **UI响应**: 所有异步操作都要有loading状态和错误提示

---

## 🎯 预期效果

完成后，系统将具备：

1. ✅ 自动按轮数生成小总结和大总结
2. ✅ 可在历史界面查看和编辑所有总结
3. ✅ 第二API生成的内容自动插入消息（不影响前端显示）
4. ✅ 灵活配置每个功能使用哪个API
5. ✅ 世界书条目根据上下文自动启用/禁用
6. ✅ 完整的第二API生成历史追踪
