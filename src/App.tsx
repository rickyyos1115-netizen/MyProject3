import { useEffect, useMemo, useState } from 'react'
import type Phaser from 'phaser'
import { soundEffect } from './game/audio'
import { useGameStore } from './game/store'
import {
  BUILD_SPOTS, TOWER_INFO, TOWER_RANGE, type TowerType, towerCost,
} from './game/types'

const towerOrder: TowerType[] = ['archer', 'mage', 'cannon', 'barracks']

const formatCooldown = (time: number) => {
  const seconds = Math.max(0, Math.ceil((time - Date.now()) / 1000))
  return seconds ? `${seconds}s` : '就緒'
}

function GameCanvas() {
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let active = true
    let game: Phaser.Game | undefined
    void Promise.all([import('phaser'), import('./game/GameScene')])
      .then(([phaser, scene]) => {
        if (active) game = new phaser.default.Game(scene.gameConfig)
      })
      .catch((error: unknown) => {
        console.error('無法載入遊戲戰場。', error)
        if (active) setLoadError(true)
      })
    return () => {
      active = false
      game?.destroy(true)
    }
  }, [])
  return <div id="phaser-stage" className="game-canvas" aria-label="翡翠森林塔防戰場">
    {loadError && <p className="game-load-error">遊戲戰場載入失敗，請重新整理頁面再試一次。</p>}
  </div>
}

function App() {
  const status = useGameStore((state) => state.status)
  const gold = useGameStore((state) => state.gold)
  const lives = useGameStore((state) => state.lives)
  const wave = useGameStore((state) => state.wave)
  const waveActive = useGameStore((state) => state.waveActive)
  const speed = useGameStore((state) => state.speed)
  const towers = useGameStore((state) => state.towers)
  const selectedSpot = useGameStore((state) => state.selectedSpot)
  const selectedTowerId = useGameStore((state) => state.selectedTowerId)
  const enemyCount = useGameStore((state) => state.enemyCount)
  const skillMode = useGameStore((state) => state.skillMode)
  const meteorReadyAt = useGameStore((state) => state.meteorReadyAt)
  const reinforcementsReadyAt = useGameStore((state) => state.reinforcementsReadyAt)
  const bestWave = useGameStore((state) => state.bestWave)
  const victories = useGameStore((state) => state.victories)
  const [clock, setClock] = useState(Date.now())
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('kingdom-sound') !== 'off')

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 500)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.target instanceof HTMLInputElement) return
      if (event.key.toLowerCase() === 'q') selectSkill('meteor')
      if (event.key.toLowerCase() === 'w') selectSkill('reinforcements')
      if (event.key === 'Escape') useGameStore.getState().setSkillMode(null)
      if (event.code === 'Space' && status === 'running') {
        event.preventDefault()
        togglePause()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [status, meteorReadyAt, reinforcementsReadyAt, skillMode])

  const selectedTower = useMemo(
    () => towers.find((tower) => tower.id === selectedTowerId),
    [towers, selectedTowerId],
  )

  const start = () => {
    soundEffect('click')
    useGameStore.getState().startGame()
  }

  const deploy = () => {
    soundEffect('wave')
    useGameStore.getState().startWave()
  }

  const selectSkill = (skill: 'meteor' | 'reinforcements') => {
    const readyAt = skill === 'meteor' ? meteorReadyAt : reinforcementsReadyAt
    if (Date.now() < readyAt) return
    soundEffect('spell')
    useGameStore.getState().setSkillMode(skillMode === skill ? null : skill)
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    localStorage.setItem('kingdom-sound', next ? 'on' : 'off')
    if (next) soundEffect('click')
  }

  const togglePause = () => {
    soundEffect('click')
    useGameStore.getState().togglePause()
  }

  const onBuild = (type: TowerType) => {
    const before = useGameStore.getState().gold
    useGameStore.getState().buildTower(type)
    if (useGameStore.getState().gold < before) soundEffect('build')
  }

  const onUpgrade = () => {
    const before = useGameStore.getState().gold
    useGameStore.getState().upgradeTower()
    if (useGameStore.getState().gold < before) soundEffect('upgrade')
  }

  const onSell = () => {
    soundEffect('sell')
    useGameStore.getState().sellTower()
  }

  const towerRefund = selectedTower
    ? Math.floor((TOWER_INFO[selectedTower.type].cost
      + (selectedTower.level >= 2 ? Math.round(TOWER_INFO[selectedTower.type].cost * 0.8) : 0)
      + (selectedTower.level >= 3 ? Math.round(TOWER_INFO[selectedTower.type].cost * 1.2) : 0)) * 0.6)
    : 0

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => event.preventDefault()} aria-label="王國守衛者首頁">
          <span className="brand-crest">✦</span>
          <span><strong>王國守衛者</strong><small>翡翠森林 · EMERALD GROVE</small></span>
        </a>
        <div className="topbar-right">
          <span className="record-chip">最高紀錄 <b>WAVE {String(bestWave).padStart(2, '0')}</b></span>
          <span className="record-chip">守護王國 <b>{victories} 次</b></span>
          <button className="icon-button" onClick={toggleSound} title={soundOn ? '關閉音效' : '開啟音效'}>
            {soundOn ? '♫' : '♪̸'} <span>{soundOn ? '音效開' : '音效關'}</span>
          </button>
        </div>
      </header>

      <section className="game-layout">
        <div className="battle-column">
          <section className="hud" aria-label="戰場狀態">
            <div className="hud-resource lives">
              <span className="hud-icon">♥</span><span className="hud-label">王國生命</span>
              <strong>{lives}<small> / 20</small></strong>
              <span className="life-track"><i style={{ width: `${lives * 5}%` }} /></span>
            </div>
            <div className="hud-resource gold">
              <span className="hud-icon">◈</span><span className="hud-label">金幣</span>
              <strong>{gold.toLocaleString()}</strong>
              <small className="hud-sub">擊敗敵人即可獲得獎勵</small>
            </div>
            <div className="hud-resource wave-stat">
              <span className="hud-icon">⚑</span><span className="hud-label">敵軍波次</span>
              <strong>{String(wave).padStart(2, '0')}<small> / 20</small></strong>
              <span className="wave-dots" aria-label={`第 ${wave} 波，共 20 波`}>
                {Array.from({ length: 20 }, (_, i) => <i key={i} className={i < wave ? 'done' : ''} />)}
              </span>
            </div>
            <div className="hud-resource enemies-stat">
              <span className="hud-icon">⚔</span><span className="hud-label">戰場敵人</span>
              <strong>{enemyCount}</strong>
              <small className="hud-sub">{waveActive ? '敵軍正在進攻' : '森林暫時平靜'}</small>
            </div>
          </section>

          <section className={`battle-frame ${skillMode ? 'skill-armed' : ''}`}>
            <GameCanvas />
            <div className="map-stamp"><span>✦</span> 翡翠森林 <small>THE EMERALD GROVE</small></div>
            <div className="map-help">{skillMode ? '點擊戰場選擇技能目標 · 按右側按鈕取消' : '點擊空地移動英雄 · 點擊營地建造防禦塔'}</div>
            {status === 'menu' && (
              <div className="screen-overlay title-screen">
                <div className="title-ornament">✧　✦　✧</div>
                <div className="title-kicker">THE KINGDOM STANDS WITH YOU</div>
                <h1>王國<span>守衛者</span></h1>
                <p>古老森林的魔物甦醒了。挺身而出，守住王國最後一道防線。</p>
                <button className="primary-button start-button" onClick={start}>⚔　開始守衛王國 <span>→</span></button>
                <div className="title-footnote">20 波魔物 · 4 種防禦塔 · 英雄與魔法</div>
              </div>
            )}
            {status === 'paused' && (
              <div className="screen-overlay intermission">
                <div className="pause-mark">Ⅱ</div><h2>戰局暫停</h2>
                <p>你的王國正安全地等待你回來。</p>
                <button className="primary-button" onClick={togglePause}>▶　繼續戰鬥</button>
              </div>
            )}
            {(status === 'victory' || status === 'defeat') && (
              <div className={`screen-overlay result-screen ${status}`}>
                <div className="result-sigil">{status === 'victory' ? '✦' : '⚔'}</div>
                <div className="title-kicker">{status === 'victory' ? 'THE REALM IS SAFE' : 'THE KINGDOM NEEDS YOU'}</div>
                <h2>{status === 'victory' ? '王國得救了！' : '防線失守'}</h2>
                <p>{status === 'victory' ? '森林重歸寧靜，守衛者的傳說將永遠流傳。' : `你守到了第 ${wave} 波。整軍再戰，王國仍然相信你。`}</p>
                <div className="result-stats"><span>抵禦波次 <b>{wave} / 20</b></span><span>剩餘生命 <b>{lives}</b></span></div>
                <button className="primary-button" onClick={start}>↻　再次守衛王國</button>
              </div>
            )}
            {status === 'running' && (
              <>
                <div className="map-wave-badge"><span>{waveActive ? '⚔' : '✦'}</span> {waveActive ? `第 ${wave} 波交戰中` : wave ? `第 ${wave} 波已擊退` : '準備部署'}</div>
                <div className="battle-controls">
                  <button className="control-button" onClick={togglePause} title="暫停遊戲">Ⅱ</button>
                  <button className="control-button speed-button" onClick={() => useGameStore.getState().toggleSpeed()} title="切換遊戲速度">{speed}× <small>速度</small></button>
                  <button className="deploy-button" onClick={deploy} disabled={waveActive || wave >= 20}>
                    <span>{waveActive ? '✦' : '⚑'}</span>{waveActive ? '敵軍來襲' : wave >= 20 ? '最後一波' : wave === 0 ? '召喚第一波' : '提前召喚'}
                  </button>
                </div>
              </>
            )}
          </section>

          <section className="action-bar">
            <div className="hero-card">
              <div className="hero-avatar"><span>⚔</span><i /></div>
              <div className="hero-info"><strong>艾莉亞 <span>Lv. 1</span></strong><small>王國遊俠 · 點擊森林移動</small>
              </div>
              <span className="hero-ready">● 待命</span>
            </div>
            <div className="action-divider" />
            <div className="skills">
              <span className="skills-label">英雄技能</span>
              <button
                className={`skill-button meteor ${skillMode === 'meteor' ? 'armed' : ''}`}
                disabled={status !== 'running' || clock < meteorReadyAt}
                onClick={() => selectSkill('meteor')}
              ><span className="skill-icon">☄</span><span><b>流星火雨</b><small>{clock < meteorReadyAt ? formatCooldown(meteorReadyAt) : '範圍傷害'}</small></span><kbd>Q</kbd></button>
              <button
                className={`skill-button reinforce ${skillMode === 'reinforcements' ? 'armed' : ''}`}
                disabled={status !== 'running' || clock < reinforcementsReadyAt}
                onClick={() => selectSkill('reinforcements')}
              ><span className="skill-icon">♟</span><span><b>召喚援軍</b><small>{clock < reinforcementsReadyAt ? formatCooldown(reinforcementsReadyAt) : '兩位皇家衛兵'}</small></span><kbd>W</kbd></button>
            </div>
          </section>
          <div className="mobile-tip">✦ 點擊地圖移動英雄，使用技能時再點擊目標位置。</div>
        </div>

        <aside className="side-column">
          <div className="panel tower-panel">
            <div className="panel-heading"><div><span className="eyebrow">DEFENSE</span><h2>防禦工事</h2></div><span className="building-count">{towers.length}<small> / {BUILD_SPOTS.length}</small></span></div>
            <p className="panel-intro">點擊森林中的營地，選擇建造防禦塔。</p>
            <div className="tower-list">
              {towerOrder.map((type) => {
                const info = TOWER_INFO[type]
                return (
                  <div className="tower-row" key={type}>
                    <span className={`tower-emblem ${type}`}>{info.icon}</span>
                    <span className="tower-copy"><b>{info.name}</b><small>{info.description}</small></span>
                    <span className="tower-price"><i>◈</i> {info.cost}</span>
                  </div>
                )
              })}
            </div>
            <div className="tower-legend"><span>●</span> 點擊地圖的金色營地開始建造</div>
          </div>

          {(selectedSpot !== null || selectedTower) && (
            <div className="panel selection-panel">
              <button className="panel-close" aria-label="關閉" onClick={() => useGameStore.getState().clearSelection()}>×</button>
              {selectedSpot !== null ? (
                <>
                  <span className="eyebrow">BUILD A DEFENSE</span>
                  <h2>選擇防禦塔</h2>
                  <p className="panel-intro">花費金幣建造，抵禦來襲魔物。</p>
                  <div className="build-options">
                    {towerOrder.map((type) => {
                      const info = TOWER_INFO[type]
                      return <button className="build-option" key={type} onClick={() => onBuild(type)} disabled={gold < info.cost || status !== 'running'}>
                        <span className={`tower-emblem ${type}`}>{info.icon}</span>
                        <span><b>{info.name}</b><small>{info.description}</small><small className="range-note">攻擊範圍 {TOWER_RANGE[type]}</small></span>
                        <strong><i>◈</i>{info.cost}</strong>
                      </button>
                    })}
                  </div>
                  {gold < 100 && <div className="insufficient">金幣不足。擊敗敵人取得獎勵。</div>}
                </>
              ) : selectedTower && (
                <>
                  <span className="eyebrow">DEFENSE TOWER · LV. {selectedTower.level}</span>
                  <h2>{TOWER_INFO[selectedTower.type].icon}　{TOWER_INFO[selectedTower.type].name}</h2>
                  <p className="panel-intro">{TOWER_INFO[selectedTower.type].description} · 攻擊範圍 {TOWER_RANGE[selectedTower.type] + (selectedTower.level - 1) * 15}</p>
                  <div className="upgrade-stats"><span>攻擊力 <b>{Math.round((selectedTower.type === 'archer' ? 27 : selectedTower.type === 'mage' ? 48 : selectedTower.type === 'cannon' ? 65 : 29) * (1 + (selectedTower.level - 1) * 0.65))}</b></span><span>升級進度 <b>Lv. {selectedTower.level} / 3</b></span></div>
                  <button className="upgrade-button" onClick={onUpgrade} disabled={selectedTower.level >= 3 || gold < towerCost(selectedTower.type, selectedTower.level + 1)}>
                    {selectedTower.level >= 3 ? '✦　已達最高等級' : `⬆　升級防禦塔　 · 　◈ ${towerCost(selectedTower.type, selectedTower.level + 1)}`}
                  </button>
                  {selectedTower.level < 3 && gold < towerCost(selectedTower.type, selectedTower.level + 1) && <small className="insufficient">升級所需金幣不足</small>}
                  <button className="sell-button" onClick={onSell}>出售防禦塔　<span>+ ◈ {towerRefund}（返還 60%）</span></button>
                </>
              )}
            </div>
          )}

          <div className="panel field-guide">
            <div className="panel-heading"><div><span className="eyebrow">FIELD GUIDE</span><h2>守衛者手冊</h2></div><span className="guide-icon">✧</span></div>
            <div className="guide-row"><span className="guide-symbol">♧</span><span><b>四方防線</b><small>建造並升級塔樓，靈活應戰</small></span></div>
            <div className="guide-row"><span className="guide-symbol">♞</span><span><b>英雄艾莉亞</b><small>點擊戰場移動並自動攻擊</small></span></div>
            <div className="guide-row"><span className="guide-symbol">✷</span><span><b>技能扭轉戰局</b><small>流星火雨與皇家援軍隨時待命</small></span></div>
            <div className="guide-row"><span className="guide-symbol">⏱</span><span><b>掌握戰鬥節奏</b><small>切換 2× 加速，或提前召喚敵軍</small></span></div>
          </div>

          <div className="side-quote"><span>❝</span><p>每一棵古樹，都記得曾經守護它的人。</p><small>— 翡翠森林守望者</small></div>
        </aside>
      </section>
      <footer className="footer"><span>✦　王國守衛者 <i>·</i> 原創奇幻塔防冒險</span><span>LOCAL SAVE　●　{status === 'running' ? '戰鬥進行中' : status === 'paused' ? '戰鬥暫停' : '進度已儲存'}</span></footer>
    </main>
  )
}

export default App
