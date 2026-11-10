import Phaser from 'phaser'
import { useGameStore } from './store'
import {
  BUILD_SPOTS, ENEMY_INFO, MAP_HEIGHT, MAP_WIDTH, PATH, TOWER_RANGE,
  TOWER_INFO, type EnemyType, type Tower, type TowerType,
} from './types'

interface Enemy {
  id: number
  type: EnemyType
  x: number
  y: number
  pathIndex: number
  hp: number
  maxHp: number
  speed: number
  armor: number
  radius: number
  hitFlash: number
  blocked: number
}

interface Shot {
  x: number
  y: number
  target: Enemy
  damage: number
  color: number
  splash: number
  speed: number
  ignoresArmor: boolean
}

interface Guard {
  x: number
  y: number
  life: number
  attack: number
  towerId?: string
}

interface Effect {
  x: number
  y: number
  life: number
  maxLife: number
  color: number
  radius: number
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y)

const towerDamage: Record<TowerType, number> = {
  archer: 27, mage: 48, cannon: 65, barracks: 29,
}

export class GameScene extends Phaser.Scene {
  private world!: Phaser.GameObjects.Graphics
  private units!: Phaser.GameObjects.Graphics
  private enemies: Enemy[] = []
  private shots: Shot[] = []
  private guards: Guard[] = []
  private effects: Effect[] = []
  private cooldowns = new Map<string, number>()
  private spawnQueue: EnemyType[] = []
  private spawnTimer = 0
  private queuedWave = 0
  private waveInProgress = false
  private heroAttack = 0
  private heroBlink = 0

  constructor() {
    super('forest')
  }

  create() {
    this.world = this.add.graphics()
    this.units = this.add.graphics()
    this.drawWorld()
    this.input.on('pointerdown', this.handlePointer, this)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', this.handlePointer, this)
    })
  }

  private drawWorld() {
    const g = this.world
    g.fillGradientStyle(0x73995b, 0x73995b, 0x607d4c, 0x607d4c)
    g.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT)

    let seed = 9847
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    for (let i = 0; i < 118; i += 1) {
      const x = random() * MAP_WIDTH
      const y = random() * MAP_HEIGHT
      if (this.distanceFromPath(x, y) < 70) continue
      const radius = 3 + random() * 8
      g.fillStyle(i % 3 === 0 ? 0x7fa564 : 0x668751, 0.25)
      g.fillCircle(x, y, radius)
    }
    for (let i = 0; i < 26; i += 1) {
      const x = 25 + random() * (MAP_WIDTH - 50)
      const y = 28 + random() * (MAP_HEIGHT - 56)
      if (this.distanceFromPath(x, y) < 82 || BUILD_SPOTS.some((spot) => distance(spot, { x, y }) < 50)) continue
      this.drawTree(g, x, y, 0.72 + random() * 0.65, i)
    }

    g.lineStyle(52, 0x4c593d, 0.18)
    g.beginPath()
    PATH.forEach((point, index) => index === 0 ? g.moveTo(point.x, point.y) : g.lineTo(point.x, point.y))
    g.strokePath()
    g.lineStyle(44, 0xc3a77a, 1)
    g.beginPath()
    PATH.forEach((point, index) => index === 0 ? g.moveTo(point.x, point.y) : g.lineTo(point.x, point.y))
    g.strokePath()
    g.lineStyle(3, 0xe6d2a7, 0.52)
    g.beginPath()
    PATH.forEach((point, index) => index === 0 ? g.moveTo(point.x, point.y) : g.lineTo(point.x, point.y))
    g.strokePath()

    this.drawCastle(g, 1060, 370)
    this.drawGate(g, 0, 465)

    BUILD_SPOTS.forEach((spot, index) => {
      g.fillStyle(0x263e2b, 0.24)
      g.fillEllipse(spot.x, spot.y + 13, 55, 22)
      g.fillStyle(0xdacb8b, 0.95)
      g.fillCircle(spot.x, spot.y, 17)
      g.lineStyle(3, 0x856d42, 0.95)
      g.strokeCircle(spot.x, spot.y, 17)
      g.fillStyle(0x725f3c, 0.9)
      g.fillRect(spot.x - 2, spot.y - 7, 4, 14)
      g.fillRect(spot.x - 7, spot.y - 2, 14, 4)
      g.fillStyle(0xfff0be, 0.8)
      g.fillCircle(spot.x, spot.y, 3)
      void index
    })

    g.fillStyle(0x283c2b, 0.78)
    g.fillRoundedRect(465, 13, 170, 34, 12)
    g.lineStyle(1, 0xd8c48a, 0.55)
    g.strokeRoundedRect(465, 13, 170, 34, 12)
  }

  private drawTree(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number, variant: number) {
    const r = 18 * scale
    g.fillStyle(0x354a32, 0.3)
    g.fillEllipse(x + 6 * scale, y + 9 * scale, r * 2.6, r * 1.1)
    g.fillStyle(0x684d35, 1)
    g.fillRoundedRect(x - 4 * scale, y - 2 * scale, 8 * scale, 22 * scale, 3)
    const greens = [0x476d43, 0x527b48, 0x41663e, 0x5d8050]
    g.fillStyle(greens[variant % greens.length], 1)
    g.fillCircle(x, y - 9 * scale, r)
    g.fillStyle(0x6d9252, 0.7)
    g.fillCircle(x - r * 0.28, y - 14 * scale, r * 0.55)
    g.fillStyle(0x809750, 0.55)
    g.fillCircle(x + r * 0.4, y - 7 * scale, r * 0.34)
  }

  private drawCastle(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0x3e4335, 0.3)
    g.fillEllipse(x + 2, y + 35, 95, 34)
    g.fillStyle(0xddd2b5, 1)
    g.fillRoundedRect(x - 32, y - 12, 64, 56, 6)
    g.fillStyle(0xaaa18d, 1)
    g.fillRoundedRect(x - 42, y - 37, 23, 69, 4)
    g.fillRoundedRect(x + 19, y - 37, 23, 69, 4)
    g.fillStyle(0x8b6246, 1)
    g.fillTriangle(x - 44, y - 37, x - 30, y - 58, x - 18, y - 37)
    g.fillTriangle(x + 18, y - 37, x + 31, y - 58, x + 44, y - 37)
    g.fillStyle(0x795b43, 1)
    g.fillRoundedRect(x - 9, y + 13, 18, 31, 8)
    g.fillStyle(0x9c5549, 1)
    g.fillRect(x - 12, y - 68, 24, 21)
    g.fillStyle(0xf1d987, 1)
    g.fillTriangle(x, y - 83, x + 2, y - 63, x + 20, y - 69)
    g.fillStyle(0x304332, 0.6)
    g.fillRect(x - 2, y - 68, 4, 23)
  }

  private drawGate(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0x473d30, 0.7)
    g.fillRoundedRect(x - 7, y - 35, 22, 72, 4)
    g.fillStyle(0x786348, 1)
    g.fillRoundedRect(x, y - 30, 10, 61, 3)
    g.fillStyle(0xd5b16a, 1)
    g.fillCircle(x + 6, y, 4)
  }

  private distanceFromPath(x: number, y: number) {
    return Math.min(...PATH.slice(1).map((point, index) => {
      const a = PATH[index]
      const dx = point.x - a.x
      const dy = point.y - a.y
      const length = dx * dx + dy * dy
      const t = Phaser.Math.Clamp(((x - a.x) * dx + (y - a.y) * dy) / length, 0, 1)
      return Phaser.Math.Distance.Between(x, y, a.x + t * dx, a.y + t * dy)
    }))
  }

  private handlePointer(pointer: Phaser.Input.Pointer) {
    const state = useGameStore.getState()
    if (state.status !== 'running') return
    const x = pointer.worldX
    const y = pointer.worldY
    if (state.skillMode) {
      if (state.skillMode === 'meteor' && state.useMeteor()) this.castMeteor(x, y)
      else if (state.skillMode === 'reinforcements' && state.useReinforcements()) this.callReinforcements(x, y)
      else state.setSkillMode(null)
      return
    }
    const tower = state.towers.find((item) => distance(BUILD_SPOTS[item.spot], { x, y }) < 27)
    if (tower) {
      state.selectTower(tower.id)
      return
    }
    const spot = BUILD_SPOTS.findIndex((point) => distance(point, { x, y }) < 25)
    if (spot >= 0) {
      state.selectSpot(spot)
      return
    }
    if (x > 12 && x < MAP_WIDTH - 54 && y > 45 && y < MAP_HEIGHT - 25) {
      state.clearSelection()
      state.moveHero(x, y)
    }
  }

  private castMeteor(x: number, y: number) {
    this.effects.push({ x, y, life: 1.15, maxLife: 1.15, color: 0xff9d55, radius: 150 })
    this.enemies.forEach((enemy) => {
      if (distance(enemy, { x, y }) <= 150) this.damageEnemy(enemy, 250 + useGameStore.getState().wave * 12, true)
    })
  }

  private callReinforcements(x: number, y: number) {
    this.guards.push(
      { x: x - 15, y, life: 12, attack: 0 },
      { x: x + 15, y, life: 12, attack: 0.3 },
    )
    this.effects.push({ x, y, life: 0.7, maxLife: 0.7, color: 0x8ce2a2, radius: 55 })
  }

  update(_time: number, delta: number) {
    const state = useGameStore.getState()
    if (state.status !== 'running') return
    const dt = Math.min(delta / 1000, 0.05) * state.speed
    this.beginWaveIfNeeded(state.wave, state.waveActive)
    this.updateSpawning(dt)
    this.updateEnemies(dt)
    this.updateTowers(dt, state.towers)
    this.updateShots(dt)
    this.updateHero(dt, state.heroX, state.heroY, state.heroTarget)
    this.updateGuards(dt)
    this.updateEffects(dt)
    useGameStore.getState().setEnemyCount(this.enemies.length + this.spawnQueue.length)
    this.checkWaveComplete()
    this.drawUnits(state.towers)
  }

  private beginWaveIfNeeded(wave: number, active: boolean) {
    if (!active || wave === this.queuedWave) return
    this.queuedWave = wave
    this.waveInProgress = true
    this.spawnTimer = 0.35
    const amount = 5 + wave
    this.spawnQueue = Array.from({ length: amount }, (_, index): EnemyType => {
      if (wave < 3) return 'goblin'
      const roll = (index + wave * 2) % 10
      if (wave >= 10 && roll === 0) return 'knight'
      if (wave >= 6 && roll <= 1) return 'demon'
      if (wave >= 4 && roll <= 3) return 'wolf'
      if (roll <= 5) return 'orc'
      return 'goblin'
    })
    if (wave === 20) this.spawnQueue.push('boss', 'knight', 'demon')
  }

  private updateSpawning(dt: number) {
    if (!this.waveInProgress || this.spawnQueue.length === 0) return
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      const type = this.spawnQueue.shift()!
      this.spawnEnemy(type)
      this.spawnTimer = type === 'boss' ? 1.5 : Math.max(0.38, 0.84 - useGameStore.getState().wave * 0.012)
    }
  }

  private spawnEnemy(type: EnemyType) {
    const stats = ENEMY_INFO[type]
    const wave = useGameStore.getState().wave
    const multiplier = type === 'boss' ? 1 + (wave - 20) * 0.1 : 1 + Math.max(0, wave - 1) * 0.11
    this.enemies.push({
      id: Date.now() + Math.random(),
      type,
      x: PATH[0].x,
      y: PATH[0].y,
      pathIndex: 1,
      hp: stats.hp * multiplier,
      maxHp: stats.hp * multiplier,
      speed: stats.speed * (1 + Math.max(0, wave - 1) * 0.018),
      armor: stats.armor,
      radius: stats.radius,
      hitFlash: 0,
      blocked: 0,
    })
  }

  private updateEnemies(dt: number) {
    this.enemies.forEach((enemy) => {
      enemy.blocked = Math.max(0, enemy.blocked - dt)
      if (enemy.blocked > 0) return
      const next = PATH[enemy.pathIndex]
      if (!next) return
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, next.x, next.y)
      const step = enemy.speed * dt
      enemy.x += Math.cos(angle) * step
      enemy.y += Math.sin(angle) * step
      if (distance(enemy, next) < step + 2) {
        enemy.x = next.x
        enemy.y = next.y
        enemy.pathIndex += 1
        if (enemy.pathIndex >= PATH.length) {
          useGameStore.getState().loseLife()
          enemy.hp = 0
        }
      }
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt)
    })
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0)
  }

  private updateTowers(dt: number, towers: Tower[]) {
    towers.forEach((tower) => {
      const spot = BUILD_SPOTS[tower.spot]
      const range = TOWER_RANGE[tower.type] + (tower.level - 1) * 15
      let cooldown = (this.cooldowns.get(tower.id) ?? 0) - dt
      if (tower.type === 'barracks') {
        if (!this.guards.some((guard) => guard.towerId === tower.id)) {
          this.guards.push(
            { x: spot.x - 12, y: spot.y + 16, life: Number.POSITIVE_INFINITY, attack: 0, towerId: tower.id },
            { x: spot.x + 12, y: spot.y + 16, life: Number.POSITIVE_INFINITY, attack: 0.35, towerId: tower.id },
          )
        }
        this.cooldowns.set(tower.id, 0)
        return
      } else {
        const target = this.enemies
          .filter((enemy) => distance(enemy, spot) < range)
          .sort((a, b) => b.pathIndex - a.pathIndex || distance(a, spot) - distance(b, spot))[0]
        if (target && cooldown <= 0) {
          const color = tower.type === 'archer' ? 0x83dc76 : tower.type === 'mage' ? 0xc49bff : 0xffb264
          this.shots.push({
            x: spot.x,
            y: spot.y - 15,
            target,
            damage: towerDamage[tower.type] * (1 + (tower.level - 1) * 0.65),
            color,
            splash: tower.type === 'cannon' ? 58 : 0,
            speed: tower.type === 'cannon' ? 350 : 560,
            ignoresArmor: tower.type === 'mage',
          })
          cooldown = (tower.type === 'archer' ? 0.62 : tower.type === 'mage' ? 1.2 : 1.55) / (1 + (tower.level - 1) * 0.12)
        }
      }
      this.cooldowns.set(tower.id, Math.max(0, cooldown))
    })
  }

  private updateShots(dt: number) {
    this.shots = this.shots.filter((shot) => {
      if (shot.target.hp <= 0) return false
      const dist = distance(shot, shot.target)
      const step = shot.speed * dt
      if (dist <= step + shot.target.radius) {
        if (shot.splash) {
          this.enemies.forEach((enemy) => {
            if (distance(enemy, shot.target) <= shot.splash) this.damageEnemy(enemy, shot.damage, false)
          })
          this.effects.push({ x: shot.target.x, y: shot.target.y, life: 0.32, maxLife: 0.32, color: shot.color, radius: shot.splash })
        } else {
          this.damageEnemy(shot.target, shot.damage, shot.ignoresArmor)
          this.effects.push({ x: shot.target.x, y: shot.target.y, life: 0.16, maxLife: 0.16, color: shot.color, radius: 14 })
        }
        return false
      }
      shot.x += (shot.target.x - shot.x) / dist * step
      shot.y += (shot.target.y - shot.y) / dist * step
      return true
    })
  }

  private updateHero(dt: number, x: number, y: number, target: { x: number; y: number } | null) {
    const state = useGameStore.getState()
    if (target) {
      const dist = distance({ x, y }, target)
      const step = 145 * dt
      if (dist < step + 4) {
        state.setHeroPosition(target.x, target.y)
        state.clearHeroTarget()
      }
      else state.setHeroPosition(x + (target.x - x) / dist * step, y + (target.y - y) / dist * step)
    }
    this.heroAttack -= dt
    this.heroBlink += dt
    const targetEnemy = this.enemies
      .filter((enemy) => distance(enemy, { x, y }) < 125)
      .sort((a, b) => b.pathIndex - a.pathIndex)[0]
    if (targetEnemy && this.heroAttack <= 0) {
      this.shots.push({
        x, y: y - 13, target: targetEnemy, damage: 46, color: 0xffe083,
        splash: 0, speed: 650, ignoresArmor: false,
      })
      this.heroAttack = 1.05
    }
  }

  private updateGuards(dt: number) {
    this.guards = this.guards.filter((guard) => {
      if (guard.towerId) {
        const tower = useGameStore.getState().towers.find((item) => item.id === guard.towerId)
        if (!tower) return false
        const home = BUILD_SPOTS[tower.spot]
        const target = this.enemies
          .filter((enemy) => distance(enemy, home) < TOWER_RANGE.barracks + (tower.level - 1) * 15)
          .sort((a, b) => b.pathIndex - a.pathIndex)[0]
        guard.attack -= dt
        if (target) {
          const dist = distance(target, guard)
          if (dist > 25) {
            const step = 95 * dt
            guard.x += (target.x - guard.x) / dist * step
            guard.y += (target.y - guard.y) / dist * step
          } else if (guard.attack <= 0) {
            this.damageEnemy(target, towerDamage.barracks * tower.level, false)
            target.blocked = Math.max(target.blocked, 0.35)
            guard.attack = 0.95
            this.effects.push({ x: target.x, y: target.y, life: 0.18, maxLife: 0.18, color: 0xf2da9b, radius: 19 })
          }
        } else {
          const dist = distance(home, guard)
          const step = 90 * dt
          if (dist > 3) {
            guard.x += (home.x - guard.x) / dist * step
            guard.y += (home.y - guard.y) / dist * step
          }
        }
        return true
      }

      guard.life -= dt
      guard.attack -= dt
      if (guard.life <= 0) return false
      const target = this.enemies
        .filter((enemy) => distance(enemy, guard) < 100)
        .sort((a, b) => b.pathIndex - a.pathIndex)[0]
      if (target && guard.attack <= 0) {
        this.damageEnemy(target, 35, false)
        guard.attack = 0.9
      } else if (!target && this.enemies.length) {
        const enemy = this.enemies.reduce((closest, item) =>
          distance(item, guard) < distance(closest, guard) ? item : closest)
        const dist = distance(enemy, guard)
        const speed = 80 * dt
        if (dist > 28) {
          guard.x += (enemy.x - guard.x) / dist * speed
          guard.y += (enemy.y - guard.y) / dist * speed
        }
      }
      return true
    })
  }

  private damageEnemy(enemy: Enemy, damage: number, ignoresArmor: boolean) {
    if (enemy.hp <= 0) return
    enemy.hp -= damage * (ignoresArmor ? 1 : 1 - enemy.armor)
    enemy.hitFlash = 0.12
    if (enemy.hp <= 0) {
      useGameStore.getState().earnGold(ENEMY_INFO[enemy.type].reward)
      this.effects.push({ x: enemy.x, y: enemy.y, life: 0.25, maxLife: 0.25, color: 0xf1d090, radius: enemy.radius * 1.6 })
    }
  }

  private updateEffects(dt: number) {
    this.effects.forEach((effect) => { effect.life -= dt })
    this.effects = this.effects.filter((effect) => effect.life > 0)
  }

  private checkWaveComplete() {
    if (!this.waveInProgress || this.spawnQueue.length || this.enemies.length) return
    this.waveInProgress = false
    const state = useGameStore.getState()
    state.finishWave()
    if (state.wave === 20) state.winGame()
  }

  private drawUnits(towers: Tower[]) {
    const g = this.units
    const state = useGameStore.getState()
    g.clear()

    towers.forEach((tower) => this.drawTower(g, tower, state.selectedTowerId === tower.id))
    this.enemies.forEach((enemy) => this.drawEnemy(g, enemy))
    this.shots.forEach((shot) => {
      g.fillStyle(shot.color, 0.28)
      g.fillCircle(shot.x, shot.y, 8)
      g.fillStyle(shot.color, 1)
      g.fillCircle(shot.x, shot.y, 4)
      g.fillStyle(0xfff6cf, 0.95)
      g.fillCircle(shot.x, shot.y, 1.6)
    })
    this.guards.forEach((guard, index) => {
      g.fillStyle(0x253d36, 0.25)
      g.fillEllipse(guard.x, guard.y + 13, 25, 10)
      g.fillStyle(index % 2 ? 0x6694ba : 0x75a8ca, 1)
      g.fillCircle(guard.x, guard.y, 10)
      g.lineStyle(2, 0xf0d494, 1)
      g.strokeCircle(guard.x, guard.y - 1, 10)
      g.lineStyle(2, 0xe2dfc5, 1)
      g.lineBetween(guard.x + 7, guard.y - 9, guard.x + 13, guard.y - 23)
    })
    this.drawHero(g, state.heroX, state.heroY)
    this.drawEffects(g)
    this.drawHUD(g, state.wave)
  }

  private drawTower(g: Phaser.GameObjects.Graphics, tower: Tower, selected: boolean) {
    const { x, y } = BUILD_SPOTS[tower.spot]
    const color = TOWER_INFO[tower.type].color
    if (selected) {
      g.fillStyle(color, 0.11)
      g.fillCircle(x, y, TOWER_RANGE[tower.type] + (tower.level - 1) * 15)
      g.lineStyle(2, color, 0.58)
      g.strokeCircle(x, y, TOWER_RANGE[tower.type] + (tower.level - 1) * 15)
    }
    g.fillStyle(0x29382b, 0.3)
    g.fillEllipse(x, y + 14, 51, 22)
    g.fillStyle(0x8a6c45, 1)
    g.fillRoundedRect(x - 19, y + 5, 38, 10, 5)
    g.fillStyle(color, 1)
    g.fillRoundedRect(x - 17, y - 18, 34, 29, 8)
    g.fillStyle(0xffe5a5, 0.9)
    g.fillCircle(x, y - 9, 6 + tower.level)
    if (tower.type === 'archer') {
      g.fillStyle(0x79533a, 1)
      g.fillTriangle(x - 15, y - 15, x, y - 37, x + 15, y - 15)
      g.lineStyle(2, 0xe7d79d, 1)
      g.lineBetween(x - 12, y - 14, x + 12, y - 14)
    } else if (tower.type === 'mage') {
      g.fillStyle(0x624a8b, 1)
      g.fillTriangle(x - 20, y - 14, x, y - 43, x + 20, y - 14)
      g.fillStyle(0xd8bdff, 1)
      g.fillCircle(x, y - 24, 5)
    } else if (tower.type === 'cannon') {
      g.fillStyle(0x4b4c4a, 1)
      g.fillCircle(x, y - 8, 13)
      g.fillStyle(0x272d2b, 1)
      g.fillRoundedRect(x - 4, y - 31, 9, 24, 4)
      g.lineStyle(2, 0xc5ac78, 1)
      g.strokeCircle(x, y - 8, 13)
    } else {
      g.fillStyle(0xd5d8ce, 1)
      g.fillRoundedRect(x - 11, y - 33, 22, 20, 7)
      g.fillStyle(0x748394, 1)
      g.fillRect(x - 3, y - 29, 6, 14)
      g.lineStyle(3, 0xb69b69, 1)
      g.lineBetween(x + 11, y - 26, x + 22, y - 39)
    }
    for (let i = 0; i < tower.level; i += 1) {
      g.fillStyle(0xffe19a, 1)
      g.fillCircle(x - 6 + i * 6, y + 13, 2)
    }
    if (selected) {
      g.lineStyle(2, 0xfff0bb, 1)
      g.strokeCircle(x, y - 7, 29)
    }
  }

  private drawEnemy(g: Phaser.GameObjects.Graphics, enemy: Enemy) {
    const { color } = ENEMY_INFO[enemy.type]
    const radius = enemy.radius
    g.fillStyle(0x2d382e, 0.28)
    g.fillEllipse(enemy.x, enemy.y + radius * 0.72, radius * 2.3, radius * 0.9)
    g.fillStyle(enemy.hitFlash > 0 ? 0xffdfc1 : color, 1)
    if (enemy.type === 'demon') {
      g.fillTriangle(enemy.x - radius, enemy.y - radius * 0.2, enemy.x - radius * 1.9, enemy.y - radius * 1.2, enemy.x - radius * 0.55, enemy.y + 2)
      g.fillTriangle(enemy.x + radius, enemy.y - radius * 0.2, enemy.x + radius * 1.9, enemy.y - radius * 1.2, enemy.x + radius * 0.55, enemy.y + 2)
    } else if (enemy.type === 'boss') {
      g.fillTriangle(enemy.x - 19, enemy.y - 17, enemy.x - 26, enemy.y - 41, enemy.x - 8, enemy.y - 25)
      g.fillTriangle(enemy.x + 19, enemy.y - 17, enemy.x + 26, enemy.y - 41, enemy.x + 8, enemy.y - 25)
    }
    g.fillCircle(enemy.x, enemy.y, radius)
    if (enemy.type === 'knight' || enemy.type === 'boss') {
      g.lineStyle(enemy.type === 'boss' ? 4 : 2, 0xe7d7a5, 0.9)
      g.strokeCircle(enemy.x, enemy.y, radius - 3)
    }
    g.fillStyle(0xf8e8d0, 1)
    g.fillCircle(enemy.x + radius * 0.28, enemy.y - radius * 0.12, Math.max(1.7, radius * 0.15))
    g.fillStyle(0x352e2b, 1)
    g.fillCircle(enemy.x + radius * 0.34, enemy.y - radius * 0.12, Math.max(1, radius * 0.07))
    const width = Math.max(23, radius * 2.2)
    g.fillStyle(0x403b35, 0.88)
    g.fillRoundedRect(enemy.x - width / 2, enemy.y - radius - 10, width, 5, 3)
    g.fillStyle(enemy.type === 'boss' ? 0xe89c5f : 0x9bd06f, 1)
    g.fillRoundedRect(enemy.x - width / 2, enemy.y - radius - 10, width * Math.max(0, enemy.hp / enemy.maxHp), 5, 3)
  }

  private drawHero(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.fillStyle(0x233d32, 0.28)
    g.fillEllipse(x, y + 14, 35, 15)
    g.fillStyle(0x4e82a2, 1)
    g.fillRoundedRect(x - 10, y - 8, 20, 21, 8)
    g.fillStyle(0xe5bd8a, 1)
    g.fillCircle(x, y - 13, 9)
    g.fillStyle(0x625441, 1)
    g.fillRoundedRect(x - 10, y - 24, 20, 6, 3)
    g.fillStyle(0x8a6750, 1)
    g.fillTriangle(x - 9, y - 21, x, y - 34, x + 10, y - 21)
    g.lineStyle(3, 0xe6d9bd, 1)
    g.lineBetween(x + 11, y - 12, x + 17 + Math.sin(this.heroBlink * 5) * 3, y - 31)
    g.lineStyle(2, 0xeee1bb, 0.8)
    g.strokeCircle(x, y - 9, 18)
  }

  private drawEffects(g: Phaser.GameObjects.Graphics) {
    this.effects.forEach((effect) => {
      const progress = 1 - effect.life / effect.maxLife
      const radius = effect.radius * (0.25 + progress * 0.75)
      g.fillStyle(effect.color, 0.12 * (1 - progress))
      g.fillCircle(effect.x, effect.y, radius)
      g.lineStyle(3 + 5 * (1 - progress), effect.color, 0.85 * (1 - progress))
      g.strokeCircle(effect.x, effect.y, radius)
      if (effect.color === 0xff9d55) {
        g.fillStyle(0xffdb9c, 0.8 * (1 - progress))
        g.fillCircle(effect.x, effect.y - progress * 35, 13 + progress * 7)
      }
    })
  }

  private drawHUD(g: Phaser.GameObjects.Graphics, wave: number) {
    g.fillStyle(0xe9dbb7, 0.8)
    g.fillCircle(520, 27, 4)
    g.fillCircle(580, 27, 4)
    g.fillCircle(550, 27, 4)
    g.fillStyle(0x2b3c2b, 0.75)
    g.fillRoundedRect(496, 19, 108, 16, 8)
    g.fillStyle(0xd9c38b, 0.8)
    for (let i = 0; i < 20; i += 1) {
      if (i < wave) {
        g.fillStyle(i === 19 ? 0xf1a064 : 0xe8d28f, 0.95)
        g.fillCircle(500 + i * 5.25, 27, 2.1)
      }
    }
  }
}

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  parent: 'phaser-stage',
  backgroundColor: '#73995b',
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  },
  render: { antialias: true, pixelArt: false, roundPixels: false },
  input: { activePointers: 3 },
}
