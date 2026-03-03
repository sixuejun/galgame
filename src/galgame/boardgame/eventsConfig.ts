import type { GameEvent, NodeType } from './types'

// ===== Encounter Events (遭遇) =====
export const encounterEvents: GameEvent[] = [
  {
    id: 'enc_01',
    nodeType: 'encounter',
    title: '废墟中的陌生人',
    flavor: '雾气中浮现一道佝偻的身影，分不清是敌是友。',
    cards: [
      { id: 'enc_01_a', title: '伸出援手', description: '你决定上前搭话，对方似乎松了口气。', effect: { sanity: 8, message: '陌生人分享了一段温暖的记忆，你的精神稍微恢复了。' } },
      { id: 'enc_01_b', title: '保持警惕', description: '你握紧手中的武器，远远绕过了那个身影。', effect: { hp: -5, message: '对方突然投来石块，擦伤了你的手臂。' } },
      { id: 'enc_01_c', title: '交换物资', description: '你示意可以交易，对方掏出了一些东西。', effect: { luck: 2, message: '你得到了一枚锈迹斑斑的硬币，据说能带来好运。' } },
    ],
  },
  {
    id: 'enc_02',
    nodeType: 'encounter',
    title: '哭泣的孩童',
    flavor: '破败的楼房里传来微弱的哭声，在死寂中格外刺耳。',
    cards: [
      { id: 'enc_02_a', title: '寻声前往', description: '你循着声音走进黑暗的走廊。', effect: { hp: -5, sanity: 10, message: '是一只受伤的猫。你包扎了它的伤口，心里踏实了些。' } },
      { id: 'enc_02_b', title: '转身离开', description: '这个世界已经不允许多管闲事了。', effect: { sanity: -10, message: '哭声在你身后渐渐消失，但罪恶感像影子一样跟着你。' } },
    ],
  },
  {
    id: 'enc_03',
    nodeType: 'encounter',
    title: '蒙面商人',
    flavor: '一个戴着防毒面具的人铺开了一块脏兮兮的布，上面摆满了瓶瓶罐罐。',
    cards: [
      { id: 'enc_03_a', title: '购买药剂', description: '你用仅有的筹码换了一瓶浑浊的液体。', effect: { hp: 12, luck: -1, message: '药剂味道可怕，但伤口确实好了一些。' } },
      { id: 'enc_03_b', title: '询问情报', description: '你请求对方分享前方的情况。', effect: { sanity: 5, luck: 1, message: '商人告诉你前方有条捷径，还有一些需要避开的地方。' } },
      { id: 'enc_03_c', title: '抢夺物资', description: '末日之下，拳头就是道理。', effect: { hp: -10, luck: -2, message: '商人比看起来强壮得多。你被打倒在地，什么也没得到。' } },
    ],
  },
  {
    id: 'enc_04',
    nodeType: 'encounter',
    title: '末日传教士',
    flavor: '一名破衣烂衫的人站在瓦砾上高声布道，声音在废墟间回荡。',
    cards: [
      { id: 'enc_04_a', title: '驻足聆听', description: '停下脚步，任由那些词句流入耳中。', effect: { sanity: 12, message: '不知为何，那些荒诞的教义让你感到一丝平静。' } },
      { id: 'enc_04_b', title: '嗤之以鼻', description: '无视了那个声音，加快脚步离开。', effect: { message: '你不相信任何神灵。这很理智。' } },
    ],
  },
  {
    id: 'enc_05',
    nodeType: 'encounter',
    title: '疯狂的士兵',
    flavor: '一名穿着破烂军服的人向你冲来，眼神空洞而危险。',
    cards: [
      { id: 'enc_05_a', title: '迎战', description: '握紧手中的武器，准备战斗。', effect: { hp: -12, sanity: -5, message: '激烈的搏斗消耗了你的体力，但你成功击退了他。' } },
      { id: 'enc_05_b', title: '逃跑', description: '转身就跑，消失在废墟的阴影里。', effect: { sanity: -8, message: '你跑掉了，但那双眼睛久久出现在你脑海中。' } },
      { id: 'enc_05_c', title: '安抚', description: '缓慢地举起双手，试图让他冷静。', effect: { sanity: 6, message: '他突然停下，怔怔地看了你很久，然后转身离去。' } },
    ],
  },
  {
    id: 'enc_06',
    nodeType: 'encounter',
    title: '失忆的女人',
    flavor: '她坐在倒塌的墙边，重复念着一个名字。',
    cards: [
      { id: 'enc_06_a', title: '帮她回忆', description: '你蹲下来，轻声询问她发生了什么。', effect: { hp: -3, sanity: 8, message: '你不知道帮了多少忙，但她的眼神清醒了一些。' } },
      { id: 'enc_06_b', title: '留下食物离去', description: '把口粮放在她旁边，然后独自离去。', effect: { hp: -5, sanity: 3, message: '你回头看了一眼，她没有动。' } },
    ],
  },
]

// ===== Trap Events (陷阱) =====
export const trapEvents: GameEvent[] = [
  {
    id: 'trap_01',
    nodeType: 'trap',
    title: '锈蚀的地雷',
    flavor: '脚下传来不祥的"咔嗒"声。',
    cards: [
      { id: 'trap_01_a', title: '缓慢后退', description: '你屏住呼吸，一毫米一毫米地抬起脚。', effect: { hp: -5, message: '地雷没有爆炸，但你的脚踝被锈铁割伤了。' } },
      { id: 'trap_01_b', title: '猛然跳开', description: '你用尽全力向前扑去。', effect: { hp: -14, message: '爆炸声震耳欲聋，弹片在你背上留下了新的伤疤。' } },
    ],
  },
  {
    id: 'trap_02',
    nodeType: 'trap',
    title: '坍塌的楼道',
    flavor: '头顶传来令人不安的嘎吱声，混凝土开始掉落。',
    cards: [
      { id: 'trap_02_a', title: '冲刺通过', description: '低头全力冲刺，赌在彻底倒塌前通过。', effect: { hp: -8, message: '碎石砸在肩膀上，但你成功通过了。' } },
      { id: 'trap_02_b', title: '等待观察', description: '先观察楼道的结构，再决定怎么做。', effect: { sanity: -8, hp: -3, message: '等待加剧了恐惧，坍塌比预想更剧烈，但你安全了。' } },
      { id: 'trap_02_c', title: '绕路', description: '放弃这条路，寻找另一条路。', effect: { sanity: -5, message: '你失去了这条近路，但保住了性命。' } },
    ],
  },
  {
    id: 'trap_03',
    nodeType: 'trap',
    title: '毒气泄漏',
    flavor: '鼻尖涌来一股刺鼻的甜味，眼睛开始刺痛。',
    cards: [
      { id: 'trap_03_a', title: '屏气冲出', description: '深吸一口气，全力冲出污染区域。', effect: { hp: -7, sanity: -5, message: '你成功逃了出来，但毒气已经损伤了你的肺部。' } },
      { id: 'trap_03_b', title: '用布遮住口鼻', description: '撕下衣角，捂住口鼻缓慢通行。', effect: { hp: -4, message: '过滤效果有限，但聊胜于无。' } },
    ],
  },
  {
    id: 'trap_04',
    nodeType: 'trap',
    title: '感染区警告',
    flavor: '生锈的标志牌写着：前方感染，进者自负。',
    cards: [
      { id: 'trap_04_a', title: '强行通过', description: '不相信标志，继续前进。', effect: { hp: -15, sanity: -10, message: '标志是真实的，你付出了代价。' } },
      { id: 'trap_04_b', title: '绕道而行', description: '花费更多体力找到了另一条路。', effect: { hp: -5, message: '安全了，但消耗了更多体力。' } },
    ],
  },
  {
    id: 'trap_05',
    nodeType: 'trap',
    title: '受伤的困兽',
    flavor: '角落里蜷缩着一只受伤的动物，眼神里满是警惕与恐惧。',
    cards: [
      { id: 'trap_05_a', title: '试图安抚', description: '慢慢靠近，伸出手掌。', effect: { hp: -8, sanity: 5, message: '它还是咬了你。但攻击停止得很快，它摇摇晃晃地离开了。' } },
      { id: 'trap_05_b', title: '绕路而行', description: '保持距离，小心地绕过它。', effect: { message: '你们互不干扰，各自继续前行。' } },
    ],
  },
]

// ===== Fortune Events (意外之喜) =====
export const fortuneEvents: GameEvent[] = [
  {
    id: 'fort_01',
    nodeType: 'fortune',
    title: '被遗忘的补给站',
    flavor: '在瓦砾之下，你发现了一扇完好的铁门。',
    cards: [
      { id: 'fort_01_a', title: '搜刮医疗品', description: '铁柜里还有未开封的急救包。', effect: { hp: 18, message: '你仔细处理了身上的每一处伤口。好久没有这么奢侈了。' } },
      { id: 'fort_01_b', title: '翻阅旧日志', description: '桌上有一本布满灰尘的日记。', effect: { sanity: 15, message: '日记的主人记录着末日前的日常。那些平凡的幸福让你想起了曾经的世界。' } },
      { id: 'fort_01_c', title: '搜索暗格', description: '你敲击墙壁，发现了一个暗格。', effect: { luck: 5, message: '暗格里有一枚刻着奇怪符号的护身符。你把它挂在了脖子上。' } },
    ],
  },
  {
    id: 'fort_02',
    nodeType: 'fortune',
    title: '短暂的晴天',
    flavor: '厚重的铅云出现了一道裂缝，久违的阳光洒了下来。',
    cards: [
      { id: 'fort_02_a', title: '晒太阳休息', description: '你找了块干净的石头坐下，闭上眼睛。', effect: { hp: 8, sanity: 12, message: '温暖的阳光让你的身心得到了片刻安宁。' } },
      { id: 'fort_02_b', title: '收集雨水', description: '你展开容器，趁机收集干净雨水。', effect: { hp: 6, luck: 2, message: '清澈的水喝下去甘甜无比。你还额外存了一些。' } },
    ],
  },
  {
    id: 'fort_03',
    nodeType: 'fortune',
    title: '神秘的礼物',
    flavor: '路边有一个精心包装的盒子，上面颤抖地写着：给有缘人。',
    cards: [
      { id: 'fort_03_a', title: '打开盒子', description: '拆开包装，里面是一个铜制怀表。', effect: { luck: 4, sanity: 8, message: '怀表里装着一张照片，上面的人面带微笑，让你莫名感到温暖。' } },
      { id: 'fort_03_b', title: '不去碰它', description: '警惕之下，选择放弃。', effect: { message: '你继续前行，心里留下了一道悬念。' } },
    ],
  },
  {
    id: 'fort_04',
    nodeType: 'fortune',
    title: '同行者的馈赠',
    flavor: '一名旅行者擦肩而过，不言不语地留下了一个纸包。',
    cards: [
      { id: 'fort_04_a', title: '打开纸包', description: '里面是几片干净的纱布和消炎药。', effect: { hp: 10, sanity: 5, message: '这份意外的善意让你感到不孤单。' } },
    ],
  },
]

// ===== Transfer Events (传送) =====
export const transferEvents: GameEvent[] = [
  {
    id: 'trans_01',
    nodeType: 'transfer',
    title: '时空裂隙',
    flavor: '空气突然扭曲，脚下的地面像水面一样泛起涟漪。',
    cards: [
      { id: 'trans_01_a', title: '纵身跃入', description: '你深吸一口气，跳进了裂隙。', effect: { transfer: true, sanity: -5, message: '世界旋转、撕裂、重组。当你睁开眼时，一切都变了。' } },
      { id: 'trans_01_b', title: '试探性触碰', description: '你伸出手指轻轻触碰裂隙边缘。', effect: { transfer: true, hp: -3, message: '一股力量猛地将你拽了进去。你被甩到了一个完全陌生的地方。' } },
      { id: 'trans_01_c', title: '绕道而行', description: '你不想冒险，决定找其他路走。', effect: { sanity: -3, transfer: true, message: '裂隙突然扩大并将你吞没。命运，不可抗拒。' } },
    ],
  },
  {
    id: 'trans_02',
    nodeType: 'transfer',
    title: '神秘电梯',
    flavor: '一部看起来不该还能运行的电梯，指示灯闪烁着诡异的光。',
    cards: [
      { id: 'trans_02_a', title: '按下按钮', description: '你走进电梯，随手按了一个楼层。', effect: { transfer: true, message: '电梯在一阵剧烈摇晃后停下来。这里是……哪里？' } },
      { id: 'trans_02_b', title: '查看线路', description: '你打开控制面板，试图弄清楚通往何处。', effect: { transfer: true, luck: 1, message: '线路图上标记已经模糊不清，但你依稀看到了目的地的名字。' } },
    ],
  },
  {
    id: 'trans_03',
    nodeType: 'transfer',
    title: '浓雾迷途',
    flavor: '一团不自然的浓雾突然涌来，你在其中迷失了方向。',
    cards: [
      { id: 'trans_03_a', title: '顺着感觉走', description: '凭直觉在雾中前行。', effect: { transfer: true, sanity: -8, message: '浓雾散去时，你发现自己站在一个陌生的地方。' } },
    ],
  },
]

/** Pick a random event from the matching pool */
export function getRandomEvent(type: NodeType): GameEvent | null {
  const pools: Partial<Record<NodeType, GameEvent[]>> = {
    encounter: encounterEvents,
    trap: trapEvents,
    fortune: fortuneEvents,
    transfer: transferEvents,
  }
  const pool = pools[type]
  if (!pool || pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]!
}
