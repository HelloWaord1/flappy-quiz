// ============================================================
// SOUND EFFECTS — Web Audio API (programmatic generation)
// ============================================================

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone({ frequency, endFrequency, duration, type = 'sine', volume = 0.15 }) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  if (endFrequency != null) {
    osc.frequency.linearRampToValueAtTime(endFrequency, ctx.currentTime + duration);
  }

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playFlap() {
  playTone({ frequency: 300, endFrequency: 600, duration: 0.08, type: 'sine', volume: 0.1 });
}

export function playCorrect() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // First tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(400, now);
  gain1.gain.setValueAtTime(0.12, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.15);

  // Second tone (higher, slight delay)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(600, now + 0.08);
  gain2.gain.setValueAtTime(0.001, now);
  gain2.gain.setValueAtTime(0.12, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.22);
}

export function playWrong() {
  playTone({ frequency: 150, duration: 0.2, type: 'sawtooth', volume: 0.1 });
}

export function playHeartPickup() {
  playTone({ frequency: 800, endFrequency: 1200, duration: 0.1, type: 'sine', volume: 0.12 });
}

export function playGameOver() {
  playTone({ frequency: 400, endFrequency: 100, duration: 0.5, type: 'sine', volume: 0.15 });
}

export function playPhaseUnlock() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const notes = [300, 500, 700];
  const step = 0.12;

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * step);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.setValueAtTime(0.12, now + i * step);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * step + step * 1.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * step);
    osc.stop(now + i * step + step * 1.5);
  });
}
