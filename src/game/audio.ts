type Sound = 'click' | 'build' | 'wave' | 'spell' | 'upgrade' | 'sell'

let context: AudioContext | null = null

export const soundEffect = (sound: Sound) => {
  if (localStorage.getItem('kingdom-sound') === 'off') return
  const AudioContextConstructor = window.AudioContext
  if (!AudioContextConstructor) return
  context ??= new AudioContextConstructor()
  if (context.state === 'suspended') void context.resume()
  const notes: Record<Sound, [number, number, OscillatorType]> = {
    click: [480, 0.045, 'sine'],
    build: [610, 0.12, 'triangle'],
    wave: [360, 0.22, 'sawtooth'],
    spell: [880, 0.2, 'sine'],
    upgrade: [740, 0.14, 'triangle'],
    sell: [280, 0.1, 'sine'],
  }
  const [frequency, duration, type] = notes[sound]
  const oscillator = context.createOscillator()
  const volume = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, context.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, context.currentTime + duration)
  volume.gain.setValueAtTime(0.055, context.currentTime)
  volume.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration)
  oscillator.connect(volume)
  volume.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + duration)
}
