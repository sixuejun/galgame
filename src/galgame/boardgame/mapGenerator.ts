import type { MapConfig, MapNode, NodeType } from './types'

// ===== Mulberry32 PRNG (fast, good distribution) =====
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

// ===== Map Generator =====

/**
 * Generate a board game map from a numeric seed.
 * Same seed → identical map every time.
 *
 * Structure:
 *   1. Snake-layout trunk path (24–38 nodes)
 *   2. 2–4 horizontal branches off trunk nodes (2–5 nodes each)
 *   3. ~50% of branches get a shortcut back to a later trunk node
 *   4. Node types assigned from weighted pool
 */
export function generateMap(seed: number): MapConfig {
  const rng = mulberry32(seed)
  const rand = () => rng()
  const ri = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1))

  // Layout constants
  const NPR = 7    // nodes per trunk row
  const HS = 120   // horizontal spacing (px)
  const VS = 140   // vertical spacing between trunk rows (px)
  const MX = 90    // left/right margin
  const MY = 90    // top margin

  // ── 1. Trunk (snake) ──────────────────────────────────────────
  const trunkLen = ri(24, 38)
  const trunkNodes: MapNode[] = []
  const trunkIds: string[] = []

  for (let i = 0; i < trunkLen; i++) {
    const row = Math.floor(i / NPR)
    const col = i % NPR
    const rtl = row % 2 === 1
    const x = MX + (rtl ? (NPR - 1 - col) : col) * HS
    const y = MY + row * VS
    const id = `t${i}`
    trunkIds.push(id)
    const node: MapNode = { id, x, y, type: 'empty', neighbors: [] }
    if (i > 0) {
      node.neighbors.push(`t${i - 1}`)
      trunkNodes[i - 1]!.neighbors.push(id)
    }
    trunkNodes.push(node)
  }

  const allNodes: MapNode[] = [...trunkNodes]
  const findNode = (id: string) => allNodes.find(n => n.id === id)!

  // ── 2. Branches ───────────────────────────────────────────────
  const branchCount = ri(2, 4)
  const usedRoots = new Set<number>()

  for (let b = 0; b < branchCount; b++) {
    // Pick root node (not too close to start/end, not adjacent to used roots)
    let rootIdx = ri(3, trunkLen - 5)
    let tries = 0
    while (
      tries < 20 &&
      (usedRoots.has(rootIdx) || usedRoots.has(rootIdx - 1) || usedRoots.has(rootIdx + 1))
    ) {
      rootIdx = ri(3, trunkLen - 5)
      tries++
    }
    if (tries >= 20) continue
    usedRoots.add(rootIdx)

    const root = trunkNodes[rootIdx]!
    const branchLen = ri(2, 5)

    // Branch lives in the gap between its trunk row and the next
    // slight stagger per branch index to avoid overlap when multiple branches share a row
    const branchY = root.y + Math.round(VS * 0.5) + (b % 2 === 0 ? -10 : 10)

    // Direction: prefer toward center, randomised 30% of the time
    const centerX = MX + ((NPR - 1) * HS) / 2
    let dir = root.x <= centerX ? 1 : -1
    if (rand() > 0.7) dir *= -1

    let prevId = root.id
    let curX = root.x
    const branchNodeIds: string[] = []

    for (let j = 0; j < branchLen; j++) {
      curX += dir * HS
      const minX = MX - 90
      const maxX = MX + (NPR - 1) * HS + 90
      if (curX < minX || curX > maxX) break

      const id = `b${b}_${j}`
      branchNodeIds.push(id)
      const node: MapNode = {
        id,
        x: curX,
        y: branchY + j * 6, // tiny vertical drift per node
        type: 'empty',
        neighbors: [prevId],
      }
      findNode(prevId).neighbors.push(id)
      allNodes.push(node)
      prevId = id
    }

    if (branchNodeIds.length === 0) continue

    // ── 3. Shortcut back to a later trunk node (~65% chance) ────
    if (rand() > 0.35) {
      const laterIdx = Math.min(rootIdx + ri(4, 10), trunkLen - 1)
      if (laterIdx > rootIdx) {
        const lastId = branchNodeIds[branchNodeIds.length - 1]!
        const targetId = trunkIds[laterIdx]!
        const last = findNode(lastId)
        const target = findNode(targetId)
        if (last && target && !last.neighbors.includes(targetId)) {
          last.neighbors.push(targetId)
          target.neighbors.push(lastId)
        }
      }
    }
  }

  // ── 4. Assign node types ──────────────────────────────────────
  allNodes[0]!.type = 'start'

  // Weighted pool: empty 33%, encounter 24%, trap 20%, fortune 14%, transfer 9%
  const typePool: NodeType[] = [
    ...Array<NodeType>(33).fill('empty'),
    ...Array<NodeType>(24).fill('encounter'),
    ...Array<NodeType>(20).fill('trap'),
    ...Array<NodeType>(14).fill('fortune'),
    ...Array<NodeType>(9).fill('transfer'),
  ]

  for (let i = 1; i < allNodes.length; i++) {
    allNodes[i]!.type = typePool[Math.floor(rand() * typePool.length)]!
  }

  // ── 5. Canvas bounds ──────────────────────────────────────────
  const xs = allNodes.map(n => n.x)
  const ys = allNodes.map(n => n.y)
  const w = Math.max(...xs) + 100
  const h = Math.max(...ys) + 100

  return {
    nodes: allNodes,
    width: Math.max(w, 700),
    height: Math.max(h, 500),
    startNodeId: 't0',
  }
}
