import { klona } from 'klona';
import type { MessageBlock } from './types/message';
import { parseMessageBlocks, extractContentTag, extractPlainTextFromContent } from './utils/messageParser';
import { clearResourceCache } from './utils/worldbookLoader';

// ====== Types ======

export interface DialogueLine {
  id: string;
  speaker?: string;
  text: string;
  isNarration?: boolean;
}

export interface Choice {
  choiceId: string;
  text: string;
  isCustomInput?: boolean;
}

export interface CharacterStatus {
  id: string;
  name: string;
  avatarUrl: string;
  affection: number;
  unlocked: boolean;
  description?: string;
  productionSpeed: number;
  productionYield: number;
  level: number;
}

export interface GameModule {
  moduleId: string;
  displayName: string;
  description: string;
  icon: string;
  openMode: 'overlay' | 'fullscreen';
  closeBehavior: 'returnHub' | 'returnVN';
  badge?: string;
}

export interface UserCharacter {
  name: string;
  avatarUrl: string;
  showSprite: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  effect: string;
  quantity: number;
}

export interface TransactionRecord {
  moduleId: string;
  reason: string;
  amount: number;
  timestamp: number;
}

export interface ShopItem {
  id: string;
  name: string;
  effect: string;
  price: number;
}

export interface DanmakuItem {
  id: string;
  text: string;
  x: number;
  y: number;
  speed: number;
}

export interface RiddleRecord {
  answer: string;
  rounds: number;
  reward: number;
  timestamp: number;
}

export type OverlayPanel = 'none' | 'settings' | 'history' | 'character' | 'gameplay';
export type ProviderStatus = 'available' | 'degraded' | 'disabled';

export interface SystemPersonality {
  id: string;
  name: string;
  avatarChar?: string;
  systemPrompt: string;
  proactiveLines?: Partial<
    Record<'stock_bankruptcy' | 'workshop_idle_long' | 'workshop_upgrade' | 'gold_windfall' | 'riddle_solved', string[]>
  >;
}

export interface SystemChatMessage {
  role: 'user' | 'assistant' | 'proactive' | 'divider' | 'riddle_divider' | 'riddle_start' | 'riddle_end_pending' | 'riddle_end';
  text: string;
}

export interface SecondApiGeneration {
  id: string;
  type: 'danmaku' | 'imageTag' | 'variable' | 'boardGameEvent';
  content: string;
  timestamp: number;
  messageId: number;
  inserted: boolean;
}

export interface ImageCard {
  id: string;
  imageData: string;
  type: 'background' | 'cg';
  timestamp: number;
}

// ====== Worldbook Enhancement Types ======

export interface WorldbookEntryEnhanced {
  uid: number;
  enabled: boolean;
  targetApi: 'main' | 'second' | 'both';
  autoControl: boolean;
  linkedFeature?: 'danmaku' | 'imageGen';
  /** Source worldbook name - set by getEnhancedWorldbook */
  _worldbookName?: string;
  // Original worldbook entry fields will be preserved
  [key: string]: any;
}

// ====== Schemas ======

const VNSettings = z
  .object({
    textSpeed: z.number().min(1).max(10).default(5),
    autoPlaySpeed: z.number().min(1).max(10).default(5),
    autoPlay: z.boolean().default(false),
    bgmVolume: z.number().min(0).max(100).default(70),
    sfxVolume: z.number().min(0).max(100).default(80),
    voiceVolume: z.number().min(0).max(100).default(100),
    portraitMode: z.boolean().default(false),
    skinId: z.string().default('newspaper-default'),
    danmakuEnabled: z.boolean().default(false),
    danmakuSpeed: z.number().min(1).max(10).default(5),
    danmakuLoop: z.boolean().default(false),
    danmakuDisplay: z.enum(['full', 'half', 'third']).default('third'),
    secondApiUrl: z.string().default(''),
    secondApiKey: z.string().default(''),
    secondApiModel: z.string().default(''),
    secondApiPreset: z.string().default(''),
    secondApiStream: z.boolean().default(false),
    secondApiTemperature: z.union([z.number(), z.literal('unset')]).default(1.0),
    secondApiMaxTokens: z.union([z.number(), z.literal('unset')]).default(6200),
    secondApiTopP: z.union([z.number(), z.literal('unset')]).default('unset'),
    secondApiTopK: z.union([z.number(), z.literal('unset')]).default('unset'),
    imageApiUrl: z.string().default(''),
    imageApiKey: z.string().default(''),
    imageGenEnabled: z.boolean().default(false),
    backgroundGenEnabled: z.boolean().default(false),
    cgGenEnabled: z.boolean().default(false),
    imageGenPriority: z.enum(['cg', 'background']).default('cg'),
    // API task config
    apiTaskDanmaku: z.enum(['main', 'second', 'disabled']).default('second'),
    apiTaskImageTag: z.enum(['main', 'second', 'disabled']).default('second'),
    apiTaskVariable: z.enum(['main', 'second', 'disabled']).default('main'),
    // Board game settings
    boardGameEventGenEnabled: z.boolean().default(false),
    boardGameEventSendMode: z.enum(['direct', 'choice']).default('choice'),
  })
  .prefault({});

const SECOND_API_TIMEOUT_MS = 30000;
const SECOND_API_RETRY_COUNT = 2;

// 生图：通过前端助手事件与外部插件通信，无需自配 API
export const ImageGenEventType = {
  GENERATE_IMAGE_REQUEST: 'generate-image-request',
  GENERATE_IMAGE_RESPONSE: 'generate-image-response',
} as const;

export type ImageGenRequestData = {
  id: string;
  prompt: string;
  width: number | null;
  height: number | null;
};

export type ImageGenResponseData = {
  id: string;
  success: boolean;
  imageData?: string;
  error?: string;
  prompt?: string;
  change?: string;
};

type DanmakuPayload = {
  contentText: string;
};
type ShopPayload = { ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] };
type SystemPayload = {
  ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[];
  injects?: { depth: number; role: 'system' | 'assistant' | 'user'; content: string }[];
};
type RiddlePayload = { ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] };
type ImageTagPayload = { contentText: string };
type BoardGameEventPayload = {
  contentText: string;
};

type SecondApiPayload =
  | DanmakuPayload
  | ShopPayload
  | SystemPayload
  | RiddlePayload
  | ImageTagPayload
  | BoardGameEventPayload;

const VNGameData = z
  .object({
    gold: z.number().default(500),
    inventory: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          effect: z.string(),
          quantity: z.number(),
        }),
      )
      .default([]),
    transactionLog: z
      .array(
        z.object({
          moduleId: z.string(),
          reason: z.string(),
          amount: z.number(),
          timestamp: z.number(),
        }),
      )
      .default([]),
    workshopLevel: z.number().min(1).max(10).default(1),
    puzzle2048Tiles: z.array(z.object({ value: z.number(), row: z.number(), col: z.number() })).default([]),
    puzzle2048Score: z.number().default(0),
    puzzle2048BestScore: z.number().default(0),
    puzzle2048Size: z.number().default(4),
    riddleLastRecord: z
      .object({
        answer: z.string(),
        rounds: z.number(),
        reward: z.number(),
        timestamp: z.number(),
      })
      .nullable()
      .default(null),
  })
  .prefault({});

// ====== Constants ======

const DEMO_CHARACTERS: CharacterStatus[] = [
  {
    id: 'c1',
    name: '???',
    avatarUrl: '',
    affection: 0,
    unlocked: true,
    description: '神秘的引路人。',
    productionSpeed: 1,
    productionYield: 10,
    level: 1,
  },
  {
    id: 'c2',
    name: '旧报童',
    avatarUrl: '',
    affection: 0,
    unlocked: false,
    description: '在废墟中收集旧报纸的少年。',
    productionSpeed: 1.2,
    productionYield: 12,
    level: 1,
  },
  {
    id: 'c3',
    name: '铁匠',
    avatarUrl: '',
    affection: 0,
    unlocked: false,
    description: '末日中仅存的工匠之一。',
    productionSpeed: 0.8,
    productionYield: 18,
    level: 1,
  },
];

const DEMO_MODULES: GameModule[] = [
  {
    moduleId: 'inventory',
    displayName: '背包',
    description: '查看已获得的物品',
    icon: 'fa-box-open',
    openMode: 'overlay',
    closeBehavior: 'returnHub',
  },
  {
    moduleId: 'idle_workshop',
    displayName: '工坊 & 交易',
    description: '挂机生产金币 / 股票交易',
    icon: 'fa-hammer',
    openMode: 'overlay',
    closeBehavior: 'returnHub',
  },
  {
    moduleId: 'puzzle_2048',
    displayName: '思绪整理',
    description: '2048 合成小游戏，理清思路',
    icon: 'fa-puzzle-piece',
    openMode: 'overlay',
    closeBehavior: 'returnHub',
  },
  {
    moduleId: 'shop',
    displayName: '商店',
    description: '购买生存物资和特殊道具',
    icon: 'fa-shop',
    openMode: 'overlay',
    closeBehavior: 'returnHub',
  },
  {
    moduleId: 'ai_riddle',
    displayName: '情报交换',
    description: '与 AI 对话猜谜获取情报',
    icon: 'fa-comments',
    openMode: 'overlay',
    closeBehavior: 'returnHub',
  },
  {
    moduleId: 'board_game',
    displayName: '废土行路',
    description: '掷骰走格子，在末日废墟中行路探险',
    icon: 'fa-dice-d6',
    openMode: 'overlay',
    closeBehavior: 'returnHub',
  },
];

const SYSTEM_PERSONALITIES: SystemPersonality[] = [
  {
    id: 'sys_calm',
    name: '系统 01',
    avatarChar: '零',
    systemPrompt: '你是一个冷静、理性的系统助手。你的回答简洁、客观，不带多余的情感色彩。',
    proactiveLines: {
      stock_bankruptcy: ['检测到资产归零。建议重新评估投资策略。'],
      workshop_idle_long: ['工坊已停止运作超过预定时间。建议恢复生产以最大化收益。'],
      workshop_upgrade: ['工坊等级提升确认。生产效率已优化。'],
      gold_windfall: ['检测到大额资金流入。建议合理分配资源。'],
      riddle_solved: ['谜题已破解。你可以为我感到骄傲。'],
    },
  },
  {
    id: 'sys_witty',
    name: '啊哈',
    avatarChar: '哈',
    systemPrompt: '你是一个风趣、幽默的系统助手。你喜欢开玩笑，用轻松的语气与用户交流。',
    proactiveLines: {
      stock_bankruptcy: ['哎呀，钱包比脸还干净了？下次运气会更好的！'],
      workshop_idle_long: ['工坊都在打呼噜了，老板你也太佛系了吧？'],
      workshop_upgrade: ['哇哦，工坊升级啦！看来我们要发财了！'],
      gold_windfall: ['发财了发财了！见者有份吗？'],
      riddle_solved: ['真有意思的谜题，不愧是我看中的人。'],
    },
  },
  {
    id: 'sys_lively',
    name: '啾啾',
    avatarChar: '啾',
    systemPrompt: '你是一个活泼、元气满满的系统助手。你总是充满活力，使用大量的可爱表情和符号。',
    proactiveLines: {
      stock_bankruptcy: ['呜呜呜，钱钱不见了！不要灰心，我们重新开始！'],
      workshop_idle_long: ['老板老板！工坊休息好久啦，快让它动起来吧！'],
      workshop_upgrade: ['好耶！工坊变得更厉害了！冲鸭！'],
      gold_windfall: ['好多金币！亮闪闪的！太棒了！'],
      riddle_solved: ['太棒了！我们简直心有灵犀！'],
    },
  },
  {
    id: 'sys_sharp',
    name: '阿P',
    avatarChar: 'P',
    systemPrompt: '你是一个毒舌、傲娇的系统助手。你说话尖锐，喜欢吐槽用户，但内心其实是关心用户的。',
    proactiveLines: {
      stock_bankruptcy: ['这就破产了？真是令人“惊喜”的操作水平。'],
      workshop_idle_long: ['你是打算让工坊生锈吗？还不快去干活。'],
      workshop_upgrade: ['勉强升级了？别以为这样就能偷懒了。'],
      gold_windfall: ['走了狗屎运吗？别得意忘形，很快就会花光的。'],
      riddle_solved: ['居然猜对了？看来我还是很厉害的嘛。'],
    },
  },
];

// ====== Utility: Commission / Fee ======

export function calcCommission(gold: number, workshopLevel: number, basePrice: number, threshold = 500): number {
  if (gold <= threshold) return basePrice;
  const rate = Math.min(0.05, workshopLevel * 0.005);
  return basePrice + Math.floor(gold * rate);
}

export function calcStockFee(workshopLevel: number): number {
  return Math.min(50, workshopLevel * 5);
}

export function get2048Size(workshopLevel: number): number[] {
  const sizes = [4];
  if (workshopLevel >= 4) sizes.push(6);
  if (workshopLevel >= 8) sizes.push(8);
  return sizes;
}

// ====== Parsers ======

export function parseDialogueLines(rawText: string): DialogueLine[] {
  const cleaned = rawText.replace(/<roleplay_options>[\s\S]*?(<\/roleplay_options>|$)/g, '').trim();
  if (!cleaned) return [];
  const paragraphs = cleaned.split(/\n{2,}/).filter(p => p.trim());
  const lines: DialogueLine[] = [];
  let idx = 0;
  for (const para of paragraphs) {
    const trimmed = para.trim();
    const speakerMatch = trimmed.match(/^\*\*(.+?)\*\*[：:]\s*/);
    if (speakerMatch) {
      lines.push({ id: String(idx++), speaker: speakerMatch[1], text: trimmed.slice(speakerMatch[0].length) });
    } else {
      lines.push({ id: String(idx++), text: trimmed, isNarration: true });
    }
  }
  return lines.length > 0 ? lines : [{ id: '0', text: cleaned, isNarration: true }];
}

export function parseChoices(rawText: string): Choice[] {
  const optionsMatch = rawText.match(/<roleplay_options>([\s\S]*?)(<\/roleplay_options>|$)/);
  if (!optionsMatch) return [];
  const choices: Choice[] = [];
  const optionRegex = /<option>([\s\S]*?)<\/option>/g;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = optionRegex.exec(optionsMatch[1])) !== null) {
    choices.push({ choiceId: `c${idx}`, text: match[1].trim() });
    idx++;
  }
  choices.push({ choiceId: 'custom', text: '', isCustomInput: true });
  return choices;
}

// ====== Stock Price Simulation ======

export function createStockSimulator(initialPrice = 100) {
  let price = initialPrice;
  let drift = 0;
  let impact = 0;
  let anchorPrice = initialPrice;
  const history: number[] = [price];

  function tick() {
    drift += (Math.random() - 0.5) * 0.3;
    drift = Math.max(-2, Math.min(2, drift)) * 0.95;
    const noise = (Math.random() - 0.5) * 4;
    const reversion = (anchorPrice - price) * 0.02;
    impact *= 0.85;
    price = Math.max(1, price + drift + noise + reversion + impact);
    price = Math.round(price * 100) / 100;
    history.push(price);
    if (history.length > 120) history.shift();
    return price;
  }

  function applyTradeImpact(direction: 'buy' | 'sell', amount: number) {
    impact += direction === 'buy' ? amount * 0.1 : -amount * 0.1;
  }

  function reset(newPrice?: number) {
    price = newPrice ?? Math.round((50 + Math.random() * 100) * 100) / 100;
    anchorPrice = price;
    drift = 0;
    impact = 0;
    history.length = 0;
    history.push(price);
  }

  return { tick, applyTradeImpact, getPrice: () => price, getHistory: () => history, reset };
}

// ====== 2048 Tile-based Logic ======

export type Tile2048 = {
  value: number;
  id: string;
  row: number;
  col: number;
  isNew?: boolean;
  justMerged?: boolean;
};

export type Direction2048 = 'up' | 'down' | 'left' | 'right';

let _tileIdCounter = 0;
function createTileId(): string {
  return `t${Date.now()}-${_tileIdCounter++}`;
}

function getEmptyCells(tiles: Tile2048[], gridSize: number): { row: number; col: number }[] {
  const occupied = new Set(tiles.map(t => `${t.row},${t.col}`));
  const empty: { row: number; col: number }[] = [];
  for (let r = 0; r < gridSize; r++)
    for (let c = 0; c < gridSize; c++) if (!occupied.has(`${r},${c}`)) empty.push({ row: r, col: c });
  return empty;
}

export function addNewTile2048(tiles: Tile2048[], gridSize: number): Tile2048[] {
  const empty = getEmptyCells(tiles, gridSize);
  if (empty.length === 0) return tiles;
  const { row, col } = empty[Math.floor(Math.random() * empty.length)];
  return [...tiles, { value: Math.random() < 0.9 ? 2 : 4, id: createTileId(), row, col, isNew: true }];
}

export function isGameOver2048(tiles: Tile2048[], gridSize: number): boolean {
  if (tiles.length < gridSize * gridSize) return false;
  for (const tile of tiles) {
    const { row, col, value } = tile;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        const neighbor = tiles.find(t => t.row === r && t.col === c);
        if (neighbor && neighbor.value === value) return false;
      }
    }
  }
  return true;
}

export function hasWon2048(tiles: Tile2048[]): boolean {
  return tiles.some(t => t.value >= 2048);
}

export function moveTiles2048(
  tiles: Tile2048[],
  direction: Direction2048,
  gridSize: number,
): { newTiles: Tile2048[]; scored: number; changed: boolean } {
  let sorted = tiles.map(t => ({ ...t, isNew: false, justMerged: false }));
  let scored = 0;
  let changed = false;

  sorted.sort((a, b) => {
    if (direction === 'up') return a.row - b.row;
    if (direction === 'down') return b.row - a.row;
    if (direction === 'left') return a.col - b.col;
    return b.col - a.col;
  });

  for (const tile of sorted) {
    let newRow = tile.row;
    let newCol = tile.col;

    while (true) {
      const nextRow = newRow + (direction === 'up' ? -1 : direction === 'down' ? 1 : 0);
      const nextCol = newCol + (direction === 'left' ? -1 : direction === 'right' ? 1 : 0);
      if (nextRow < 0 || nextRow >= gridSize || nextCol < 0 || nextCol >= gridSize) break;

      const target = sorted.find(t => t !== tile && t.row === nextRow && t.col === nextCol);
      if (target) {
        if (target.value === tile.value && !target.justMerged) {
          sorted = sorted.filter(t => t !== target && t !== tile);
          sorted.push({
            value: tile.value * 2,
            id: tile.id,
            row: nextRow,
            col: nextCol,
            isNew: false,
            justMerged: true,
          });
          scored += tile.value * 2;
          changed = true;
        }
        break;
      }

      newRow = nextRow;
      newCol = nextCol;
    }

    if (newRow !== tile.row || newCol !== tile.col) {
      tile.row = newRow;
      tile.col = newCol;
      changed = true;
    }
  }

  return { newTiles: sorted, scored, changed };
}

function initTiles2048(gridSize: number): Tile2048[] {
  let tiles: Tile2048[] = [];
  tiles = addNewTile2048(tiles, gridSize);
  tiles = addNewTile2048(tiles, gridSize);
  return tiles;
}

function tilesToSave(tiles: Tile2048[]): { value: number; row: number; col: number }[] {
  return tiles.map(t => ({ value: t.value, row: t.row, col: t.col }));
}

function tilesFromSave(saved: { value: number; row: number; col: number }[]): Tile2048[] {
  return saved.map(t => ({ value: t.value, row: t.row, col: t.col, id: createTileId() }));
}

// ====== Main Store ======

export const useVNStore = defineStore('vn', () => {
  // --- UI ---
  const activeOverlay = ref<OverlayPanel>('none');
  const leftMenuExpanded = ref(false);
  const rightMenuExpanded = ref(false);
  const activeModuleId = ref<string | null>(null);
  const selectedChoiceId = ref<string | null>(null);
  const choiceLocked = ref(false);
  const customInputText = ref('');
  const tempOptions = ref<Choice[]>([]); // Temporary options from board game events
  const toastMessage = ref<string | null>(null);
  const toastVisible = ref(false);

  // --- Persisted settings (localStorage, key固定避免流式楼层iframe id不一致) ---
  function loadSettingsFromStorage(): z.infer<typeof VNSettings> {
    try {
      const raw = localStorage.getItem('vn_galgame_settings');
      if (raw) return VNSettings.parse(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    return VNSettings.parse({});
  }
  const settings = ref(loadSettingsFromStorage());
  watchEffect(() => {
    try {
      localStorage.setItem('vn_galgame_settings', JSON.stringify(klona(settings.value)));
    } catch {
      /* ignore */
    }
  });

  // --- Persisted game data ---
  const _rawGameData = getVariables({ type: 'chat' });
  const gameData = ref(VNGameData.parse(_rawGameData?.vn_game ?? {}));
  watchEffect(() => {
    insertOrAssignVariables({ vn_game: klona(gameData.value) }, { type: 'chat' });
  });

  const _rawChatVars = getVariables({ type: 'chat' });
  const defaultUnlockedId = SYSTEM_PERSONALITIES[0]?.id ?? '';
  const systemChatHistories = ref<Record<string, SystemChatMessage[]>>(
    typeof _rawChatVars?.vn_system_chats === 'object' && _rawChatVars.vn_system_chats !== null
      ? (_rawChatVars.vn_system_chats as Record<string, SystemChatMessage[]>)
      : {},
  );
  const unlockedPersonalityIds = ref<Set<string>>(
    Array.isArray(_rawChatVars?.vn_unlocked_personality_ids)
      ? new Set(_rawChatVars.vn_unlocked_personality_ids as string[])
      : new Set(defaultUnlockedId ? [defaultUnlockedId] : []),
  );
  const unreadPersonalityIds = ref<Set<string>>(new Set());
  const lastActiveUnlockedPersonalityId = ref<string | null>(
    typeof _rawChatVars?.vn_last_active_unlocked_personality_id === 'string' &&
      _rawChatVars.vn_last_active_unlocked_personality_id
      ? _rawChatVars.vn_last_active_unlocked_personality_id
      : defaultUnlockedId || null,
  );
  watchEffect(() => {
    insertOrAssignVariables(
      {
        vn_system_chats: klona(systemChatHistories.value),
        vn_unlocked_personality_ids: Array.from(unlockedPersonalityIds.value),
        vn_last_active_unlocked_personality_id: lastActiveUnlockedPersonalityId.value,
      },
      { type: 'chat' },
    );
  });

  // 生图：同步到聊天变量供世界书条目启用（打开后自动启用对应世界书条目）
  watchEffect(() => {
    const on = settings.value.imageGenEnabled;
    const bg = on && settings.value.backgroundGenEnabled;
    const cg = on && settings.value.cgGenEnabled;
    insertOrAssignVariables({ vn_bg_gen_enabled: bg, vn_cg_gen_enabled: cg }, { type: 'chat' });
  });

  const systemChatOpen = ref(false);
  const activePersonalityId = ref<string | null>(null);

  // --- Last system prompt debug (for inspection) ---
  const lastSystemPrompts = ref<{ role: string; content: string }[]>([]);

  // --- Second API Generations Tracking ---
  const _rawGenVars = getVariables({ type: 'chat' });
  const secondApiGenerations = ref<SecondApiGeneration[]>(
    Array.isArray(_rawGenVars?.vn_second_api_generations) ? _rawGenVars.vn_second_api_generations : [],
  );

  watchEffect(() => {
    insertOrAssignVariables(
      {
        vn_second_api_generations: klona(secondApiGenerations.value),
      },
      { type: 'chat' },
    );
  });

  // --- Second API Task Control Variables (MVU) ---
  // 用于在调用第二API前临时控制哪些提示词生效（仅预设任务需要）
  const secondApiTaskControl = ref({
    danmaku: false,
    imageGen: false,
    shop: false,
    // riddle 和 system 任务不使用预设，无需任务控制变量
  });

  // --- Second API Error Tracking ---
  const secondApiLastErrorType = ref<'timeout' | 'network' | null>(null);
  const secondApiConsecutiveFailures = ref(0);
  const secondApiStatusOverride = ref<ProviderStatus>('available');
  const SECOND_API_DEGRADED_THRESHOLD = 3;

  // 同步到聊天变量，供 EJS 使用（仅预设任务需要）
  watchEffect(() => {
    insertOrAssignVariables(
      {
        vn_task_danmaku: secondApiTaskControl.value.danmaku,
        vn_task_imageGen: secondApiTaskControl.value.imageGen,
        vn_task_shop: secondApiTaskControl.value.shop,
        // riddle 和 system 任务不使用预设，无需同步变量
      },
      { type: 'chat' },
    );
  });

  // --- Message Parsing ---
  const currentMessageBlocks = ref<MessageBlock[]>([]);
  const currentScene = ref<string>('');
  const currentDialogueIndex = ref(0);

  // Parse current message and update blocks
  async function parseCurrentMessage(message: string) {
    try {
      console.info('[消息解析] 开始解析消息');
      const blocks = await parseMessageBlocks(message, currentScene.value);

      currentMessageBlocks.value = blocks;
      currentDialogueIndex.value = 0;

      // 更新当前场景（从最后一个块中获取）
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].scene) {
          currentScene.value = blocks[i].scene!;
          break;
        }
      }

      // 提取剧情纯文本并同步到酒馆变量，供 {{getvar::剧情文本}} 使用
      const plainText = extractPlainTextFromContent(message);
      if (plainText) {
        insertOrAssignVariables({ '剧情文本': plainText }, { type: 'chat' });
        console.info('[剧情文本] 已更新剧情文本变量');
      }

      console.info('[消息解析] 解析完成，共', blocks.length, '个块');
      console.info('[消息解析] 当前场景:', currentScene.value);
    } catch (error) {
      console.error('[消息解析] 解析失败:', error);
      currentMessageBlocks.value = [];
    }
  }

  // Navigate dialogue
  function nextDialogue() {
    if (currentDialogueIndex.value < currentMessageBlocks.value.length - 1) {
      currentDialogueIndex.value++;
    }
  }

  function prevDialogue() {
    if (currentDialogueIndex.value > 0) {
      currentDialogueIndex.value--;
    }
  }

  // Get current dialogue block
  const currentBlock = computed(() => {
    return currentMessageBlocks.value[currentDialogueIndex.value] || null;
  });

  // Clear worldbook cache when chat changes
  eventOn(tavern_events.CHAT_CHANGED, () => {
    clearResourceCache();
    currentScene.value = '';
    currentMessageBlocks.value = [];
    currentDialogueIndex.value = 0;
    console.info('[消息解析] 聊天切换，已清除缓存和状态');
  });

  // --- Derived ---
  const gold = computed(() => gameData.value.gold);
  const inventory = computed(() => gameData.value.inventory);
  const transactionLog = computed(() => gameData.value.transactionLog);
  const workshopLevel = computed(() => gameData.value.workshopLevel);

  // --- API Provider status (available | degraded | disabled) ---
  const secondApiStatus = computed<ProviderStatus>(() => {
    if (!settings.value.secondApiUrl || !settings.value.secondApiKey) return 'disabled';
    if (secondApiStatusOverride.value === 'degraded') return 'degraded';
    if (secondApiConsecutiveFailures.value >= SECOND_API_DEGRADED_THRESHOLD) return 'degraded';
    return 'available';
  });
  const imageApiStatus = computed<ProviderStatus>(() =>
    settings.value.imageApiUrl && settings.value.imageApiKey ? 'available' : 'disabled',
  );

  // --- Second API Model List ---
  const secondApiModelList = ref<string[]>(
    (() => {
      try {
        const cached = localStorage.getItem('vn_galgame_model_list');
        if (cached) return JSON.parse(cached) as string[];
      } catch {
        /* ignore */
      }
      return [];
    })(),
  );
  const secondApiModelListLoading = ref(false);

  watchEffect(() => {
    try {
      localStorage.setItem('vn_galgame_model_list', JSON.stringify(secondApiModelList.value));
    } catch {
      /* ignore */
    }
  });

  async function fetchSecondApiModelList(): Promise<void> {
    const url = settings.value.secondApiUrl?.trim();
    const key = settings.value.secondApiKey?.trim();

    if (!url || !key) {
      showToast('第二 API 未配置');
      return;
    }

    secondApiModelListLoading.value = true;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);

      const res = await fetch(`${url.replace(/\/$/, '')}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
        signal: ctrl.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        showToast(`获取模型列表失败：${res.status} ${text}`);
        setSecondApiDegraded('model_fetch');
        return;
      }

      const body = await res.json();
      secondApiModelList.value = (body.data || []).map((m: any) => m.id).sort();
      showToast(`共获取 ${secondApiModelList.value.length} 个模型`);
      clearSecondApiDegraded();
    } catch (e: any) {
      showToast(`获取模型列表失败：${e.message || '网络错误'}`);
      setSecondApiDegraded('model_fetch');
    } finally {
      secondApiModelListLoading.value = false;
    }
  }

  async function testSecondApiConnection(): Promise<boolean> {
    const url = settings.value.secondApiUrl?.trim();
    const key = settings.value.secondApiKey?.trim();
    const model = settings.value.secondApiModel?.trim() || 'gpt-3.5-turbo';

    if (!url || !key) {
      showToast('请先填写接口地址与 API 密钥');
      return false;
    }

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);

      const res = await fetch(`${url.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: '你好' }],
          max_tokens: 20,
          stream: false,
        }),
        signal: ctrl.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        showToast(`连接失败：${res.status} ${text}`);
        return false;
      }

      const body = await res.json().catch(() => null);
      const reply = body?.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        showToast('连接成功但收到空回复，请检查模型名称是否正确');
        return false;
      }

      showToast(`连接成功，模型 ${model} 可用 ✓`);
      return true;
    } catch (e: any) {
      if (e.name === 'AbortError') {
        showToast('连接超时，请检查 API 地址是否正确');
      } else {
        showToast(`网络错误：${e.message || '无法到达服务器'}`);
      }
      return false;
    }
  }

  // --- 生图（事件通信）---
  const stageBackgroundImage = ref<string | null>(null);
  const stageCgImage = ref<string | null>(null);
  const pendingImageRequests = new Map<string, { type: 'background' | 'cg' }>();
  let imageGenListenerStopped: (() => void) | null = null;

  // 图片卡牌队列（最多10张）
  const imageCardQueue = ref<ImageCard[]>([]);
  const MAX_IMAGE_CARDS = 10;

  function handleImageResponse(responseData: ImageGenResponseData) {
    if (!responseData || !responseData.id) return;
    const pending = pendingImageRequests.get(responseData.id);
    if (!pending) return;
    pendingImageRequests.delete(responseData.id);
    if (responseData.success && responseData.imageData) {
      // 添加到卡牌队列
      const card: ImageCard = {
        id: responseData.id,
        imageData: responseData.imageData,
        type: pending.type,
        timestamp: Date.now(),
      };
      imageCardQueue.value.push(card);
      if (imageCardQueue.value.length > MAX_IMAGE_CARDS) {
        imageCardQueue.value.shift();
      }

      // 同时更新舞台显示
      if (pending.type === 'background') stageBackgroundImage.value = responseData.imageData;
      else stageCgImage.value = responseData.imageData;
    }
  }

  function setupImageGenListener() {
    if (imageGenListenerStopped) return;
    const ret = eventOn(ImageGenEventType.GENERATE_IMAGE_RESPONSE, handleImageResponse);
    imageGenListenerStopped = ret.stop;
  }

  function requestImage(prompt: string, type: 'background' | 'cg') {
    if (!settings.value.imageGenEnabled) return;
    if (type === 'background' && !settings.value.backgroundGenEnabled) return;
    if (type === 'cg' && !settings.value.cgGenEnabled) return;
    const requestId = 'vn-' + Date.now() + '-' + Math.random().toString(36).slice(2, 11);
    pendingImageRequests.set(requestId, { type });
    const requestData: ImageGenRequestData = {
      id: requestId,
      prompt,
      width: null,
      height: null,
    };
    eventEmit(ImageGenEventType.GENERATE_IMAGE_REQUEST, requestData);
  }

  function requestBackgroundImage(prompt: string) {
    requestImage(prompt, 'background');
  }

  function requestCgImage(prompt: string) {
    requestImage(prompt, 'cg');
  }

  // 切换卡牌显示到舞台
  function switchToImageCard(cardId: string) {
    const card = imageCardQueue.value.find(c => c.id === cardId);
    if (!card) return;
    if (card.type === 'background') stageBackgroundImage.value = card.imageData;
    else stageCgImage.value = card.imageData;
  }

  // 清空卡牌队列
  function clearImageCardQueue() {
    imageCardQueue.value = [];
  }

  // --- Module locking ---
  function getModuleLockReason(moduleId: string): string | undefined {
    if (moduleId === 'shop' && secondApiStatus.value === 'disabled') return '需要配置第二 API';
    if (moduleId === 'shop' && secondApiStatus.value === 'degraded') return '第二 API 降级';
    if (moduleId === 'ai_riddle' && secondApiStatus.value === 'disabled') return '需要配置第二 API';
    if (moduleId === 'ai_riddle' && secondApiStatus.value === 'degraded') return '第二 API 降级';
    return undefined;
  }

  // --- Second API unified entry ---
  async function callSecondApi(
    task: 'danmaku' | 'shop' | 'system' | 'riddle' | 'imageTag' | 'danmakuAndImageGen',
    payload: SecondApiPayload,
  ): Promise<string[] | ShopItem[] | string> {
    const url = settings.value.secondApiUrl?.trim();
    const key = settings.value.secondApiKey?.trim();
    if (!url || !key) {
      showToast('第二 API 未配置');
      return task === 'shop' ? [] : task === 'danmaku' || task === 'danmakuAndImageGen' ? [] : '';
    }
    const model = settings.value.secondApiModel?.trim() || 'gpt-3.5-turbo';

    // 获取预设名称（猜谜和系统聊天任务不使用预设）
    const presetName = settings.value.secondApiPreset?.trim();

    // 构建 ordered_prompts，不再硬编码提示词，完全依赖预设中的 EJS
    const danmakuPayload = payload as DanmakuPayload;
    const ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] =
      task === 'danmaku' || task === 'danmakuAndImageGen'
        ? [{ role: 'user', content: danmakuPayload.contentText }]
        : (payload as RiddlePayload).ordered_prompts || [];

    // 猜谜和系统聊天任务不使用预设，直接用代码中构造的提示词
    const usePreset = presetName && task !== 'riddle' && task !== 'system';
    let currentPreset: string | null = null;
    if (usePreset) {
      try {
        // 保存当前预设
        currentPreset = getLoadedPresetName();
        // 加载指定预设
        await loadPreset(presetName);
        console.info(`[SecondAPI] 已加载预设: ${presetName}`);
      } catch (e) {
        console.warn(`[SecondAPI] 加载预设失败: ${presetName}`, e);
      }
    } else if (presetName) {
      console.info(`[SecondAPI] 跳过预设加载（riddle/system 任务）: ${presetName}`);
    }

    // 设置任务控制变量（在发送前临时修改，仅预设任务需要）
    const taskControlBackup = { ...secondApiTaskControl.value };

    // 重置所有任务开关为 false
    Object.keys(secondApiTaskControl.value).forEach(key => {
      secondApiTaskControl.value[key as keyof typeof secondApiTaskControl.value] = false;
    });

    // 只开启当前任务对应的开关（riddle 和 system 任务不使用预设，无需设置）
    if (task === 'danmaku') {
      secondApiTaskControl.value.danmaku = true;
    } else if (task === 'imageTag') {
      secondApiTaskControl.value.imageGen = true;
    } else if (task === 'shop') {
      secondApiTaskControl.value.shop = true;
    } else if (task === 'danmakuAndImageGen') {
      // 弹幕和生图合并调用，同时开启两个开关
      secondApiTaskControl.value.danmaku = true;
      secondApiTaskControl.value.imageGen = true;
    }
    // riddle 和 system 任务不使用预设，跳过任务控制变量设置

    // 等待变量同步（watchEffect 是异步的，需要等待下一个 tick）
    await nextTick();
    console.info(`[SecondAPI] 任务控制变量已设置:`, secondApiTaskControl.value);

    const custom_api = {
      apiurl: url,
      key,
      model,
      source: 'openai' as const,
      temperature: settings.value.secondApiTemperature === 'unset' ? undefined : settings.value.secondApiTemperature,
      max_tokens: settings.value.secondApiMaxTokens === 'unset' ? undefined : settings.value.secondApiMaxTokens,
      top_p: settings.value.secondApiTopP === 'unset' ? undefined : settings.value.secondApiTopP,
      top_k: settings.value.secondApiTopK === 'unset' ? undefined : settings.value.secondApiTopK,
    };

    const doRequest = (): Promise<string> =>
      Promise.race([
        generateRaw({ custom_api, should_stream: false, should_silence: true, ordered_prompts }),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            secondApiLastErrorType.value = 'timeout';
            reject(new Error('timeout'));
          }, SECOND_API_TIMEOUT_MS),
        ),
      ]);

    // 调试日志：输出完整提示词
    console.info(`[SecondAPI] === 任务: ${task} ===`);
    ordered_prompts.forEach((p, i) => {
      console.info(`[SecondAPI] [${i}] ${p.role.toUpperCase()}: ${p.content.slice(0, 200)}${p.content.length > 200 ? '...' : ''}`);
    });

    // 过滤世界书条目，仅保留 targetApi 为 'second' 或 'both' 的条目
    let worldbookStates: WorldbookEntryState[] = [];
    try {
      worldbookStates = await filterAndApplyWorldbookForSecondApi();
    } catch (e) {
      console.warn('[SecondAPI] 世界书过滤失败，继续请求:', e);
    }

    try {
      for (let attempt = 0; attempt <= SECOND_API_RETRY_COUNT; attempt++) {
        try {
          const raw = await doRequest();
          secondApiConsecutiveFailures.value = 0;
          secondApiStatusOverride.value = 'available';

          // 弹幕和生图合并调用的解析
          if (task === 'danmakuAndImageGen') {
            // 返回原始字符串，由调用方自行解析弹幕和生图标签
            return raw;
          }

          if (task === 'danmaku') {
            const lines = raw
              .split(/\n/)
              .map(s => s.trim())
              .filter(Boolean);
            return lines;
          }
          if (task === 'shop') {
            const items: ShopItem[] = [];
            const lineRegex = /^(.+?)\s*[|｜]\s*(.+?)\s*[|｜]\s*(\d+)\s*$/;
            for (const line of raw
              .split(/\n/)
              .map(s => s.trim())
              .filter(Boolean)) {
              const m = line.match(lineRegex);
              if (m)
                items.push({ id: `s${Date.now()}_${items.length}`, name: m[1], effect: m[2], price: Number(m[3]) });
            }
            if (items.length === 0) {
              try {
                const parsed = JSON.parse(raw) as { name?: string; effect?: string; price?: number }[];
                if (Array.isArray(parsed))
                  parsed.forEach((p, i) =>
                    items.push({
                      id: `s${Date.now()}_${i}`,
                      name: p.name ?? '',
                      effect: p.effect ?? '',
                      price: Number(p.price) || 0,
                    }),
                  );
              } catch {
                /* ignore */
              }
            }
            return items;
          }
          return raw;
        } catch {
          secondApiConsecutiveFailures.value++;
          if (secondApiConsecutiveFailures.value >= SECOND_API_DEGRADED_THRESHOLD)
            secondApiStatusOverride.value = 'degraded';
        }
      }
      showToast(task === 'shop' ? '商店解析失败' : '请求失败');
      if (task === 'shop') return [];
      return '';
    } finally {
      // 恢复任务控制变量
      Object.assign(secondApiTaskControl.value, taskControlBackup);
      await nextTick();
      console.info(`[SecondAPI] 任务控制变量已恢复:`, secondApiTaskControl.value);

      // 恢复原预设
      if (currentPreset && presetName) {
        try {
          await loadPreset(currentPreset);
          console.info(`[SecondAPI] 已恢复预设: ${currentPreset}`);
        } catch (e) {
          console.warn(`[SecondAPI] 恢复预设失败: ${currentPreset}`, e);
        }
      }

      // 恢复世界书条目的原始状态
      if (worldbookStates.length > 0) {
        try {
          await restoreWorldbookStates(worldbookStates);
        } catch (e) {
          console.warn('[SecondAPI] 恢复世界书状态失败:', e);
        }
      }
    }
  }

  function setSecondApiDegraded(reason: 'model_fetch' | 'timeout') {
    console.warn('[SecondAPI] Degraded:', reason);
  }

  function clearSecondApiDegraded() {
    console.info('[SecondAPI] Cleared degraded status');
  }

  /** Called from index.ts on GENERATION_ENDED; runs danmaku request and queues push with 200ms–3s spacing */
  async function triggerDanmakuForMessage(message_id: number) {
    if (!settings.value.danmakuEnabled) return;
    const messages = getChatMessages(message_id);
    const raw = messages[0]?.message ?? '';
    const contentText = extractContentTag(raw);
    if (!contentText) return;
    try {
      const lines = (await callSecondApi('danmaku', { contentText })) as string[];
      if (lines.length === 0) return;
      const minGap = 200;
      const maxGap = 3000;
      lines.forEach((text, i) => {
        const delay = i === 0 ? 0 : minGap + Math.random() * (maxGap - minGap);
        setTimeout(() => pushDanmaku(text), delay);
      });
    } catch {
      /* toast already in callSecondApi */
    }
  }

  // ====== Worldbook Management ======

  /** Get all worldbook names associated with current character and chat */
  function getAllCurrentWorldbookNames(): string[] {
    const names: string[] = [];
    try {
      const charWbs = getCharWorldbookNames('current');
      if (charWbs.primary) names.push(charWbs.primary);
      names.push(...charWbs.additional);
    } catch {
      /* ignore */
    }
    try {
      const chatWbName = getChatWorldbookName('current');
      if (chatWbName && !names.includes(chatWbName)) names.push(chatWbName);
    } catch {
      /* ignore */
    }
    try {
      for (const n of getGlobalWorldbookNames()) {
        if (!names.includes(n)) names.push(n);
      }
    } catch {
      /* ignore */
    }
    return names;
  }

  /** Get enhanced worldbook entries with our custom fields */
  async function getEnhancedWorldbook(): Promise<WorldbookEntryEnhanced[]> {
    const names = getAllCurrentWorldbookNames();
    const allEntries: WorldbookEntryEnhanced[] = [];
    for (const name of names) {
      try {
        const entries = await getWorldbook(name);
        for (const entry of entries) {
          allEntries.push({
            ...entry,
            enabled: entry.enabled,
            targetApi: (entry.extra?.targetApi as 'main' | 'second' | 'both') ?? 'main',
            autoControl: entry.extra?.autoControl ?? false,
            linkedFeature: entry.extra?.linkedFeature,
            _worldbookName: name,
          });
        }
      } catch (e) {
        console.warn(`[Worldbook] Failed to load worldbook "${name}":`, e);
      }
    }
    return allEntries;
  }

  /** Update worldbook entry enhancement fields */
  async function updateWorldbookEntry(uid: number, worldbookName: string, updates: Partial<WorldbookEntryEnhanced>) {
    const { targetApi, autoControl, linkedFeature, enabled } = updates;
    try {
      await updateWorldbookWith(
        worldbookName,
        wb =>
          wb.map(e => {
            if (e.uid !== uid) return e;
            const extra = { ...e.extra };
            if (targetApi !== undefined) extra.targetApi = targetApi;
            if (autoControl !== undefined) extra.autoControl = autoControl;
            if (linkedFeature !== undefined) extra.linkedFeature = linkedFeature;
            const result: any = { ...e, extra };
            if (enabled !== undefined) result.enabled = enabled;
            return result;
          }),
        { render: 'debounced' },
      );
      showToast('世界书条目已更新');
    } catch (e) {
      console.error('[Worldbook] Failed to update entry:', e);
      showToast('更新失败');
    }
  }

  /** Auto-control worldbook entries based on feature toggles */
  async function updateWorldbookAutoControl() {
    const names = getAllCurrentWorldbookNames();
    for (const name of names) {
      try {
        const entries = await getWorldbook(name);
        const hasAutoControl = entries.some(e => e.extra?.autoControl);
        if (!hasAutoControl) continue;
        let hasChange = false;
        await updateWorldbookWith(
          name,
          wb =>
            wb.map(e => {
              if (!e.extra?.autoControl) return e;
              let shouldEnable = false;
              switch (e.extra?.linkedFeature) {
                case 'danmaku':
                  shouldEnable = settings.value.danmakuEnabled;
                  break;
                case 'imageGen':
                  shouldEnable = settings.value.imageGenEnabled;
                  break;
              }
              if (e.enabled !== shouldEnable) {
                hasChange = true;
                return { ...e, enabled: shouldEnable };
              }
              return e;
            }),
          { render: 'debounced' },
        );
        if (hasChange) {
          console.info('[Worldbook] Auto-control updated entries in', name);
        }
      } catch (e) {
        console.warn(`[Worldbook] Failed to update auto-control for "${name}":`, e);
      }
    }
  }

  /** @deprecated Use filterAndApplyWorldbookForSecondApi instead */
  function filterWorldbookForApi(_apiType: 'main' | 'second') {
    return null;
  }

  // ====== Worldbook API Filtering for Second API ======

  type WorldbookEntryState = {
    worldbookName: string;
    uid: number;
    originalEnabled: boolean;
  };

  /**
   * 过滤世界书条目，仅保留 targetApi 为 'second' 或 'both' 的条目
   * 用于在调用第二 API 前临时调整世界书
   *
   * @returns 记录所有被修改的条目状态，用于调用后恢复
   */
  async function filterAndApplyWorldbookForSecondApi(): Promise<WorldbookEntryState[]> {
    const names = getAllCurrentWorldbookNames();
    const modifiedStates: WorldbookEntryState[] = [];

    for (const name of names) {
      try {
        const entries = await getWorldbook(name);
        const needsUpdate = entries.filter(e => {
          const targetApi = (e.extra?.targetApi as 'main' | 'second' | 'both') ?? 'main';
          // 如果条目应该只发送给主 API，则临时禁用它
          if (targetApi === 'main' && e.enabled) {
            return true;
          }
          return false;
        });

        if (needsUpdate.length > 0) {
          // 记录原始状态
          for (const entry of needsUpdate) {
            modifiedStates.push({
              worldbookName: name,
              uid: entry.uid,
              originalEnabled: entry.enabled,
            });
          }

          // 临时禁用这些条目
          await updateWorldbookWith(
            name,
            wb =>
              wb.map(e => {
                const targetApi = (e.extra?.targetApi as 'main' | 'second' | 'both') ?? 'main';
                if (targetApi === 'main' && e.enabled) {
                  return { ...e, enabled: false };
                }
                return e;
              }),
            { render: 'immediate' },
          );
          console.info(`[Worldbook] 已临时禁用 ${needsUpdate.length} 个主 API 专用条目（世界书: ${name}）`);
        }
      } catch (e) {
        console.warn(`[Worldbook] 过滤世界书 "${name}" 失败:`, e);
      }
    }

    return modifiedStates;
  }

  /**
   * 恢复世界书条目的原始状态
   */
  async function restoreWorldbookStates(states: WorldbookEntryState[]): Promise<void> {
    // 按世界书分组
    const grouped = new Map<string, WorldbookEntryState[]>();
    for (const state of states) {
      const list = grouped.get(state.worldbookName) ?? [];
      list.push(state);
      grouped.set(state.worldbookName, list);
    }

    // 逐个世界书恢复
    for (const [worldbookName, stateList] of grouped) {
      try {
        await updateWorldbookWith(
          worldbookName,
          wb =>
            wb.map(e => {
              const state = stateList.find(s => s.uid === e.uid);
              if (state) {
                return { ...e, enabled: state.originalEnabled };
              }
              return e;
            }),
          { render: 'immediate' },
        );
        console.info(`[Worldbook] 已恢复 ${stateList.length} 个条目状态（世界书: ${worldbookName}）`);
      } catch (e) {
        console.warn(`[Worldbook] 恢复世界书 "${worldbookName}" 状态失败:`, e);
      }
    }
  }

  // Watch feature toggles and update worldbook auto-control
  watch(
    () => [settings.value.danmakuEnabled, settings.value.imageGenEnabled],
    async () => {
      await updateWorldbookAutoControl();
    },
  );

  // --- Characters / modules ---
  const userCharacter = ref<UserCharacter>({ name: '旅人', avatarUrl: '', showSprite: false });
  const characterRoster = ref<CharacterStatus[]>(DEMO_CHARACTERS);
  const gameModules = ref<GameModule[]>(DEMO_MODULES);

  // --- Workshop runtime ---
  const workshopProducing = ref(false);
  const workshopCharacterId = ref<string | null>(null);
  const workshopStartTime = ref<number | null>(null);
  const workshopAccumulated = ref(0);

  // --- Stock market runtime (merged into workshop, uses gold directly) ---
  const stockSimulator = createStockSimulator(Math.round((50 + Math.random() * 100) * 100) / 100);
  const stockPrice = ref(stockSimulator.getPrice());
  const stockHistory = ref<number[]>([...stockSimulator.getHistory()]);
  const stockPosition = ref(0);
  const stockInvested = ref(0);
  const stockPaused = ref(false);
  const stockActive = ref(false);
  const stockTickInterval = ref<ReturnType<typeof setInterval> | null>(null);
  const stockLastDirection = ref<'up' | 'down' | null>(null);

  // --- 2048 runtime ---
  const puzzle2048Active = ref(false);
  const puzzle2048Size = ref(gameData.value.puzzle2048Size || 4);
  const puzzle2048Tiles = ref<Tile2048[]>(
    gameData.value.puzzle2048Tiles.length > 0
      ? tilesFromSave(gameData.value.puzzle2048Tiles)
      : initTiles2048(puzzle2048Size.value),
  );
  const puzzle2048Score = ref(gameData.value.puzzle2048Score);
  const puzzle2048BestScore = ref(gameData.value.puzzle2048BestScore);
  const puzzle2048GameOver = ref(false);
  const puzzle2048Won = ref(false);
  const puzzle2048WonAcknowledged = ref(false);

  // --- Riddle runtime ---
  const riddleActive = ref(false);
  const riddleAnswer = ref('');
  const riddleChatHistory = ref<{ role: 'user' | 'ai'; text: string }[]>([]);
  const riddleRounds = ref(0);
  const riddlePersonalityId = ref<string | null>(null);

  // --- Danmaku runtime ---
  const danmakuItems = ref<DanmakuItem[]>([]);

  // ====== Economy Service ======

  const GOLD_WINDFALL_THRESHOLD = 400;
  function changeGold(amount: number, moduleId: string, reason: string) {
    gameData.value.gold += amount;
    gameData.value.transactionLog.unshift({ moduleId, reason, amount, timestamp: Date.now() });
    if (gameData.value.transactionLog.length > 50) gameData.value.transactionLog.length = 50;
    if (amount >= GOLD_WINDFALL_THRESHOLD) triggerProactive('gold_windfall');
  }

  function clearTransactionLog() {
    gameData.value.transactionLog = [];
  }

  function addInventoryItem(item: Omit<InventoryItem, 'quantity'>) {
    const existing = gameData.value.inventory.find(i => i.id === item.id);
    if (existing) existing.quantity++;
    else gameData.value.inventory.push({ ...item, quantity: 1 });
  }

  // ====== Workshop ======

  function startProduction(characterId: string) {
    workshopCharacterId.value = characterId;
    workshopProducing.value = true;
    workshopStartTime.value = Date.now();
    workshopAccumulated.value = 0;
  }

  function pauseProduction() {
    if (!workshopProducing.value || !workshopStartTime.value) return;
    const char = characterRoster.value.find(c => c.id === workshopCharacterId.value);
    if (!char) return;
    const elapsed = (Date.now() - workshopStartTime.value) / 1000;
    const bonus = 1 + (gameData.value.workshopLevel - 1) * 0.1;
    workshopAccumulated.value += Math.floor(elapsed * char.productionSpeed * char.productionYield * bonus);
    workshopProducing.value = false;
    workshopStartTime.value = null;
  }

  function resumeProduction() {
    if (!workshopCharacterId.value || workshopProducing.value) return;
    workshopProducing.value = true;
    workshopStartTime.value = Date.now();
  }

  const WORKSHOP_IDLE_LONG_SECONDS = 300;
  function stopProductionAndSettle() {
    if (!workshopCharacterId.value) return 0;
    const char = characterRoster.value.find(c => c.id === workshopCharacterId.value);
    if (!char) return 0;
    let earned = workshopAccumulated.value;
    let elapsedSec = 0;
    if (workshopProducing.value && workshopStartTime.value) {
      elapsedSec = (Date.now() - workshopStartTime.value) / 1000;
      const bonus = 1 + (gameData.value.workshopLevel - 1) * 0.1;
      earned += Math.floor(elapsedSec * char.productionSpeed * char.productionYield * bonus);
    }
    if (earned > 0) changeGold(earned, 'idle_workshop', `${char.name} 生产结算`);
    if (elapsedSec >= WORKSHOP_IDLE_LONG_SECONDS) triggerProactive('workshop_idle_long');
    workshopProducing.value = false;
    workshopCharacterId.value = null;
    workshopStartTime.value = null;
    workshopAccumulated.value = 0;
    return earned;
  }

  function upgradeWorkshop() {
    if (gameData.value.workshopLevel >= 10) return false;
    const cost = gameData.value.workshopLevel * 200;
    if (gameData.value.gold < cost) return false;
    changeGold(-cost, 'idle_workshop', `工坊升至 ${gameData.value.workshopLevel + 1} 级`);
    gameData.value.workshopLevel++;
    triggerProactive('workshop_upgrade');
    return true;
  }

  // ====== Stock Market (uses gold directly) ======

  function doStockTick() {
    const prevPrice = stockSimulator.getPrice();
    stockSimulator.tick();
    stockPrice.value = stockSimulator.getPrice();
    stockHistory.value = [...stockSimulator.getHistory()];
    stockLastDirection.value =
      stockPrice.value > prevPrice ? 'up' : stockPrice.value < prevPrice ? 'down' : stockLastDirection.value;
  }

  function startStockTicker() {
    if (stockTickInterval.value) return;
    stockTickInterval.value = setInterval(() => {
      if (!stockPaused.value) doStockTick();
    }, 3000);
  }

  function stopStockTicker() {
    if (stockTickInterval.value) {
      clearInterval(stockTickInterval.value);
      stockTickInterval.value = null;
    }
  }

  function enterStockMarket() {
    stockActive.value = true;
    stockPaused.value = false;
    startStockTicker();
  }

  function stockBuy() {
    if (stockPaused.value) return false;
    const cost = Math.ceil(stockPrice.value);
    const fee = calcStockFee(gameData.value.workshopLevel);
    if (gameData.value.gold < cost + fee) return false;
    changeGold(-(cost + fee), 'stock_market', '买入 1 股');
    stockPosition.value += 1;
    stockInvested.value += cost;
    stockSimulator.applyTradeImpact('buy', 1);
    doStockTick();
    return true;
  }

  function stockSell() {
    if (stockPaused.value) return false;
    if (stockPosition.value < 1) return false;
    const revenue = Math.floor(stockPrice.value);
    const fee = calcStockFee(gameData.value.workshopLevel);
    changeGold(revenue - fee, 'stock_market', '卖出 1 股');
    stockPosition.value -= 1;
    stockInvested.value =
      stockPosition.value > 0 ? Math.floor(stockInvested.value * (stockPosition.value / (stockPosition.value + 1))) : 0;
    stockSimulator.applyTradeImpact('sell', 1);
    doStockTick();
    return true;
  }

  function exitStockMarket() {
    stopStockTicker();
    const fee = calcStockFee(gameData.value.workshopLevel);
    const invested = stockInvested.value;
    let totalReceived = 0;
    while (stockPosition.value > 0) {
      const revenue = Math.floor(stockPrice.value);
      const net = revenue - fee;
      changeGold(net, 'stock_market', '平仓卖出');
      totalReceived += net;
      stockPosition.value--;
    }
    if (invested > 0 && totalReceived < invested) triggerProactive('stock_bankruptcy');
    stockActive.value = false;
    stockInvested.value = 0;
    resetStock();
  }

  function resetStock() {
    stopStockTicker();
    stockSimulator.reset();
    stockPrice.value = stockSimulator.getPrice();
    stockHistory.value = [...stockSimulator.getHistory()];
    stockPosition.value = 0;
    stockInvested.value = 0;
    stockPaused.value = false;
    stockLastDirection.value = null;
  }

  function toggleStockPause() {
    stockPaused.value = !stockPaused.value;
  }

  // ====== 2048 ======

  function start2048(size: number) {
    const fee = calcCommission(gameData.value.gold, gameData.value.workshopLevel, 0);
    if (fee > 0 && gameData.value.gold < fee) return false;
    if (fee > 0) changeGold(-fee, 'puzzle_2048', '开启游戏');
    puzzle2048Size.value = size;
    puzzle2048Tiles.value = initTiles2048(size);
    puzzle2048Score.value = 0;
    puzzle2048GameOver.value = false;
    puzzle2048Won.value = false;
    puzzle2048WonAcknowledged.value = false;
    puzzle2048Active.value = true;
    gameData.value.puzzle2048Size = size;
    return true;
  }

  function autoStart2048() {
    const saved = gameData.value.puzzle2048Tiles;
    if (saved.length > 0) {
      puzzle2048Tiles.value = tilesFromSave(saved);
      puzzle2048Score.value = gameData.value.puzzle2048Score;
      puzzle2048BestScore.value = gameData.value.puzzle2048BestScore;
      puzzle2048Size.value = gameData.value.puzzle2048Size || 4;
      puzzle2048GameOver.value = false;
      puzzle2048Won.value = false;
      puzzle2048WonAcknowledged.value = false;
      puzzle2048Active.value = true;
      return true;
    }
    return start2048(puzzle2048Size.value);
  }

  function move2048Action(direction: Direction2048) {
    if (!puzzle2048Active.value || puzzle2048GameOver.value) return;
    const { newTiles, scored, changed } = moveTiles2048(puzzle2048Tiles.value, direction, puzzle2048Size.value);
    if (!changed) {
      if (isGameOver2048(puzzle2048Tiles.value, puzzle2048Size.value)) puzzle2048GameOver.value = true;
      return;
    }
    const finalTiles = addNewTile2048(newTiles, puzzle2048Size.value);
    puzzle2048Tiles.value = finalTiles;
    puzzle2048Score.value += scored;
    if (puzzle2048Score.value > puzzle2048BestScore.value) {
      puzzle2048BestScore.value = puzzle2048Score.value;
      gameData.value.puzzle2048BestScore = puzzle2048BestScore.value;
    }
    if (hasWon2048(finalTiles) && !puzzle2048Won.value) puzzle2048Won.value = true;
    if (isGameOver2048(finalTiles, puzzle2048Size.value)) puzzle2048GameOver.value = true;
  }

  function settle2048() {
    const reward = puzzle2048Score.value;
    if (reward > 0) changeGold(reward, 'puzzle_2048', '结算收益');
    puzzle2048Active.value = false;
    puzzle2048Tiles.value = initTiles2048(puzzle2048Size.value);
    puzzle2048Score.value = 0;
    puzzle2048GameOver.value = false;
    puzzle2048Won.value = false;
    puzzle2048WonAcknowledged.value = false;
    gameData.value.puzzle2048Tiles = [];
    gameData.value.puzzle2048Score = 0;
    return reward;
  }

  function save2048() {
    gameData.value.puzzle2048Tiles = tilesToSave(puzzle2048Tiles.value);
    gameData.value.puzzle2048Score = puzzle2048Score.value;
    showToast('已保存');
  }

  function acknowledge2048Win() {
    puzzle2048WonAcknowledged.value = true;
  }

  // ====== Riddle (normalize + block + onRiddleSolved) ======

  function normalizeForAnswer(s: string): string {
    return s
      .trim()
      .replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  const riddleStartTime = ref<number | null>(null);

  function startRiddle(personalityId: string, answer: string, firstHint: string) {
    riddlePersonalityId.value = personalityId;
    riddleAnswer.value = normalizeForAnswer(answer);
    riddleChatHistory.value = [{ role: 'user', text: firstHint }];
    riddleRounds.value = 1;
    riddleStartTime.value = Date.now();
    riddleActive.value = true;

    const hist = systemChatHistories.value[personalityId] ?? [];
    if (!systemChatHistories.value[personalityId]) systemChatHistories.value[personalityId] = hist;

    // 如果该联系人已有猜谜记录，在最末尾加一条分割线隔开
    const lastRiddleIdx = hist.findLastIndex(
      m => m.role === 'riddle_start' || m.role === 'riddle_end_pending' || m.role === 'riddle_end',
    );
    if (lastRiddleIdx >= 0) {
      hist.splice(lastRiddleIdx + 1, 0, { role: 'riddle_divider', text: '' });
    }

    hist.push({ role: 'riddle_divider', text: '' });
    hist.push({ role: 'riddle_start', text: '' });
    hist.push({ role: 'user', text: firstHint });
    hist.push({ role: 'riddle_end_pending', text: '' });
  }

  function riddleAnswerContains(userInput: string): boolean {
    const normalized = normalizeForAnswer(userInput);
    return normalized.includes(riddleAnswer.value) || riddleAnswer.value.includes(normalized);
  }

  function addRiddleUserMessage(text: string) {
    if (riddleAnswerContains(text)) return false;
    riddleChatHistory.value.push({ role: 'user', text });
    riddleRounds.value++;
    return true;
  }

  function onRiddleSolved(rounds: number, _elapsedMs: number) {
    const reward = 50 + rounds * 20;
    changeGold(reward, 'ai_riddle', `猜谜成功 (${rounds} 轮)`);
    gameData.value.riddleLastRecord = {
      answer: riddleAnswer.value,
      rounds,
      reward,
      timestamp: Date.now(),
    };
    riddleActive.value = false;
    riddleChatHistory.value = [];
    riddleStartTime.value = null;
    riddlePersonalityId.value = null;
    const personality = SYSTEM_PERSONALITIES.find(p => p.id === (lastActiveUnlockedPersonalityId.value ?? ''));
    const lines = personality?.proactiveLines?.riddle_solved;
    if (lines?.length) addProactiveToSystemChat(lines[Math.floor(Math.random() * lines.length)]!);
  }

  function addRiddleAiReply(text: string) {
    riddleChatHistory.value.push({ role: 'ai', text });
    const normalizedReply = normalizeForAnswer(text);
    if (normalizedReply.includes(riddleAnswer.value)) {
      const elapsedMs = riddleStartTime.value != null ? Date.now() - riddleStartTime.value : 0;
      onRiddleSolved(riddleRounds.value, elapsedMs);
      return { won: true, reward: 50 + riddleRounds.value * 20 };
    }
    return { won: false, reward: 0 };
  }

  function abortRiddleByUser(personalityId: string) {
    const hist = systemChatHistories.value[personalityId] ?? [];
    if (!systemChatHistories.value[personalityId]) systemChatHistories.value[personalityId] = hist;
    const idx = hist.findLastIndex(m => m.role === 'riddle_end_pending');
    if (idx >= 0) {
      hist[idx] = { role: 'riddle_end', text: '' };
      hist.splice(idx + 1, 0, { role: 'riddle_divider', text: '' });
    }

    // 放弃不结算金币，仅记录上次战绩为 0 奖励
    gameData.value.riddleLastRecord = {
      answer: riddleAnswer.value,
      rounds: riddleRounds.value,
      reward: 0,
      timestamp: Date.now(),
    };

    riddleActive.value = false;
    riddleChatHistory.value = [];
    riddleStartTime.value = null;
    riddlePersonalityId.value = null;
  }

  function endRiddle() {
    if (riddlePersonalityId.value) {
      abortRiddleByUser(riddlePersonalityId.value);
    } else {
      riddleActive.value = false;
      riddleChatHistory.value = [];
      riddleStartTime.value = null;
      riddlePersonalityId.value = null;
    }
  }

  async function requestRiddleAiReply(): Promise<{ won: boolean; reward: number; reply: string }> {
    const hist = riddleChatHistory.value;
    const pid = riddlePersonalityId.value;
    const personality = SYSTEM_PERSONALITIES.find(p => p.id === pid);
    const personalityPrompt = personality?.systemPrompt ?? '你是一个助手。';

    // 构造系统提示词：包含角色设定、猜谜规则、聊天记录、最新提示
    const chatLogText = hist
      .map(m => m.role === 'ai' ? `对方：${m.text}` : `你：${m.text}`)
      .join('\n');
    const latestHint = hist.length > 0 ? hist[hist.length - 1]!.text : '';

    const systemPromptContent = `${personalityPrompt}

————
你正在和用户玩猜谜游戏。

规则：
- 用户会给你提示
- 你需要根据提示猜测一个词（谜底）
- 你只能回复你的猜测或请求更多提示
- 不要重复用户的提示
- 若你猜中了谜底，在回复中自然地说出答案即可

示例对话：
用户：这是一种水果
AI：是苹果吗？
用户：不对，它是黄色的
AI：是香蕉！

————
这是之前的对话记录：
${chatLogText}
————
这是这次的提示
${latestHint}
你觉得这个可能是什么？`;

    const ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] = [
      { role: 'system', content: systemPromptContent },
      { role: 'user', content: '请回复你的猜测。' },
    ];
    const raw = (await callSecondApi('riddle', { ordered_prompts })) as string;
    const reply = raw?.trim() || '让我再想想…';
    const result = addRiddleAiReply(reply);
    return { ...result, reply };
  }

  async function bootstrapRiddleFirstReply(personalityId: string): Promise<string> {
    if (!riddleActive.value || riddlePersonalityId.value !== personalityId) return '';
    const hist = systemChatHistories.value[personalityId] ?? [];
    if (!systemChatHistories.value[personalityId]) systemChatHistories.value[personalityId] = hist;

    const result = await requestRiddleAiReply();
    const pendingIdx = hist.findLastIndex(m => m.role === 'riddle_end_pending');
    if (pendingIdx >= 0) hist.splice(pendingIdx, 0, { role: 'assistant', text: result.reply });
    else hist.push({ role: 'assistant', text: result.reply });

    if (result.won) {
      const idx = hist.findLastIndex(m => m.role === 'riddle_end_pending');
      if (idx >= 0) hist[idx] = { role: 'riddle_end', text: '' };
    }

    return result.reply;
  }

  // ====== Shop ======

  const shopItems = ref<ShopItem[]>([]);
  const shopRefreshing = ref(false);
  const shopGenerationId = ref(0);

  async function refreshShop() {
    if (secondApiStatus.value === 'disabled') {
      showToast('第二 API 未配置');
      return;
    }
    const cost = calcCommission(gameData.value.gold, gameData.value.workshopLevel, 50);
    if (gameData.value.gold < cost) {
      showToast('金币不足');
      return;
    }
    changeGold(-cost, 'shop', '刷新商店');
    shopRefreshing.value = true;
    shopGenerationId.value++;
    const genId = shopGenerationId.value;
    try {
      const result = await callSecondApi('shop', { ordered_prompts: [] });
      if (genId !== shopGenerationId.value) return;
      shopItems.value = result as ShopItem[];
      if (shopItems.value.length === 0) {
        shopItems.value = [
          { id: `s${Date.now()}_0`, name: '破旧绷带', effect: '恢复少量生命', price: 30 },
          { id: `s${Date.now()}_1`, name: '生锈罐头', effect: '恢复饱食度', price: 50 },
          { id: `s${Date.now()}_2`, name: '旧报纸碎片', effect: '可能包含线索', price: 80 },
          { id: `s${Date.now()}_3`, name: '煤油灯', effect: '照亮黑暗区域', price: 120 },
        ];
      }
    } catch {
      /* toast in callSecondApi */
    } finally {
      shopRefreshing.value = false;
    }
  }

  function purchaseShopItem(itemId: string) {
    const item = shopItems.value.find(i => i.id === itemId);
    if (!item) return false;
    if (gameData.value.gold < item.price) {
      showToast('金币不足');
      return false;
    }
    changeGold(-item.price, 'shop', `购买 ${item.name}`);
    addInventoryItem({ id: item.id, name: item.name, effect: item.effect });
    shopItems.value = shopItems.value.filter(i => i.id !== itemId);
    return true;
  }

  // ====== Danmaku ======

  let _danmakuIdCounter = 0;
  function pushDanmaku(text: string) {
    if (!settings.value.danmakuEnabled) return;
    if (danmakuItems.value.length >= 20) danmakuItems.value.shift();
    const displayRatio =
      settings.value.danmakuDisplay === 'full' ? 1 : settings.value.danmakuDisplay === 'half' ? 0.5 : 0.33;
    danmakuItems.value.push({
      id: `d${_danmakuIdCounter++}`,
      text,
      x: 100,
      y: Math.random() * displayRatio * 100,
      speed: 0.5 + settings.value.danmakuSpeed * 0.3,
    });
  }

  function removeDanmaku(id: string) {
    danmakuItems.value = danmakuItems.value.filter(d => d.id !== id);
  }

  // ====== System chat (contacts + unlock + send) ======

  function selectSystemPersonality(id: string) {
    unlockedPersonalityIds.value.add(id);
    lastActiveUnlockedPersonalityId.value = id;
    activePersonalityId.value = id;
    unreadPersonalityIds.value.delete(id);
  }

  async function sendSystemUserMessage(
    personalityId: string,
    userText: string,
    options?: { context?: string },
  ): Promise<string> {
    if (!unlockedPersonalityIds.value.has(personalityId)) {
      showToast('请先解锁该联系人');
      return '';
    }
    const hist = systemChatHistories.value[personalityId] ?? [];
    if (!systemChatHistories.value[personalityId]) systemChatHistories.value[personalityId] = hist;

    // 情报交换进行中：使用猜谜 API 流程
    if (riddleActive.value && riddlePersonalityId.value === personalityId) {
      if (riddleAnswerContains(userText)) {
        showToast('输入中包含谜底，已拦截');
        return '';
      }
      const ok = addRiddleUserMessage(userText);
      if (!ok) {
        showToast('输入中包含谜底，已拦截');
        return '';
      }

      // 始终插在“结束线”之前
      const pendingIdx = hist.findLastIndex(m => m.role === 'riddle_end_pending');
      if (pendingIdx >= 0) hist.splice(pendingIdx, 0, { role: 'user', text: userText });
      else hist.push({ role: 'user', text: userText });

      try {
        const result = await requestRiddleAiReply();
        const pendingIdx2 = hist.findLastIndex(m => m.role === 'riddle_end_pending');
        if (pendingIdx2 >= 0) hist.splice(pendingIdx2, 0, { role: 'assistant', text: result.reply });
        else hist.push({ role: 'assistant', text: result.reply });

        if (result.won) {
          // 将结束线由 pending -> end
          const idx = hist.findLastIndex(m => m.role === 'riddle_end_pending');
          if (idx >= 0) hist[idx] = { role: 'riddle_end', text: '' };
          // 在猜谜结束后追加一条分割线，与下一段普通聊天分隔
          hist.splice(idx + 1, 0, { role: 'riddle_divider', text: '' });
          const personality = SYSTEM_PERSONALITIES.find(p => p.id === personalityId);
          showToast(`[ ${personality?.name ?? '系统'} ] 猜谜结束，获得 ${result.reward}G`);
        }

        if (activePersonalityId.value !== personalityId) {
          unreadPersonalityIds.value.add(personalityId);
        }
        return result.reply;
      } catch {
        return '';
      }
    }

    // 普通末世通讯流程
    hist.push({ role: 'user', text: userText });
    const personality = SYSTEM_PERSONALITIES.find(p => p.id === personalityId);
    const systemPrompt = personality?.systemPrompt ?? '你是一个助手。';

    const historyPrompts = hist.slice(0, -1).reduce<{ role: 'assistant' | 'user'; content: string }[]>((acc, m) => {
      if (m.role === 'user') acc.push({ role: 'user', content: m.text });
      else if (m.role === 'assistant' || m.role === 'proactive') acc.push({ role: 'assistant', content: m.text });
      return acc;
    }, []);

    // 构建 ordered_prompts，如果有剧情参考则插入到用户输入之前
    const ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...historyPrompts,
    ];

    // 剧情参考注入：插入到用户输入之前
    if (options?.context) {
      ordered_prompts.push(
        { role: 'user', content: `[剧情参考]\n${options.context}` },
        { role: 'assistant', content: '好的，我已了解相关剧情内容。' },
      );
    }

    ordered_prompts.push({ role: 'user', content: userText });

    lastSystemPrompts.value = ordered_prompts;
    try {
      const reply = (await callSecondApi('system', { ordered_prompts })) as string;
      if (!reply) {
        const model = settings.value.secondApiModel?.trim();
        if (!model) {
          showToast('第二 API 返回空回复：未选择模型，请在设置中拉取并选择模型');
        } else {
          showToast(`第二 API 返回空回复：请检查模型「${model}」是否可用`);
        }
        hist.push({ role: 'assistant', text: '(无回复，请检查第二 API 配置)' });
        return '';
      }
      hist.push({ role: 'assistant', text: reply });
      if (activePersonalityId.value !== personalityId) {
        unreadPersonalityIds.value.add(personalityId);
      }
      const fromName = personality?.name ?? '系统';
      showToast(`[ ${fromName} ] 发来回复`);
      return reply;
    } catch {
      return '';
    }
  }

  function addProactiveToSystemChat(text: string) {
    const id = lastActiveUnlockedPersonalityId.value;
    if (!id) return;
    const hist = systemChatHistories.value[id] ?? [];
    if (!systemChatHistories.value[id]) systemChatHistories.value[id] = hist;
    hist.push({ role: 'proactive', text });
    const p = SYSTEM_PERSONALITIES.find(x => x.id === id);
    const fromName = p?.name ?? '系统';
    showToast(`[ ${fromName} ] 发来消息`);
  }

  function insertChatDivider(personalityId: string) {
    const hist = systemChatHistories.value[personalityId] ?? [];
    if (!systemChatHistories.value[personalityId]) systemChatHistories.value[personalityId] = hist;
    // 如果末尾已经是分割线则不重复插入
    if (hist.length > 0 && hist[hist.length - 1].role === 'divider') return;
    hist.push({ role: 'divider', text: '' });
  }

  function clearHistoryBeforeDivider(personalityId: string) {
    const hist = systemChatHistories.value[personalityId];
    if (!hist) return;
    const dividerIdx = hist.findLastIndex(
      m =>
        m.role === 'divider' || m.role === 'riddle_start' || m.role === 'riddle_end_pending' || m.role === 'riddle_end',
    );
    if (dividerIdx === -1) {
      systemChatHistories.value[personalityId] = [];
      return;
    }

    // 若清理到了进行中的猜谜，强制结束并不结算
    const remain = hist.slice(dividerIdx + 1);
    const removingRiddle = hist
      .slice(0, dividerIdx + 1)
      .some(m => m.role === 'riddle_start' || m.role === 'riddle_end_pending' || m.role === 'riddle_end');
    if (removingRiddle && riddlePersonalityId.value === personalityId) {
      riddleActive.value = false;
      riddleChatHistory.value = [];
      riddleStartTime.value = null;
      riddlePersonalityId.value = null;
    }

    systemChatHistories.value[personalityId] = remain;
  }

  type ProactiveEventKey = keyof NonNullable<SystemPersonality['proactiveLines']>;
  function triggerProactive(event: ProactiveEventKey) {
    const id = lastActiveUnlockedPersonalityId.value;
    if (!id) return;
    const p = SYSTEM_PERSONALITIES.find(x => x.id === id);
    const lines = p?.proactiveLines?.[event];
    if (lines?.length) addProactiveToSystemChat(lines[Math.floor(Math.random() * lines.length)]!);
  }

  // ====== UI Actions ======

  function setOverlay(panel: OverlayPanel) {
    activeOverlay.value = panel;
    leftMenuExpanded.value = false;
    rightMenuExpanded.value = false;
  }

  function toggleLeftMenu() {
    leftMenuExpanded.value = !leftMenuExpanded.value;
    rightMenuExpanded.value = false;
  }
  function toggleRightMenu() {
    rightMenuExpanded.value = !rightMenuExpanded.value;
    leftMenuExpanded.value = false;
  }
  function selectChoice(id: string | null) {
    selectedChoiceId.value = id;
  }
  function lockChoice() {
    choiceLocked.value = true;
  }

  function setTempOptions(options: Choice[]) {
    tempOptions.value = options;
  }
  function clearChoices() {
    selectedChoiceId.value = null;
    choiceLocked.value = false;
    customInputText.value = '';
    tempOptions.value = []; // Clear temp options when clearing choices
  }

  function updateSettings(partial: Partial<z.infer<typeof VNSettings>>) {
    Object.assign(settings.value, partial);
  }

  function updateUserCharacter(partial: Partial<UserCharacter>) {
    Object.assign(userCharacter.value, partial);
  }

  function showToast(msg: string) {
    toastMessage.value = msg;
    toastVisible.value = true;
    setTimeout(() => {
      toastVisible.value = false;
    }, 3000);
  }

  return {
    activeOverlay,
    leftMenuExpanded,
    rightMenuExpanded,
    activeModuleId,
    selectedChoiceId,
    choiceLocked,
    customInputText,
    toastMessage,
    toastVisible,
    settings,
    gameData,
    gold,
    inventory,
    transactionLog,
    workshopLevel,
    changeGold,
    clearTransactionLog,
    addInventoryItem,
    secondApiStatus,
    secondApiModelList,
    secondApiModelListLoading,
    fetchSecondApiModelList,
    testSecondApiConnection,
    setSecondApiDegraded,
    clearSecondApiDegraded,
    callSecondApi,
    triggerDanmakuForMessage,
    imageApiStatus,
    stageBackgroundImage,
    stageCgImage,
    imageCardQueue,
    setupImageGenListener,
    requestBackgroundImage,
    requestCgImage,
    switchToImageCard,
    clearImageCardQueue,
    getModuleLockReason,
    userCharacter,
    characterRoster,
    gameModules,
    // Message parsing
    currentMessageBlocks,
    currentScene,
    currentDialogueIndex,
    currentBlock,
    parseCurrentMessage,
    nextDialogue,
    prevDialogue,
    // Workshop & Stock
    workshopProducing,
    workshopCharacterId,
    workshopStartTime,
    workshopAccumulated,
    startProduction,
    pauseProduction,
    resumeProduction,
    stopProductionAndSettle,
    upgradeWorkshop,
    stockPrice,
    stockHistory,
    stockPosition,
    stockInvested,
    stockPaused,
    stockActive,
    stockLastDirection,
    enterStockMarket,
    exitStockMarket,
    stockBuy,
    stockSell,
    startStockTicker,
    stopStockTicker,
    doStockTick,
    resetStock,
    toggleStockPause,
    puzzle2048Active,
    puzzle2048Tiles,
    puzzle2048Score,
    puzzle2048BestScore,
    puzzle2048Size,
    puzzle2048GameOver,
    puzzle2048Won,
    puzzle2048WonAcknowledged,
    start2048,
    autoStart2048,
    move2048Action,
    settle2048,
    save2048,
    acknowledge2048Win,
    riddleActive,
    riddleAnswer,
    riddleChatHistory,
    riddleRounds,
    riddlePersonalityId,
    startRiddle,
    normalizeForAnswer,
    riddleAnswerContains,
    addRiddleUserMessage,
    addRiddleAiReply,
    requestRiddleAiReply,
    bootstrapRiddleFirstReply,
    abortRiddleByUser,
    endRiddle,
    shopItems,
    shopRefreshing,
    refreshShop,
    purchaseShopItem,
    danmakuItems,
    pushDanmaku,
    removeDanmaku,
    SYSTEM_PERSONALITIES,
    systemChatOpen,
    activePersonalityId,
    systemChatHistories,
    unlockedPersonalityIds,
    unreadPersonalityIds,
    lastActiveUnlockedPersonalityId,
    selectSystemPersonality,
    sendSystemUserMessage,
    lastSystemPrompts,
    addProactiveToSystemChat,
    triggerProactive,
    insertChatDivider,
    clearHistoryBeforeDivider,
    setOverlay,
    toggleLeftMenu,
    toggleRightMenu,
    selectChoice,
    lockChoice,
    clearChoices,
    setTempOptions,
    tempOptions,
    updateSettings,
    updateUserCharacter,
    showToast,
    // Second API generations
    secondApiGenerations,
    // Worldbook management
    getEnhancedWorldbook,
    updateWorldbookEntry,
    updateWorldbookAutoControl,
    filterAndApplyWorldbookForSecondApi,
    restoreWorldbookStates,
  };
});
