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
    imageApiUrl: z.string().default(''),
    imageApiKey: z.string().default(''),
  })
  .prefault({});

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
    puzzle2048Tiles: z
      .array(z.object({ value: z.number(), row: z.number(), col: z.number() }))
      .default([]),
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
    moduleId: 'shop',
    displayName: '商店',
    description: '购买生存物资和特殊道具',
    icon: 'fa-shop',
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
    moduleId: 'ai_riddle',
    displayName: '情报交换',
    description: '与 AI 对话猜谜获取情报',
    icon: 'fa-comments',
    openMode: 'overlay',
    closeBehavior: 'returnHub',
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
          sorted.push({ value: tile.value * 2, id: tile.id, row: nextRow, col: nextCol, isNew: false, justMerged: true });
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

  // --- Derived ---
  const gold = computed(() => gameData.value.gold);
  const inventory = computed(() => gameData.value.inventory);
  const transactionLog = computed(() => gameData.value.transactionLog);
  const workshopLevel = computed(() => gameData.value.workshopLevel);

  // --- API Provider status ---
  const secondApiStatus = computed<ProviderStatus>(() =>
    settings.value.secondApiUrl && settings.value.secondApiKey ? 'available' : 'disabled',
  );
  const imageApiStatus = computed<ProviderStatus>(() =>
    settings.value.imageApiUrl && settings.value.imageApiKey ? 'available' : 'disabled',
  );

  // --- Module locking ---
  function getModuleLockReason(moduleId: string): string | undefined {
    if (moduleId === 'shop' && secondApiStatus.value === 'disabled') return '需要配置第二 API';
    if (moduleId === 'ai_riddle' && secondApiStatus.value === 'disabled') return '需要配置第二 API';
    return undefined;
  }

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

  function changeGold(amount: number, moduleId: string, reason: string) {
    gameData.value.gold += amount;
    gameData.value.transactionLog.unshift({ moduleId, reason, amount, timestamp: Date.now() });
    if (gameData.value.transactionLog.length > 50) gameData.value.transactionLog.length = 50;
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

  function stopProductionAndSettle() {
    if (!workshopCharacterId.value) return 0;
    const char = characterRoster.value.find(c => c.id === workshopCharacterId.value);
    if (!char) return 0;
    let earned = workshopAccumulated.value;
    if (workshopProducing.value && workshopStartTime.value) {
      const elapsed = (Date.now() - workshopStartTime.value) / 1000;
      const bonus = 1 + (gameData.value.workshopLevel - 1) * 0.1;
      earned += Math.floor(elapsed * char.productionSpeed * char.productionYield * bonus);
    }
    if (earned > 0) changeGold(earned, 'idle_workshop', `${char.name} 生产结算`);
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
    while (stockPosition.value > 0) {
      const revenue = Math.floor(stockPrice.value);
      changeGold(revenue - fee, 'stock_market', '平仓卖出');
      stockPosition.value--;
    }
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

  // ====== Riddle ======

  function startRiddle(answer: string, firstHint: string) {
    riddleAnswer.value = answer.replace(/[\s.,;:!?，。；：！？]/g, '').toLowerCase();
    riddleChatHistory.value = [{ role: 'user', text: firstHint }];
    riddleRounds.value = 1;
    riddleActive.value = true;
  }

  function addRiddleUserMessage(text: string) {
    if (text.toLowerCase().includes(riddleAnswer.value)) return false;
    riddleChatHistory.value.push({ role: 'user', text });
    riddleRounds.value++;
    return true;
  }

  function addRiddleAiReply(text: string) {
    riddleChatHistory.value.push({ role: 'ai', text });
    if (
      text
        .replace(/[\s.,;:!?，。；：！？]/g, '')
        .toLowerCase()
        .includes(riddleAnswer.value)
    ) {
      const reward = 50 + riddleRounds.value * 20;
      changeGold(reward, 'ai_riddle', `猜谜成功 (${riddleRounds.value} 轮)`);
      gameData.value.riddleLastRecord = {
        answer: riddleAnswer.value,
        rounds: riddleRounds.value,
        reward,
        timestamp: Date.now(),
      };
      riddleActive.value = false;
      return { won: true, reward };
    }
    return { won: false, reward: 0 };
  }

  function endRiddle() {
    riddleActive.value = false;
    riddleChatHistory.value = [];
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
      const items = await generateShopItems();
      if (genId !== shopGenerationId.value) return;
      shopItems.value = items;
    } catch {
      showToast('商店刷新失败');
    } finally {
      shopRefreshing.value = false;
    }
  }

  async function generateShopItems(): Promise<ShopItem[]> {
    return [
      { id: `s${Date.now()}_0`, name: '破旧绷带', effect: '恢复少量生命', price: 30 },
      { id: `s${Date.now()}_1`, name: '生锈罐头', effect: '恢复饱食度', price: 50 },
      { id: `s${Date.now()}_2`, name: '旧报纸碎片', effect: '可能包含线索', price: 80 },
      { id: `s${Date.now()}_3`, name: '煤油灯', effect: '照亮黑暗区域', price: 120 },
    ];
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
    imageApiStatus,
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
    addRiddleUserMessage,
    addRiddleAiReply,
    endRiddle,
    shopItems,
    shopRefreshing,
    refreshShop,
    purchaseShopItem,
    danmakuItems,
    pushDanmaku,
    removeDanmaku,
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
