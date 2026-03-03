// ===== Board Game Types =====

export type NodeType = 'start' | 'empty' | 'encounter' | 'trap' | 'fortune' | 'transfer'

export interface MapNode {
  id: string
  x: number
  y: number
  type: NodeType
  label?: string
  neighbors: string[]
}

export interface MapConfig {
  nodes: MapNode[]
  width: number
  height: number
  startNodeId: string
}

export interface CardEffect {
  hp?: number
  sanity?: number
  luck?: number
  transfer?: boolean
  message: string
}

export interface EventCard {
  id: string
  title: string
  description: string
  effect: CardEffect
}

export interface GameEvent {
  id: string
  nodeType: NodeType
  title: string
  flavor: string
  cards: EventCard[]
}

export interface PlayerStats {
  hp: number
  maxHp: number
  sanity: number
  maxSanity: number
  luck: number
}

export type GamePhase = 'idle' | 'rolling' | 'choosingPath' | 'event' | 'resolving'
