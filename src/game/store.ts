import { create } from 'zustand'
import type { GameStatus, Tower, TowerType } from './types'

interface GameStore {
  status: GameStatus
  gold: number
  lives: number
  wave: number
  waveActive: boolean
  speed: 1 | 2
  towers: Tower[]
  selectedSpot: number | null
  selectedTowerId: string | null
  enemyCount: number
  heroX: number
  heroY: number
  heroTarget: { x: number; y: number } | null
  skillMode: 'meteor' | 'reinforcements' | null
  meteorReadyAt: number
  reinforcementsReadyAt: number
  bestWave: number
  victories: number
  startGame: () => void
  togglePause: () => void
  toggleSpeed: () => void
  startWave: () => void
  buildTower: (type: TowerType) => void
  upgradeTower: () => void
  sellTower: () => void
  selectSpot: (spot: number) => void
  selectTower: (id: string) => void
  clearSelection: () => void
  earnGold: (amount: number) => void
  loseLife: () => void
  setEnemyCount: (count: number) => void
  moveHero: (x: number, y: number) => void
  clearHeroTarget: () => void
  setSkillMode: (skill: 'meteor' | 'reinforcements' | null) => void
  setHeroPosition: (x: number, y: number) => void
  useMeteor: () => boolean
  useReinforcements: () => boolean
  finishWave: () => void
  winGame: () => void
}

const readProgress = () => {
  try {
    const saved = localStorage.getItem('kingdom-defender-progress')
    if (!saved) return { bestWave: 0, victories: 0 }
    const progress: unknown = JSON.parse(saved)
    if (!progress || typeof progress !== 'object') return { bestWave: 0, victories: 0 }
    const record = progress as Record<string, unknown>
    return {
      bestWave: typeof record.bestWave === 'number' ? record.bestWave : 0,
      victories: typeof record.victories === 'number' ? record.victories : 0,
    }
  } catch (error) {
    console.warn('無法讀取遊戲進度。', error)
    return { bestWave: 0, victories: 0 }
  }
}

const saveProgress = (bestWave: number, victories: number) => {
  try {
    localStorage.setItem('kingdom-defender-progress', JSON.stringify({ bestWave, victories }))
  } catch (error) {
    console.warn('無法儲存遊戲進度。', error)
  }
}

const progress = readProgress()

export const useGameStore = create<GameStore>((set, get) => ({
  status: 'menu',
  gold: 250,
  lives: 20,
  wave: 0,
  waveActive: false,
  speed: 1,
  towers: [],
  selectedSpot: null,
  selectedTowerId: null,
  enemyCount: 0,
  heroX: 550,
  heroY: 430,
  heroTarget: null,
  skillMode: null,
  meteorReadyAt: 0,
  reinforcementsReadyAt: 0,
  bestWave: progress.bestWave,
  victories: progress.victories,

  startGame: () => set({
    status: 'running', gold: 250, lives: 20, wave: 0, waveActive: false,
    speed: 1, towers: [], selectedSpot: null, selectedTowerId: null, enemyCount: 0,
    heroX: 550, heroY: 430, heroTarget: null, meteorReadyAt: 0, reinforcementsReadyAt: 0,
    skillMode: null,
  }),
  togglePause: () => set((state) => ({
    status: state.status === 'paused' ? 'running' : state.status === 'running' ? 'paused' : state.status,
  })),
  toggleSpeed: () => set((state) => ({ speed: state.speed === 1 ? 2 : 1 })),
  startWave: () => {
    const state = get()
    if (state.status !== 'running' || state.waveActive || state.wave >= 20) return
    const wave = state.wave + 1
    const bestWave = Math.max(state.bestWave, wave)
    saveProgress(bestWave, state.victories)
    set({ wave, bestWave, waveActive: true })
  },
  buildTower: (type) => {
    const { selectedSpot, gold, towers, status } = get()
    const cost = type === 'archer' ? 100 : type === 'mage' ? 130 : type === 'cannon' ? 150 : 120
    if (status !== 'running' || selectedSpot === null || gold < cost || towers.some((tower) => tower.spot === selectedSpot)) return
    const tower: Tower = { id: `${Date.now()}-${Math.random()}`, type, level: 1, spot: selectedSpot }
    set({ gold: gold - cost, towers: [...towers, tower], selectedSpot: null, selectedTowerId: tower.id })
  },
  upgradeTower: () => {
    const { towers, selectedTowerId, gold } = get()
    const tower = towers.find((item) => item.id === selectedTowerId)
    if (!tower || tower.level >= 3) return
    const cost = Math.round((tower.type === 'archer' ? 100 : tower.type === 'mage' ? 130 : tower.type === 'cannon' ? 150 : 120) * (tower.level === 1 ? 0.8 : 1.2))
    if (gold < cost) return
    set({ gold: gold - cost, towers: towers.map((item) => item.id === tower.id ? { ...item, level: item.level + 1 } : item) })
  },
  sellTower: () => {
    const { towers, selectedTowerId, gold } = get()
    const tower = towers.find((item) => item.id === selectedTowerId)
    if (!tower) return
    const baseCost = tower.type === 'archer' ? 100 : tower.type === 'mage' ? 130 : tower.type === 'cannon' ? 150 : 120
    const spent = baseCost + (tower.level >= 2 ? Math.round(baseCost * 0.8) : 0) + (tower.level >= 3 ? Math.round(baseCost * 1.2) : 0)
    set({ gold: gold + Math.floor(spent * 0.6), towers: towers.filter((item) => item.id !== tower.id), selectedTowerId: null })
  },
  selectSpot: (spot) => set({ selectedSpot: spot, selectedTowerId: null }),
  selectTower: (id) => set({ selectedTowerId: id, selectedSpot: null }),
  clearSelection: () => set({ selectedSpot: null, selectedTowerId: null }),
  earnGold: (amount) => set((state) => ({ gold: state.gold + amount })),
  loseLife: () => set((state) => {
    const lives = Math.max(0, state.lives - 1)
    return { lives, status: lives === 0 ? 'defeat' : state.status }
  }),
  setEnemyCount: (enemyCount) => set((state) => state.enemyCount === enemyCount ? state : { enemyCount }),
  moveHero: (x, y) => set({ heroTarget: { x, y } }),
  clearHeroTarget: () => set({ heroTarget: null }),
  setSkillMode: (skillMode) => set({ skillMode }),
  setHeroPosition: (heroX, heroY) => set({ heroX, heroY }),
  useMeteor: () => {
    const { meteorReadyAt, status } = get()
    if (status !== 'running' || Date.now() < meteorReadyAt) return false
    set({ meteorReadyAt: Date.now() + 25000, skillMode: null })
    return true
  },
  useReinforcements: () => {
    const { reinforcementsReadyAt, status } = get()
    if (status !== 'running' || Date.now() < reinforcementsReadyAt) return false
    set({ reinforcementsReadyAt: Date.now() + 20000, skillMode: null })
    return true
  },
  finishWave: () => set((state) => ({ waveActive: false, gold: state.gold + 25 + state.wave * 3 })),
  winGame: () => {
    const { victories, bestWave } = get()
    saveProgress(bestWave, victories + 1)
    set({ status: 'victory', victories: victories + 1 })
  },
}))
