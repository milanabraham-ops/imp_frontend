// A short, synthesized two-tone "ding" — generated via Web Audio instead of an embedded audio
// file, so there's nothing to bundle or host and no extra network request.
let sharedContext = null

export function playNotificationSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    if (!sharedContext) sharedContext = new Ctx()
    const ctx = sharedContext
    const now = ctx.currentTime

    const tone = (freq, start, duration) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now + start)
      gain.gain.linearRampToValueAtTime(0.45, now + start + 0.03)
      gain.gain.linearRampToValueAtTime(0, now + start + duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + duration)
    }

    tone(880, 0, 0.22)
    tone(1320, 0.16, 0.26)
  } catch {
    // Audio can fail for all sorts of environment reasons (autoplay policy, no audio device,
    // etc.) — a missed notification sound isn't worth surfacing an error over.
  }
}
