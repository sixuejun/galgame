/**
 * 消息块类型定义
 */
export interface MessageBlock {
  type: 'character' | 'narration' | 'blacktext' | 'user';

  // character 类型字段
  character?: string;
  scene?: string;
  motion?: string;
  expression?: string;
  text?: string;
  isCG?: boolean;

  // narration/blacktext/user 类型字段
  message?: string;

  // 世界书资源匹配结果
  sceneImageUrl?: string; // 背景图片
  cgImageUrl?: string; // CG图片
  spriteImageUrl?: string; // 立绘图片
  motionFile?: string; // 动作文件
  expressionFile?: string; // 表情文件
}

/**
 * 世界书资源数据结构
 */
export interface BackgroundResource {
  name: string;
  file: string;
  textMappings?: string[];
}

export interface CGResource {
  name: string;
  file: string;
  textMappings?: string[];
}

export interface SpriteResource {
  name: string;
  file: string;
  textMappings?: string[];
}

export interface ModelResource {
  modelName: string;
  motions?: Array<{
    name: string;
    file: string;
    motionType: 'motion' | 'expression';
    textMappings?: string[];
  }>;
}

export interface WorldbookResources {
  backgrounds: BackgroundResource[];
  cgs: CGResource[];
  sprites: SpriteResource[];
  models: Map<string, ModelResource>;
}
