import { z } from 'zod';
import _ from 'lodash';

const 角色Schema = z.object({
  末世前职业: z.string().prefault('未知'),
  与user的关系: z.string().prefault('陌生人'),
  羁绊值: z.coerce.number().transform(value => _.clamp(value, 0, 100)).prefault(10),
  能力: z.string().prefault('无'),
  状态: z.string().prefault('正常'),
});

// ===== 系统控制变量 Schema（仅前端使用）=====

const 系统任务控制 = z.object({
  vn_task_danmaku: z.boolean().prefault(false),
  vn_task_imageGen: z.boolean().prefault(false),
  vn_task_shop: z.boolean().prefault(false),
});

const 第二API生成记录 = z.object({
  id: z.string(),
  type: z.enum(['danmaku', 'imageTag', 'variable', 'boardGameEvent']),
  content: z.string(),
  timestamp: z.number(),
  messageId: z.number(),
  inserted: z.boolean(),
});

const 系统人格消息 = z.object({
  role: z.enum(['user', 'assistant', 'proactive', 'divider', 'riddle_divider', 'riddle_start', 'riddle_end_pending', 'riddle_end']),
  text: z.string(),
});

const 图片卡牌 = z.object({
  id: z.string(),
  imageData: z.string(),
  type: z.enum(['background', 'cg']),
  timestamp: z.number(),
});

export const Schema = z.object({
  日期: z.string().prefault('2月11日'),
  时间: z.string().prefault('09:00'),
  地点: z.string().prefault(''),
  经历天数: z.coerce.number().prefault(1),
  世界崩坏程度: z.coerce.number().transform(value => _.clamp(value, 0, 100)).prefault(0),
  世界状态: z.array(z.string()).prefault(['初始状态：城市尚未完全崩坏，生活迹象依稀可见。']),
  
  个人状态: z.object({
    健康: z.coerce.number().transform(value => _.clamp(value, 0, 100)).prefault(100),
    精神: z.coerce.number().transform(value => _.clamp(value, 0, 100)).prefault(100),
    特殊: z.array(z.string()).prefault(['无']),
  }).prefault({}),
  
  个人属性: z.object({
    运气: z.coerce.number().transform(value => _.clamp(value, 0, 5)).prefault(5),
    体质: z.coerce.number().transform(value => _.clamp(value, 0, 5)).prefault(5),
    耐力: z.coerce.number().transform(value => _.clamp(value, 0, 5)).prefault(5),
    特殊能力: z.array(z.string()).prefault(['异度空间']),
  }).prefault({}),
  
  收集物: z.record(z.string(), z.any()).prefault({}),
  
  金币: z.coerce.number().prefault(0),
  
  记事簿: z.object({
    进行中: z.array(z.string()).prefault([]),
    已完成: z.array(z.string()).prefault([]),
  }).prefault({}),
  
  角色: z.record(z.string().describe('角色姓名'), 角色Schema).prefault({}),
  
  殷姒: z.object({
    羁绊值: z.coerce.number().transform(value => _.clamp(value, 0, 100)).prefault(50),
    状态: z.object({
      心情: z.array(z.string()).prefault(['愉悦']),
      身体: z.array(z.string()).prefault(['健康']),
      行动: z.array(z.string()).prefault(['整理装备']),
    }).prefault({}),
  }).prefault({}),
  
  珠罗刹: z.object({
    是否解锁: z.boolean().prefault(false),
    羁绊值: z.coerce.number().transform(value => _.clamp(value, 0, 100)).prefault(0),
    状态: z.object({
      心情: z.array(z.string()).prefault(['乏味']),
      身体: z.array(z.string()).prefault(['轻微感冒']),
      行动: z.array(z.string()).prefault(['例行吃药']),
    }).prefault({}),
  }).prefault({}),
  
  知春困: z.object({
    是否解锁: z.boolean().prefault(false),
    羁绊值: z.coerce.number().transform(value => _.clamp(value, 0, 100)).prefault(0),
    状态: z.object({
      心情: z.array(z.string()).prefault(['淡然']),
      身体: z.array(z.string()).prefault(['健康']),
      行动: z.array(z.string()).prefault(['翻阅书籍']),
    }).prefault({}),
  }).prefault({}),
  
  剧情: z.object({
    当前事件: z.array(z.string()).prefault(['无']),
    事件大纲: z.array(z.string()).prefault(['无']),
  }).prefault({}),

  // ===== 系统控制变量（仅前端使用）=====
  ...系统任务控制.shape,
  vn_second_api_generations: z.array(第二API生成记录).prefault([]),
  vn_system_chats: z.record(z.string(), z.array(系统人格消息)).prefault({}),
  vn_unlocked_personality_ids: z.array(z.string()).prefault(['sys_calm']),
  vn_last_active_unlocked_personality_id: z.string().prefault('sys_calm'),
  vn_bg_gen_enabled: z.boolean().prefault(false),
  vn_cg_gen_enabled: z.boolean().prefault(false),
  vn_image_cards: z.array(图片卡牌).prefault([]),
});
