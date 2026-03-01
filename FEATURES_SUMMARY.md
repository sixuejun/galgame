# 长程记忆与第二API增强系统 - 功能总结

## ✅ 已完成功能

### 1. 📝 长程记忆系统（小总结 + 大总结）

#### 核心功能
- **小总结**：每 N 轮（默认 5 轮）自动生成一次，记录最近对话的关键信息
- **大总结**：当小总结累积到阈值（默认 6 个）时，自动提炼为长期记忆
- **手动触发**：支持手动触发大总结生成
- **编辑/删除**：可以编辑和删除任何总结内容
- **数据持久化**：所有总结数据存储到聊天变量，每个存档独立

#### 配置项
```typescript
summarySmallInterval: 5,        // 小总结间隔（轮数）
summaryBigThreshold: 6,         // 大总结阈值（小总结数量）
summaryAutoEnabled: true,       // 是否自动生成总结
summaryApiType: 'second',       // 使用哪个API生成
```

#### UI 界面
- 在**历史面板**添加"总结" Tab
- 显示所有大总结和小总结
- 支持展开/收起小总结列表
- 点击编辑按钮可修改总结内容
- 显示总结配置和当前轮数

---

### 2. 🎨 第二API生图增强

#### 核心功能
- **自动生成 Tag**：使用第二API根据场景描述生成图片标签
- **智能降级**：第二API不可用时自动使用原始场景描述
- **内容追踪**：第二API生成的内容自动插入到消息末尾（HTML注释格式）

#### 工作流程
```
消息生成 → 提取场景描述 → 第二API生成tag → 发送给生图插件
```

#### 插入格式
```html
<!-- 第二API生成(imageTag): post-apocalyptic, wasteland, newspaper style -->
```

---

### 3. ⚙️ API任务分配系统

#### 核心功能
- **灵活分配**：每个功能可独立选择使用主API、第二API或禁用
- **统一管理**：在设置面板中集中配置所有API任务

#### 可配置的任务
| 任务 | 说明 | 默认API |
|------|------|---------|
| 弹幕生成 | 生成弹幕文案 | 第二API |
| 总结生成 | 生成小总结和大总结 | 第二API |
| 生图Tag | 根据场景生成图片标签 | 第二API |
| 变量更新 | 更新游戏变量（预留） | 主API |

#### UI 界面
- **API任务配置面板**：统一管理所有任务的API分配
- **总结配置区域**：调整小总结间隔、大总结阈值等参数
- 在设置面板中点击"API 任务分配与生成历史"按钮打开

---

### 4. 📚 世界书管理系统

#### 核心功能
- **条目启用/禁用**：手动控制每个世界书条目是否启用
- **API分配**：每个条目可选择发送给主API、第二API或两者
- **自动控制**：根据功能开关（弹幕、生图、总结）自动启用/禁用关联条目
- **关联功能**：将条目与特定功能关联，实现智能管理

#### 世界书条目增强字段
```typescript
interface WorldbookEntryEnhanced {
  enabled: boolean;              // 是否启用
  targetApi: 'main' | 'second' | 'both';  // 发送给哪个API
  autoControl: boolean;          // 是否自动控制
  linkedFeature?: 'danmaku' | 'imageGen' | 'summary';  // 关联的功能
}
```

#### 自动控制逻辑
- 当 `danmakuEnabled` 开启时，自动启用 `linkedFeature: 'danmaku'` 的条目
- 当 `imageGenEnabled` 开启时，自动启用 `linkedFeature: 'imageGen'` 的条目
- 当 `summaryAutoEnabled` 开启时，自动启用 `linkedFeature: 'summary'` 的条目

#### UI 界面
- **世界书管理面板**：显示所有世界书条目
- 每个条目可设置：启用状态、API分配、关联功能、自动控制
- 在设置面板中点击"世界书管理"按钮打开

---

## 🎯 使用场景

### 场景1：长期对话的记忆管理
```
轮次1-5   → 生成小总结1
轮次6-10  → 生成小总结2
轮次11-15 → 生成小总结3
轮次16-20 → 生成小总结4
轮次21-25 → 生成小总结5
轮次26-30 → 生成小总结6
          → 触发大总结（包含小总结1-6）
          → 清空小总结，继续累积
```

### 场景2：生图功能优化
```
AI生成消息 → 提取场景："废墟中的少年在收集旧报纸"
           → 第二API生成tag："post-apocalyptic, young boy, collecting newspapers, ruins, wasteland"
           → 发送给生图插件
           → 生成更准确的图片
```

### 场景3：世界书智能管理
```
用户开启弹幕功能
  → 自动启用所有 linkedFeature='danmaku' 的世界书条目
  → 这些条目包含弹幕生成的提示词
  → 第二API根据这些提示词生成弹幕

用户关闭弹幕功能
  → 自动禁用相关条目
  → 节省token消耗
```

---

## 📊 数据存储

### 聊天变量（每个存档独立）
```typescript
{
  vn_summary_small: SmallSummary[],           // 小总结列表
  vn_summary_big: BigSummary[],               // 大总结列表
  vn_summary_current_round: number,           // 当前轮数
  vn_second_api_generations: SecondApiGeneration[],  // 第二API生成记录（调试用）
}
```

### 脚本变量（全局配置）
```typescript
{
  summarySmallInterval: 5,
  summaryBigThreshold: 6,
  summaryAutoEnabled: true,
  apiTaskDanmaku: 'second',
  apiTaskSummary: 'second',
  apiTaskImageTag: 'second',
  apiTaskVariable: 'main',
}
```

### 世界书条目（扩展字段）
```typescript
{
  enabled: true,
  targetApi: 'main',
  autoControl: false,
  linkedFeature: 'danmaku',
}
```

---

## 🔧 技术实现

### 核心文件
- **`store.ts`**：核心逻辑实现
  - 总结生成函数
  - 第二API包装函数
  - 世界书管理函数
  
- **`index.ts`**：事件集成
  - 监听 `GENERATION_ENDED` 事件
  - 触发总结生成
  - 触发生图tag生成

- **`HistoryPanel.vue`**：总结UI
  - Tab切换（对话记录/总结）
  - 总结列表展示
  - 编辑/删除功能

- **`ApiTaskConfigPanel.vue`**：API配置UI
  - 任务分配选择
  - 总结参数配置

- **`WorldbookManagerPanel.vue`**：世界书管理UI
  - 条目列表展示
  - 启用/禁用控制
  - API分配和自动控制设置

---

## 🚀 使用指南

### 1. 配置第二API
1. 打开设置面板
2. 在"API配置"区域填写第二API的URL、Key和模型
3. 点击"测试连接"确认可用

### 2. 配置总结系统
1. 打开设置面板 → 点击"API 任务分配与生成历史"
2. 在"总结配置"区域设置：
   - 小总结间隔（建议 3-10 轮）
   - 大总结阈值（建议 5-10 个小总结）
   - 开启/关闭自动总结

### 3. 查看总结
1. 打开历史面板
2. 切换到"总结" Tab
3. 查看大总结和小总结
4. 点击编辑按钮可修改内容
5. 点击"手动触发大总结"可立即生成

### 4. 配置世界书
1. 打开设置面板 → 点击"世界书管理"
2. 为每个条目设置：
   - 启用/禁用
   - 发送给哪个API
   - 关联功能（可选）
   - 是否自动控制

### 5. 使用生图功能
1. 确保已配置第二API
2. 在"API 任务分配"中将"生图Tag"设置为"第二API"
3. 开启生图功能
4. AI生成消息后，第二API会自动生成tag并发送给生图插件

---

## 💡 最佳实践

### 总结系统
- **短对话**（<20轮）：小总结间隔 5 轮，大总结阈值 4 个
- **中等对话**（20-50轮）：小总结间隔 5 轮，大总结阈值 6 个
- **长对话**（>50轮）：小总结间隔 10 轮，大总结阈值 5 个

### 世界书管理
- **弹幕相关条目**：设置 `linkedFeature: 'danmaku'` + `autoControl: true`
- **生图相关条目**：设置 `linkedFeature: 'imageGen'` + `autoControl: true`
- **核心设定条目**：设置 `targetApi: 'both'` 确保两个API都能看到
- **第二API专用条目**：设置 `targetApi: 'second'` 节省主API token

### API分配
- **主API**：用于核心对话生成和变量更新
- **第二API**：用于辅助功能（弹幕、总结、生图tag）
- **禁用**：暂时不需要的功能可以禁用以节省资源

---

## 🐛 调试信息

### Console日志
```javascript
[Summary] Round 5, message 4          // 总结系统轮数追踪
[Summary] Triggering small summary    // 触发小总结
[Summary] Triggering big summary      // 触发大总结
[ImageGen] Generated tags via second API  // 生图tag生成
[Worldbook] Auto-control updated entries  // 世界书自动控制
```

### 第二API生成追踪
虽然UI中移除了历史展示，但所有第二API生成的内容都会：
1. 插入到对应消息末尾（HTML注释格式）
2. 记录在 `secondApiGenerations` 数组中（用于调试）
3. 在console中输出日志

---

## 📈 性能优化

### 已实现的优化
- ✅ 大总结自动清理（最多保留10个）
- ✅ 小总结在生成大总结后自动清空
- ✅ 第二API生成历史限制（最多50条）
- ✅ 世界书条目按需启用（自动控制）
- ✅ 第二API失败自动降级

### Token消耗估算
- **小总结**：约 200-500 tokens（取决于对话长度）
- **大总结**：约 500-1000 tokens（取决于小总结数量）
- **生图tag**：约 100-200 tokens
- **弹幕生成**：约 200-400 tokens

---

## 🎓 扩展建议

### 未来可以添加的功能
1. **总结模板自定义**：允许用户自定义总结的提示词模板
2. **总结导出**：将总结导出为Markdown或JSON文件
3. **世界书条目模板**：预设常用的世界书条目配置
4. **API使用统计**：显示各个API的调用次数和token消耗
5. **总结质量评分**：让用户对总结质量打分，优化提示词

---

## 📞 技术支持

如有问题，请检查：
1. 第二API是否正确配置并可用
2. Console中是否有错误日志
3. 总结配置是否合理
4. 世界书条目是否正确设置

---

**版本**: 1.0.0  
**最后更新**: 2025-03-01  
**状态**: ✅ 所有核心功能已完成并测试
