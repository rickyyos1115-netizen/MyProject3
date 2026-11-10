export type TowerType = 'archer' | 'mage' | 'cannon' | 'barracks'
export type EnemyType = 'goblin' | 'orc' | 'wolf' | 'knight' | 'demon' | 'boss'
export type GameStatus = 'menu' | 'running' | 'paused' | 'victory' | 'defeat'

export interface Tower {
  id: string
  type: TowerType
  level: number
  spot: number
}

export interface BuildSpot {
  x: number
  y: number
}

export const MAP_WIDTH = 1100
export const MAP_HEIGHT = 660

export const PATH: readonly { x: number; y: number }[] = [
  { x: -24, y: 465 }, { x: 175, y: 465 }, { x: 175, y: 300 },
  { x: 390, y: 300 }, { x: 390, y: 520 }, { x: 650, y: 520 },
  { x: 650, y: 220 }, { x: 875, y: 220 }, { x: 875, y: 420 },
  { x: 1120, y: 420 },
]

export const BUILD_SPOTS: readonly BuildSpot[] = [
  { x: 90, y: 360 }, { x: 285, y: 390 }, { x: 300, y: 235 },
  { x: 500, y: 365 }, { x: 530, y: 575 }, { x: 755, y: 365 },
  { x: 755, y: 125 }, { x: 980, y: 315 }, { x: 985, y: 535 },
  { x: 510, y: 145 },
]

export const TOWER_INFO: Record<TowerType, {
  name: string
  icon: string
  cost: number
  color: number
  description: string
}> = {
  archer: { name: '遊俠箭塔', icon: '🏹', cost: 100, color: 0x54b66a, description: '快速連射，均衡可靠' },
  mage: { name: '秘法高塔', icon: '🔮', cost: 130, color: 0x9a70e8, description: '奧術飛彈，無視護甲' },
  cannon: { name: '矮人砲台', icon: '💣', cost: 150, color: 0xd98945, description: '範圍爆炸，重創集群' },
  barracks: { name: '騎士兵營', icon: '🛡️', cost: 120, color: 0x4e9bd2, description: '派遣守衛攔截敵人' },
}

export const ENEMY_INFO: Record<EnemyType, {
  name: string
  color: number
  hp: number
  speed: number
  reward: number
  armor: number
  radius: number
}> = {
  goblin: { name: '哥布林', color: 0x78b84a, hp: 42, speed: 43, reward: 8, armor: 0, radius: 11 },
  orc: { name: '獸人', color: 0x918354, hp: 115, speed: 24, reward: 14, armor: 0.1, radius: 15 },
  wolf: { name: '狼騎兵', color: 0xc6c7b9, hp: 78, speed: 64, reward: 13, armor: 0.05, radius: 13 },
  knight: { name: '裝甲騎士', color: 0xa2abb5, hp: 205, speed: 17, reward: 22, armor: 0.35, radius: 16 },
  demon: { name: '飛行惡魔', color: 0xba5362, hp: 100, speed: 53, reward: 18, armor: 0.1, radius: 14 },
  boss: { name: '森林魔王', color: 0x75394c, hp: 1900, speed: 15, reward: 180, armor: 0.25, radius: 29 },
}

export const TOWER_RANGE: Record<TowerType, number> = {
  archer: 160, mage: 185, cannon: 145, barracks: 112,
}

export const towerCost = (type: TowerType, level = 1) =>
  level === 1 ? TOWER_INFO[type].cost : Math.round(TOWER_INFO[type].cost * (level === 2 ? 0.8 : 1.2))
