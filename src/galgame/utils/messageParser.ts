import type { MessageBlock, WorldbookResources, ImageTagBlock } from '../types/message';
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
 * 将 \n 转义序列转换为真实换行，并按换行拆分文本
 */
function splitByNewline(text: string): string[] {
  if (!text) return [];
  // 将 \n 转义序列转换为真实换行
  const normalized = text.replace(/\\n/g, '\n');
  return normalized.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * 解析键值对字符串
 * 支持值中包含换行
 */
function parsePairs(content: string): { key: string; value: string }[] {
  const pairRegex = /([^:：]+)[:：]\s*/g;
  const pairs: { key: string; value: string }[] = [];

  let pairMatch;
  while ((pairMatch = pairRegex.exec(content)) !== null) {
    const key = pairMatch[1].trim();
    const valueStart = pairMatch.index + pairMatch[0].length;
    const nextPairMatch = content.slice(valueStart).match(/\|{2}\s*([^:：]+)[:：]\s*/);
    const valueEnd = nextPairMatch && nextPairMatch.index !== undefined
      ? valueStart + nextPairMatch.index
      : content.length;
    const value = content.slice(valueStart, valueEnd).trim();
    pairs.push({ key, value });
  }

  return pairs;
}

/**
 * 根据键值对数组创建消息块
 */
function createBlock(type: string, pairs: { key: string; value: string }[], resources: WorldbookResources): MessageBlock {
  const block: MessageBlock = { type: type as MessageBlock['type'] };

  if (type === 'character') {
    block.character = pairs.find(p => p.key === '角色名' || p.key === '角色')?.value || '';
    block.scene = pairs.find(p => p.key === '场景')?.value || '';
    block.motion = pairs.find(p => p.key === '动作')?.value || '';
    block.expression = pairs.find(p => p.key === '表情')?.value || '';
    block.text = pairs.find(p => p.key === '台词')?.value || '';

    const cgScene = pairs.find(p => p.key === 'CG场景' || p.key === 'CG')?.value || '';
    if (cgScene) {
      block.isCG = true;
      block.cgImageUrl = matchCG(cgScene, resources);
    } else {
      if (block.scene) block.sceneImageUrl = matchBackground(block.scene, resources);
      if (block.character) block.spriteImageUrl = matchSprite(block.character, resources);
    }
  } else if (type === 'narration') {
    block.scene = pairs.find(p => p.key === '场景')?.value || '';
    block.message = pairs.find(p => p.key === '旁白')?.value || '';
    if (block.scene) block.sceneImageUrl = matchBackground(block.scene, resources);
  } else if (type === 'blacktext') {
    block.message = pairs.find(p => p.key === '黑屏文字')?.value || '';
  } else if (type === 'user') {
    block.scene = pairs.find(p => p.key === '场景')?.value || '';
    block.text = pairs.find(p => p.key === '台词')?.value || '';
    if (block.scene) block.sceneImageUrl = matchBackground(block.scene, resources);
  }

  return block;
}

/**
 * 解析单个消息块
 * 如果文本字段中包含换行，会自动拆分成多个块
 */
function parseBlock(blockText: string, resources: WorldbookResources): MessageBlock[] {
  const match = blockText.match(/^\[\[(\w+)\|\|(.*?)\]\]$/s);
  if (!match) return [];

  const [, type, content] = match;
  const pairs = parsePairs(content);

  // 找出文本字段（不处理转义）
  let textField = '';
  if (type === 'character' || type === 'user') {
    textField = pairs.find(p => p.key === '台词')?.value || '';
  } else if (type === 'narration') {
    textField = pairs.find(p => p.key === '旁白')?.value || '';
  } else if (type === 'blacktext') {
    textField = pairs.find(p => p.key === '黑屏文字')?.value || '';
  }

  // 使用 splitByNewline 处理 \n 转义和换行拆分
  const lines = splitByNewline(textField);

  // 如果拆分后只有一个片段，直接返回一个块
  if (lines.length <= 1) {
    return [createBlock(type, pairs, resources)];
  }

  // 拆分成多个块
  return lines.map(line => {
    const newPairs = pairs.map(p => {
      if (p.key === '台词' || p.key === '旁白' || p.key === '黑屏文字') {
        return { key: p.key, value: line };
      }
      return { ...p };
    });
    return createBlock(type, newPairs, resources);
  });
}

/**
 * 从消息中提取 <content>...</content> 标签内的内容
 * 若消息中没有 <content> 标签，返回空字符串（VN 主舞台不显示任何内容）
 */
export function extractContentTag(message: string): string {
  const match = message.match(/<content>([\s\S]*?)<\/content>/);
  return match ? match[1].trim() : '';
}

/**
 * 将 \n 转义序列转换为真实换行，并按换行拆分文本
 */
function splitByNewlineForPlainText(text: string): string[] {
  if (!text) return [];
  const normalized = text.replace(/\\n/g, '\n');
  return normalized.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0);
}

/**
 * 从消息中提取 <content>...</content> 标签内的纯文本对话内容
 * 提取对话台词、旁白等纯文本，过滤掉格式标记
 * 支持换行分隔，每行视为一个独立段落
 * 支持 \n 转义序列
 */
export function extractPlainTextFromContent(message: string): string {
  const content = extractContentTag(message);
  if (!content) return '';

  const lines: string[] = [];

  // 匹配所有 [[...]] 块（支持换行）
  const blockRegex = /\[\[.*?\]\]/gs;
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(content)) !== null) {
    // 提取格式块之间的纯文本（作为旁白）
    const between = content.slice(lastIndex, match.index).trim();
    if (between) {
      const lineParts = splitByNewlineForPlainText(between);
      lines.push(...lineParts);
    }

    // 解析格式块中的文本
    const blockText = match[0];
    const innerMatch = blockText.match(/^\[\[\w+\|\|(.*?)\]\]$/s);
    if (innerMatch) {
      const contentInner = innerMatch[1];
      const pairs = parsePairs(contentInner);

      for (const pair of pairs) {
        if (['台词', '旁白', '黑屏文字'].includes(pair.key) && pair.value) {
          const lineParts = splitByNewlineForPlainText(pair.value);
          lines.push(...lineParts);
        }
      }
    }

    lastIndex = blockRegex.lastIndex;
  }

  // 处理最后剩余的文本
  const remaining = content.slice(lastIndex).trim();
  if (remaining) {
    const lineParts = splitByNewlineForPlainText(remaining);
    lines.push(...lineParts);
  }

  return lines.join('\n');
}

/**
 * 解析消息为消息块数组
 *
 * 解析规则：
 * 1. 仅解析 <content>...</content> 标签内的内容，标签外的内容全部忽略
 * 2. 若消息中没有 <content> 标签，返回空数组（VN 主舞台不显示任何内容）
 * 3. 标签内按 [[...]] 格式解析对话块；无格式文本视为旁白
 * 4. 消息块内的换行会自动拆分为多个块
 */
export async function parseMessageBlocks(message: string, lastScene?: string): Promise<MessageBlock[]> {
  console.info('[MessageParser] 开始解析消息:', message.substring(0, 100));

  const contentText = extractContentTag(message);
  if (!contentText) {
    console.info('[MessageParser] 消息中没有 <content> 标签，忽略不显示');
    return [];
  }

  console.info('[MessageParser] 提取到 <content> 内容:', contentText.substring(0, 200));

  const resources = await loadWorldbookResources();
  const blocks: MessageBlock[] = [];

  // 匹配所有 [[...]] 块（支持换行）
  const blockRegex = /\[\[.*?\]\]/gs;
  const matches = contentText.match(blockRegex);

  if (!matches || matches.length === 0) {
    // 没有找到格式化块，返回纯文本作为旁白
    console.info('[MessageParser] <content> 内未找到格式化块，返回纯文本旁白');
    return [
      {
        type: 'narration',
        message: contentText.trim(),
      },
    ];
  }

  // 解析每个块（parseBlock 可能返回多个块）
  let currentScene = lastScene;

  for (const match of matches) {
    const parsedBlocks = parseBlock(match, resources);
    for (const block of parsedBlocks) {
      // 场景继承机制
      if (block.scene) {
        currentScene = block.scene;
      } else if (currentScene && !block.isCG) {
        block.scene = currentScene;
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

/**
 * 标准化文本用于模糊匹配
 */
function normalizeForFuzzyMatch(text: string): string {
  return text
    .replace(/[-/\\_.\s]/g, '') // 去除特殊符号
    .toLowerCase(); // 转小写
}

/**
 * 模糊匹配：检查 source 是否包含 target 或 target 包含 source
 * 用于 content 中的场景名与图像标签 title 的匹配
 */
export function fuzzyMatchTitle(source: string, target: string): boolean {
  const a = normalizeForFuzzyMatch(source);
  const b = normalizeForFuzzyMatch(target);
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * 从消息中提取所有 <background> 和 <image> 标签块
 *
 * 格式：
 * <background>
 * title###场景名###
 * image###sfw, 1girl, sunset###
 * </background>
 *
 * <image>
 * title###CG名###
 * image###sfw, 1boy, 1girl, rain###
 * </image>
 *
 * 容错处理：
 * - 支持宽松标签闭合：`</background>`、`</background `（忽略多余空格）
 * - title 缺失时设为空字符串（仍加入队列但不显示）
 * - prompt 缺失时忽略整个块
 */
export function extractImageTagBlocks(message: string): ImageTagBlock[] {
  const blocks: ImageTagBlock[] = [];

  // 匹配 <background>...</background> 和 <image>...</image>
  // 支持宽松闭合标签，如 </background> 或 </background >
  const tagRegex = /<(background|image)>([\s\S]*?)<\/\1\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(message)) !== null) {
    const typeStr = match[1].toLowerCase();
    const content = match[2];

    // 提取 type
    const type: 'background' | 'cg' = typeStr === 'background' ? 'background' : 'cg';

    // 提取 title（可选，缺失时设为空字符串）
    let title = '';
    const titleMatch = content.match(/title###([\s\S]*?)###/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    }

    // 提取 prompt（必需，缺失时忽略整个块）
    const promptMatch = content.match(/image###([\s\S]*?)###/i);
    if (!promptMatch) {
      console.warn(`[MessageParser] 跳过图像块（缺少 image 字段）: <${typeStr}>...`);
      continue;
    }
    const prompt = promptMatch[1].trim();

    if (!prompt) {
      console.warn(`[MessageParser] 跳过图像块（空 prompt）: <${typeStr}>...`);
      continue;
    }

    blocks.push({ type, title, prompt });
    console.info(`[MessageParser] 解析图像块: type=${type}, title="${title}", prompt="${prompt.substring(0, 50)}..."`);
  }

  if (blocks.length > 0) {
    console.info(`[MessageParser] 共提取 ${blocks.length} 个图像块`);
  }

  return blocks;
}

/**
 * 从 [[...]] 块中提取场景名
 * 用于与图像标签 title 进行模糊匹配
 * 支持块内换行
 *
 * @example
 * // 输入: [[character||角色名：零||场景：教室黄昏||台词：你好]]
 * // 输出: "教室黄昏"
 */
export function extractSceneFromBlock(blockText: string): string | undefined {
  // 匹配 [[...]] 格式（支持换行）
  const match = blockText.match(/^\[\[.*?\]\]$/s);
  if (!match) return undefined;

  // 提取内容部分
  const innerMatch = match[0].match(/^\[\[.*?\|\|(.*?)\]\]$/s);
  if (!innerMatch) return undefined;

  const content = innerMatch[1];

  // 解析键值对（考虑换行）
  const pairRegex = /([^:：]+)[:：]\s*/g;
  let pairMatch;

  while ((pairMatch = pairRegex.exec(content)) !== null) {
    const key = pairMatch[1].trim();
    // 匹配 "场景" 字段
    if (key === '场景') {
      const valueStart = pairMatch.index + pairMatch[0].length;
      const nextPairMatch = content.slice(valueStart).match(/\|{2}\s*([^:：]+)[:：]\s*/);
      const valueEnd = nextPairMatch && nextPairMatch.index !== undefined
        ? valueStart + nextPairMatch.index
        : content.length;
      return content.slice(valueStart, valueEnd).trim();
    }
  }

  return undefined;
}
