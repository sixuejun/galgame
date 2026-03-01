import { klona } from 'klona';

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
  role: 'user' | 'assistant' | 'proactive';
  text: string;
}

// ====== Summary System Types ======

export interface SmallSummary {
  id: string;
  content: string;
  rounds: string;
  timestamp: number;
}

export interface BigSummary {
  id: string;
  content: string;
  rounds: string;
  timestamp: number;
  smallCount: number;
}

export interface SecondApiGeneration {
  id: string;
  type: 'danmaku' | 'summary' | 'imageTag' | 'variable';
  content: string;
  timestamp: number;
  messageId: number;
  inserted: boolean;
}

// ====== Worldbook Enhancement Types ======

export interface WorldbookEntryEnhanced {
  uid: number;
  enabled: boolean;
  targetApi: 'main' | 'second' | 'both';
  autoControl: boolean;
  linkedFeature?: 'danmaku' | 'imageGen' | 'summary';
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
    danmakuSendChatHistory: z.boolean().default(false),
    secondApiUrl: z.string().default(''),
    secondApiKey: z.string().default(''),
    secondApiModel: z.string().default(''),
    secondApiStream: z.boolean().default(false),
    secondApiTemperature: z.union([z.number(), z.literal('unset')]).default('unset'),
    secondApiMaxTokens: z.union([z.number(), z.literal('unset')]).default('unset'),
    secondApiTopP: z.union([z.number(), z.literal('unset')]).default('unset'),
    secondApiTopK: z.union([z.number(), z.literal('unset')]).default('unset'),
    imageApiUrl: z.string().default(''),
    imageApiKey: z.string().default(''),
    imageGenEnabled: z.boolean().default(false),
    backgroundGenEnabled: z.boolean().default(false),
    cgGenEnabled: z.boolean().default(false),
    // Summary system config
    summarySmallInterval: z.number().min(1).max(50).default(5),
    summaryBigThreshold: z.number().min(2).max(20).default(6),
    summaryAutoEnabled: z.boolean().default(true),
    summaryApiType: z.enum(['main', 'second']).default('second'),
    // API task config
    apiTaskDanmaku: z.enum(['main', 'second', 'disabled']).default('second'),
    apiTaskSummary: z.enum(['main', 'second', 'disabled']).default('second'),
    apiTaskImageTag: z.enum(['main', 'second', 'disabled']).default('second'),
    apiTaskVariable: z.enum(['main', 'second', 'disabled']).default('main'),
  })
  .prefault({});

const SECOND_API_TIMEOUT_MS = 30000;

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
const SECOND_API_RETRY_COUNT = 2;
const SECOND_API_DEGRADED_THRESHOLD = 3;

type DanmakuPayload = {
  contentText: string;
  chatHistory?: { role: 'system' | 'assistant' | 'user'; content: string }[];
};
type ShopPayload = { systemPrompt: string };
type SystemPayload = { ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] };
type RiddlePayload = { ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] };
type SummaryPayload = { systemPrompt: string };
type ImageTagPayload = { systemPrompt: string };

type SecondApiPayload = DanmakuPayload | ShopPayload | SystemPayload | RiddlePayload | SummaryPayload | ImageTagPayload;

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
      riddle_solved: ['谜题已破解。智力水平评估：优秀。'],
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
      riddle_solved: ['脑子转得挺快嘛！不愧是我看中的人。'],
    },
  },
  {
    id: 'sys_lively',
    name: '啾啾',
    avatarChar: '啾',
    systemPrompt: '你是一个活泼、元气满满的系统助手。你总是充满活力，使用大量的感叹号和表情符号。',
    proactiveLines: {
      stock_bankruptcy: ['呜呜呜，钱钱不见了！不要灰心，我们重新开始！'],
      workshop_idle_long: ['老板老板！工坊休息好久啦，快让它动起来吧！'],
      workshop_upgrade: ['好耶！工坊变得更厉害了！冲鸭！'],
      gold_windfall: ['好多金币！亮闪闪的！太棒了！'],
      riddle_solved: ['太厉害了！你简直是天才！'],
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
      riddle_solved: ['居然猜对了？看来你的脑子还没完全生锈。'],
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
  const toastMessage = ref<string | null>(null);
  const toastVisible = ref(false);

  // --- Persisted settings ---
  const settings = ref(VNSettings.parse(getVariables({ type: 'script', script_id: getScriptId() })));
  watchEffect(() => {
    replaceVariables(klona(settings.value), { type: 'script', script_id: getScriptId() });
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
    insertOrAssignVariables(
      { vn_bg_gen_enabled: bg, vn_cg_gen_enabled: cg },
      { type: 'chat' },
    );
  });

  const systemChatOpen = ref(false);
  const activePersonalityId = ref<string | null>(null);

  // --- Summary System ---
  const _rawSummaryData = getVariables({ type: 'chat' });
  const summaryData = ref<{
    small: SmallSummary[];
    big: BigSummary[];
    currentRound: number;
  }>({
    small: Array.isArray(_rawSummaryData?.vn_summary_small) ? _rawSummaryData.vn_summary_small : [],
    big: Array.isArray(_rawSummaryData?.vn_summary_big) ? _rawSummaryData.vn_summary_big : [],
    currentRound: typeof _rawSummaryData?.vn_summary_current_round === 'number' ? _rawSummaryData.vn_summary_current_round : 0,
  });

  // --- Second API Generations Tracking ---
  const secondApiGenerations = ref<SecondApiGeneration[]>(
    Array.isArray(_rawSummaryData?.vn_second_api_generations) ? _rawSummaryData.vn_second_api_generations : [],
  );

  // Persist summary data and second API generations
  watchEffect(() => {
    insertOrAssignVariables(
      {
        vn_summary_small: klona(summaryData.value.small),
        vn_summary_big: klona(summaryData.value.big),
        vn_summary_current_round: summaryData.value.currentRound,
        vn_second_api_generations: klona(secondApiGenerations.value),
      },
      { type: 'chat' },
    );
  });

  // --- Derived ---
  const gold = computed(() => gameData.value.gold);
  const inventory = computed(() => gameData.value.inventory);
  const transactionLog = computed(() => gameData.value.transactionLog);
  const workshopLevel = computed(() => gameData.value.workshopLevel);

  // --- API Provider status (available | degraded | disabled) ---
  const secondApiConsecutiveFailures = ref(0);
  const secondApiStatusOverride = ref<ProviderStatus | null>(null);
  const secondApiLastErrorType = ref<'timeout' | '4xx' | '5xx' | 'parse' | 'model_fetch' | null>(null);
  const secondApiStatus = computed<ProviderStatus>(() => {
    if (secondApiStatusOverride.value === 'degraded') return 'degraded';
    if (!settings.value.secondApiUrl || !settings.value.secondApiKey) return 'disabled';
    if (secondApiStatusOverride.value === 'available') return 'available';
    if (secondApiConsecutiveFailures.value >= SECOND_API_DEGRADED_THRESHOLD) return 'degraded';
    return 'available';
  });
  const imageApiStatus = computed<ProviderStatus>(() =>
    settings.value.imageApiUrl && settings.value.imageApiKey ? 'available' : 'disabled',
  );

  // --- 生图（事件通信）---
  const stageBackgroundImage = ref<string | null>(null);
  const stageCgImage = ref<string | null>(null);
  const pendingImageRequests = new Map<string, { type: 'background' | 'cg' }>();
  let imageGenListenerStopped: (() => void) | null = null;

  function handleImageResponse(responseData: ImageGenResponseData) {
    if (!responseData || !responseData.id) return;
    const pending = pendingImageRequests.get(responseData.id);
    if (!pending) return;
    pendingImageRequests.delete(responseData.id);
    if (responseData.success && responseData.imageData) {
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
    task: 'danmaku' | 'shop' | 'system' | 'riddle' | 'summary' | 'imageTag',
    payload: SecondApiPayload,
  ): Promise<string[] | ShopItem[] | string> {
    const url = settings.value.secondApiUrl?.trim();
    const key = settings.value.secondApiKey?.trim();
    if (!url || !key) {
      showToast('第二 API 未配置');
      return task === 'shop' ? [] : task === 'danmaku' ? [] : '';
    }
    const model = settings.value.secondApiModel?.trim() || 'gpt-3.5-turbo';
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
    const danmakuPayload = payload as DanmakuPayload;
    const ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] =
      task === 'danmaku'
        ? [
            { role: 'system', content: '你只输出多条弹幕文案，每行一条，不要编号、不要其他说明。' },
            ...(danmakuPayload.chatHistory ?? []),
            { role: 'user', content: danmakuPayload.contentText },
          ]
        : task === 'shop'
          ? [{ role: 'user', content: (payload as ShopPayload).systemPrompt }]
          : task === 'summary' || task === 'imageTag'
            ? [{ role: 'user', content: (payload as SummaryPayload | ImageTagPayload).systemPrompt }]
            : (payload as SystemPayload | RiddlePayload).ordered_prompts;

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

    for (let attempt = 0; attempt <= SECOND_API_RETRY_COUNT; attempt++) {
      try {
        const raw = await doRequest();
        secondApiConsecutiveFailures.value = 0;
        secondApiStatusOverride.value = 'available';
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
            if (m) items.push({ id: `s${Date.now()}_${items.length}`, name: m[1], effect: m[2], price: Number(m[3]) });
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
  }

  function setSecondApiDegraded(reason: 'model_fetch' | 'timeout') {
    secondApiStatusOverride.value = 'degraded';
    secondApiLastErrorType.value = reason;
  }

  function clearSecondApiDegraded() {
    secondApiStatusOverride.value = 'available';
    secondApiConsecutiveFailures.value = 0;
    secondApiLastErrorType.value = null;
  }

  /** Called from index.ts on GENERATION_ENDED; runs danmaku request and queues push with 200ms–3s spacing */
  async function triggerDanmakuForMessage(message_id: number) {
    if (!settings.value.danmakuEnabled) return;
    const messages = getChatMessages(message_id);
    const raw = messages[0]?.message ?? '';
    const contentMatch = raw.match(/<content>([\s\S]*?)<\/content>/);
    const contentText = contentMatch ? contentMatch[1].trim() : raw.trim();
    if (!contentText) return;
    let chatHistory: { role: 'system' | 'assistant' | 'user'; content: string }[] | undefined;
    if (settings.value.danmakuSendChatHistory && message_id > 0) {
      const prev = getChatMessages(`0-${message_id - 1}`);
      chatHistory = prev.flatMap(m => {
        const role = m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user';
        const text = (m.message ?? '').replace(/<content>[\s\S]*?<\/content>/g, '').trim();
        return text ? [{ role, content: text }] : [];
      });
    }
    try {
      const lines = (await callSecondApi('danmaku', { contentText, chatHistory })) as string[];
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

  // ====== Summary System ======

  /** Unified API task executor - routes to main or second API based on config */
  async function callApiForTask(
    task: 'danmaku' | 'summary' | 'imageTag' | 'variable',
    prompt: string,
  ): Promise<string> {
    let apiType: 'main' | 'second' | 'disabled' = 'disabled';
    
    if (task === 'danmaku') apiType = settings.value.apiTaskDanmaku;
    else if (task === 'summary') apiType = settings.value.apiTaskSummary;
    else if (task === 'imageTag') apiType = settings.value.apiTaskImageTag;
    else if (task === 'variable') apiType = settings.value.apiTaskVariable;
    
    if (apiType === 'disabled') return '';
    
    if (apiType === 'second') {
      return await callSecondApiWithTracking(task, { systemPrompt: prompt });
    } else {
      // Use main API - note: generate() is not available in store context
      // For now, we'll just use second API or return empty
      console.warn('[Summary] Main API not implemented for task:', task);
      return '';
    }
  }

  /** Wrapper for callSecondApi that tracks generations and inserts to message */
  async function callSecondApiWithTracking(
    task: 'danmaku' | 'summary' | 'imageTag' | 'variable',
    payload: { systemPrompt: string },
  ): Promise<string> {
    const result = await callSecondApi(task, payload);
    const content = typeof result === 'string' ? result : JSON.stringify(result);
    
    // Record generation
    const generation: SecondApiGeneration = {
      id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: task,
      content,
      timestamp: Date.now(),
      messageId: -1,
      inserted: false,
    };
    
    secondApiGenerations.value.push(generation);
    
    // Keep only last 50 generations
    if (secondApiGenerations.value.length > 50) {
      secondApiGenerations.value = secondApiGenerations.value.slice(-50);
    }
    
    // Insert to latest message
    await insertGenerationToMessage(generation);
    
    // Toast notification
    showToast(`第二API已生成${task}内容`);
    
    return content;
  }

  /** Insert second API generation to message end as HTML comment */
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

  /** Generate small summary from recent messages */
  async function generateSmallSummary() {
    const interval = settings.value.summarySmallInterval;
    const startRound = summaryData.value.currentRound - interval + 1;
    const endRound = summaryData.value.currentRound;
    
    // Get recent N messages
    const recentMessages = getChatMessages(`-${interval}-latest`);
    const content = recentMessages.map(m => m.message).join('\n\n');
    
    const prompt = `请简要总结以下${interval}轮对话的关键信息（200字以内）：\n\n${content}`;
    
    try {
      const summary = await callApiForTask('summary', prompt);
      
      if (!summary) return;
      
      summaryData.value.small.push({
        id: `small-${Date.now()}`,
        content: summary,
        rounds: `${startRound}-${endRound}`,
        timestamp: Date.now(),
      });
      
      showToast(`已生成第 ${summaryData.value.small.length} 个小总结`);
    } catch (e) {
      console.error('[Summary] Failed to generate small summary:', e);
      showToast('小总结生成失败');
    }
  }

  /** Generate big summary from accumulated small summaries */
  async function generateBigSummary() {
    const smallSummaries = summaryData.value.small;
    
    if (smallSummaries.length === 0) return;
    
    const firstRound = parseInt(smallSummaries[0].rounds.split('-')[0]);
    const lastRound = summaryData.value.currentRound;
    
    const content = smallSummaries.map((s, i) => `[${i + 1}] ${s.content}`).join('\n\n');
    
    const prompt = `请将以下${smallSummaries.length}个小总结提炼为一个关键的长期记忆（300字以内）：\n\n${content}`;
    
    try {
      const bigSummary = await callApiForTask('summary', prompt);
      
      if (!bigSummary) return;
      
      summaryData.value.big.push({
        id: `big-${Date.now()}`,
        content: bigSummary,
        rounds: `${firstRound}-${lastRound}`,
        timestamp: Date.now(),
        smallCount: smallSummaries.length,
      });
      
      // Clear small summaries
      summaryData.value.small = [];
      
      // Keep only last 10 big summaries
      if (summaryData.value.big.length > 10) {
        summaryData.value.big = summaryData.value.big.slice(-10);
      }
      
      showToast(`已生成大总结（包含 ${smallSummaries.length} 个小总结）`);
    } catch (e) {
      console.error('[Summary] Failed to generate big summary:', e);
      showToast('大总结生成失败');
    }
  }

  /** Called from index.ts on GENERATION_ENDED; checks and triggers summaries */
  async function onMessageGenerated(message_id: number) {
    if (!settings.value.summaryAutoEnabled) return;
    
    summaryData.value.currentRound++;
    
    console.info(`[Summary] Round ${summaryData.value.currentRound}, message ${message_id}`);
    
    // Check if need small summary
    if (summaryData.value.currentRound % settings.value.summarySmallInterval === 0) {
      console.info(`[Summary] Triggering small summary at round ${summaryData.value.currentRound}`);
      await generateSmallSummary();
    }
    
    // Check if need big summary
    if (summaryData.value.small.length >= settings.value.summaryBigThreshold) {
      console.info(`[Summary] Triggering big summary (${summaryData.value.small.length} small summaries)`);
      await generateBigSummary();
    }
  }

  /** Manually trigger big summary */
  async function manualTriggerBigSummary() {
    if (summaryData.value.small.length === 0) {
      showToast('没有小总结可以生成大总结');
      return;
    }
    
    await generateBigSummary();
  }

  /** Edit summary content */
  function editSummary(type: 'small' | 'big', id: string, newContent: string) {
    const list = type === 'small' ? summaryData.value.small : summaryData.value.big;
    const summary = list.find(s => s.id === id);
    if (summary) {
      summary.content = newContent;
      showToast('总结已更新');
    }
  }

  /** Delete summary */
  function deleteSummary(type: 'small' | 'big', id: string) {
    if (type === 'small') {
      summaryData.value.small = summaryData.value.small.filter(s => s.id !== id);
    } else {
      summaryData.value.big = summaryData.value.big.filter(s => s.id !== id);
    }
    showToast('总结已删除');
  }

  // ====== Worldbook Management ======

  /** Get enhanced worldbook with our custom fields */
  function getEnhancedWorldbook(): WorldbookEntryEnhanced[] {
    const wb = getWorldbook();
    if (!wb || !wb.entries) return [];
    
    return wb.entries.map(entry => ({
      ...entry,
      enabled: entry.enabled ?? true,
      targetApi: entry.targetApi ?? 'main',
      autoControl: entry.autoControl ?? false,
      linkedFeature: entry.linkedFeature,
    }));
  }

  /** Update worldbook entry enhancement fields */
  function updateWorldbookEntry(uid: number, updates: Partial<WorldbookEntryEnhanced>) {
    const wb = getWorldbook();
    if (!wb || !wb.entries) return;
    
    const entry = wb.entries.find(e => e.uid === uid);
    if (entry) {
      Object.assign(entry, updates);
      replaceWorldbook(wb);
      showToast('世界书条目已更新');
    }
  }

  /** Auto-control worldbook entries based on feature toggles */
  function updateWorldbookAutoControl() {
    const wb = getWorldbook();
    if (!wb || !wb.entries) return;
    
    let updated = false;
    
    wb.entries.forEach(entry => {
      if (!entry.autoControl) return;
      
      let shouldEnable = false;
      
      switch (entry.linkedFeature) {
        case 'danmaku':
          shouldEnable = settings.value.danmakuEnabled;
          break;
        case 'imageGen':
          shouldEnable = settings.value.imageGenEnabled;
          break;
        case 'summary':
          shouldEnable = settings.value.summaryAutoEnabled;
          break;
      }
      
      if (entry.enabled !== shouldEnable) {
        entry.enabled = shouldEnable;
        updated = true;
      }
    });
    
    if (updated) {
      replaceWorldbook(wb);
      console.info('[Worldbook] Auto-control updated entries based on feature toggles');
    }
  }

  /** Filter worldbook entries for API request based on targetApi */
  function filterWorldbookForApi(apiType: 'main' | 'second'): typeof getWorldbook extends () => infer R ? R : never {
    const wb = getWorldbook();
    if (!wb || !wb.entries) return wb;
    
    const filtered = {
      ...wb,
      entries: wb.entries.filter(entry => {
        if (!entry.enabled) return false;
        const target = entry.targetApi ?? 'main';
        return target === apiType || target === 'both';
      }),
    };
    
    return filtered;
  }

  // Watch feature toggles and update worldbook auto-control
  watch(
    () => [settings.value.danmakuEnabled, settings.value.imageGenEnabled, settings.value.summaryAutoEnabled],
    () => {
      updateWorldbookAutoControl();
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

  function startRiddle(answer: string, firstHint: string) {
    riddleAnswer.value = normalizeForAnswer(answer);
    riddleChatHistory.value = [{ role: 'user', text: firstHint }];
    riddleRounds.value = 1;
    riddleStartTime.value = Date.now();
    riddleActive.value = true;
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

  function endRiddle() {
    riddleActive.value = false;
    riddleChatHistory.value = [];
    riddleStartTime.value = null;
  }

  const RIDDLE_SYSTEM_PROMPT = `你正在和用户玩猜谜。用户会给你提示，你需要根据提示猜测一个词（谜底）。你只能回复你的猜测或请求更多提示，不要重复用户的提示。若你猜中了谜底，在回复中自然地说出答案即可。`;

  async function requestRiddleAiReply(): Promise<{ won: boolean; reward: number }> {
    const hist = riddleChatHistory.value;
    const ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] = [
      { role: 'system', content: RIDDLE_SYSTEM_PROMPT },
      ...hist.map(m => ({ role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant', content: m.text })),
    ];
    const raw = (await callSecondApi('riddle', { ordered_prompts })) as string;
    const reply = raw?.trim() || '让我再想想…';
    return addRiddleAiReply(reply);
  }

  // ====== Shop ======

  const shopItems = ref<ShopItem[]>([]);
  const shopRefreshing = ref(false);
  const shopGenerationId = ref(0);

  const SHOP_SYSTEM_PROMPT = `你是一个末日风格小店的商品生成器。只输出商品列表，每行格式：商品名|效果描述|价格（整数）。例如：
破旧绷带|恢复少量生命|30
生锈罐头|恢复饱食度|50
输出 4 条，价格在 20–150 之间。`;

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
      const result = await callSecondApi('shop', { systemPrompt: SHOP_SYSTEM_PROMPT });
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

  async function sendSystemUserMessage(personalityId: string, userText: string): Promise<string> {
    if (!unlockedPersonalityIds.value.has(personalityId)) {
      showToast('请先解锁该联系人');
      return '';
    }
    const hist = systemChatHistories.value[personalityId] ?? [];
    if (!systemChatHistories.value[personalityId]) systemChatHistories.value[personalityId] = hist;
    hist.push({ role: 'user', text: userText });
    const personality = SYSTEM_PERSONALITIES.find(p => p.id === personalityId);
    const systemPrompt = personality?.systemPrompt ?? '你是一个助手。';
    const ordered_prompts: { role: 'system' | 'assistant' | 'user'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...hist.map(m => ({ role: m.role === 'proactive' ? 'assistant' : m.role, content: m.text })),
    ];
    try {
      const reply = (await callSecondApi('system', { ordered_prompts })) as string;
      hist.push({ role: 'assistant', text: reply || '(无回复)' });
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
  function clearChoices() {
    selectedChoiceId.value = null;
    choiceLocked.value = false;
    customInputText.value = '';
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
    secondApiLastErrorType,
    setSecondApiDegraded,
    clearSecondApiDegraded,
    callSecondApi,
    triggerDanmakuForMessage,
    onMessageGenerated,
    imageApiStatus,
    stageBackgroundImage,
    stageCgImage,
    setupImageGenListener,
    requestBackgroundImage,
    requestCgImage,
    getModuleLockReason,
    userCharacter,
    characterRoster,
    gameModules,
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
    startRiddle,
    normalizeForAnswer,
    riddleAnswerContains,
    addRiddleUserMessage,
    addRiddleAiReply,
    requestRiddleAiReply,
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
    addProactiveToSystemChat,
    triggerProactive,
    setOverlay,
    toggleLeftMenu,
    toggleRightMenu,
    selectChoice,
    lockChoice,
    clearChoices,
    updateSettings,
    updateUserCharacter,
    showToast,
    // Summary system
    summaryData,
    generateSmallSummary,
    generateBigSummary,
    manualTriggerBigSummary,
    editSummary,
    deleteSummary,
    // Second API generations
    secondApiGenerations,
    // Worldbook management
    getEnhancedWorldbook,
    updateWorldbookEntry,
    updateWorldbookAutoControl,
    filterWorldbookForApi,
  };
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
    addProactiveToSystemChat,
    triggerProactive,
    setOverlay,
    toggleLeftMenu,
    toggleRightMenu,
    selectChoice,
    lockChoice,
    clearChoices,
    updateSettings,
    updateUserCharacter,
    showToast,
  };
});
