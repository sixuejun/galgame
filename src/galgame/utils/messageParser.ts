import type { MessageBlock, WorldbookResources } from '../types/message';
import { loadWorldbookResources } from './worldbookLoader';

/**
 * 标准化文本用于模糊匹配
 */
function normalizeText(text: string): string {
  return text
    .replace(/[-/\\_.\s]/g, '') // 去除特殊符号
    .toLowerCase(); // 转小写
}

/**
 * 模糊匹配
 */
function fuzzyMatch(source: string, target: string): boolean {
  const a = normalizeText(source);
  const b = normalizeText(target);
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * 匹配背景资源
 */
function matchBackground(scene: string, resources: WorldbookResources): string | undefined {
  if (!scene) return undefined;

  for (const bg of resources.backgrounds) {
    // 直接匹配名称
    if (fuzzyMatch(bg.name, scene)) {
      console.info(`[MessageParser] 背景匹配成功: ${scene} -> ${bg.name}`);
      return bg.file;
    }

    // 匹配 textMappings
    if (bg.textMappings) {
      for (const mapping of bg.textMappings) {
        if (fuzzyMatch(mapping, scene)) {
          console.info(`[MessageParser] 背景匹配成功(textMapping): ${scene} -> ${bg.name}`);
          return bg.file;
        }
      }
    }
  }

  console.warn(`[MessageParser] 未找到背景资源: ${scene}`);
  return undefined;
}

/**
 * 匹配CG资源
 */
function matchCG(cgScene: string, resources: WorldbookResources): string | undefined {
  if (!cgScene) return undefined;

  for (const cg of resources.cgs) {
    // 直接匹配名称
    if (fuzzyMatch(cg.name, cgScene)) {
      console.info(`[MessageParser] CG匹配成功: ${cgScene} -> ${cg.name}`);
      return cg.file;
    }

    // 匹配 textMappings
    if (cg.textMappings) {
      for (const mapping of cg.textMappings) {
        if (fuzzyMatch(mapping, cgScene)) {
          console.info(`[MessageParser] CG匹配成功(textMapping): ${cgScene} -> ${cg.name}`);
          return cg.file;
        }
      }
    }
  }

  console.warn(`[MessageParser] 未找到CG资源: ${cgScene}`);
  return undefined;
}

/**
 * 匹配立绘资源
 */
function matchSprite(character: string, resources: WorldbookResources): string | undefined {
  if (!character) return undefined;

  for (const sprite of resources.sprites) {
    // 直接匹配名称
    if (fuzzyMatch(sprite.name, character)) {
      console.info(`[MessageParser] 立绘匹配成功: ${character} -> ${sprite.name}`);
      return sprite.file;
    }

    // 匹配 textMappings
    if (sprite.textMappings) {
      for (const mapping of sprite.textMappings) {
        if (fuzzyMatch(mapping, character)) {
          console.info(`[MessageParser] 立绘匹配成功(textMapping): ${character} -> ${sprite.name}`);
          return sprite.file;
        }
      }
    }
  }

  console.warn(`[MessageParser] 未找到立绘资源: ${character}`);
  return undefined;
}

/**
 * 解析单个消息块
 */
function parseBlock(blockText: string, resources: WorldbookResources): MessageBlock | null {
  // 匹配 [[type||key:value||...]] 格式
  const match = blockText.match(/^\[\[(\w+)\|\|(.*?)\]\]$/s);
  if (!match) return null;

  const [, type, content] = match;
  const block: MessageBlock = { type: type as MessageBlock['type'] };

  // 解析键值对，支持中英文冒号、全角半角
  const pairs = content.split('||');
  const data: Record<string, string> = {};

  for (const pair of pairs) {
    const colonMatch = pair.match(/^([^:：]+)[:：](.*)$/);
    if (colonMatch) {
      const key = colonMatch[1].trim();
      const value = colonMatch[2].trim();
      data[key] = value;
    }
  }

  // 根据类型解析
  if (type === 'character') {
    block.character = data['角色名'] || data['角色'];
    block.scene = data['场景'];
    block.motion = data['动作'];
    block.expression = data['表情'];
    block.text = data['台词'];

    // 检查是否是CG场景
    const cgScene = data['CG场景'] || data['CG'];
    if (cgScene) {
      block.isCG = true;
      block.cgImageUrl = matchCG(cgScene, resources);
    } else {
      // 普通场景，匹配背景和立绘
      if (block.scene) {
        block.sceneImageUrl = matchBackground(block.scene, resources);
      }
      if (block.character) {
        block.spriteImageUrl = matchSprite(block.character, resources);
      }
    }
  } else if (type === 'narration') {
    block.scene = data['场景'];
    block.message = data['旁白'];

    if (block.scene) {
      block.sceneImageUrl = matchBackground(block.scene, resources);
    }
  } else if (type === 'blacktext') {
    block.message = data['黑屏文字'];
  } else if (type === 'user') {
    block.scene = data['场景'];
    block.text = data['台词'];

    if (block.scene) {
      block.sceneImageUrl = matchBackground(block.scene, resources);
    }
  }

  return block;
}

/**
 * 解析消息为消息块数组
 */
export async function parseMessageBlocks(message: string, lastScene?: string): Promise<MessageBlock[]> {
  console.info('[MessageParser] 开始解析消息:', message.substring(0, 100));

  const resources = await loadWorldbookResources();
  const blocks: MessageBlock[] = [];

  // 匹配所有 [[...]] 块
  const blockRegex = /\[\[.*?\]\]/gs;
  const matches = message.match(blockRegex);

  if (!matches || matches.length === 0) {
    // 没有找到格式化块，返回纯文本块
    console.info('[MessageParser] 未找到格式化块，返回纯文本');
    return [
      {
        type: 'narration',
        message: message.trim(),
      },
    ];
  }

  // 解析每个块
  let currentScene = lastScene;

  for (const match of matches) {
    const block = parseBlock(match, resources);
    if (block) {
      // 场景继承机制
      if (block.scene) {
        currentScene = block.scene;
      } else if (currentScene && !block.isCG) {
        block.scene = currentScene;
        // 如果继承了场景，尝试匹配背景
        if (!block.sceneImageUrl) {
          block.sceneImageUrl = matchBackground(currentScene, resources);
        }
      }

      blocks.push(block);
    }
  }

  console.info(`[MessageParser] 解析完成，共 ${blocks.length} 个消息块`);
  return blocks;
}
