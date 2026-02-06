let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, delay = 0) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    const startTime = ctx.currentTime + delay;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch {}
}

export function playCorrectSound() {
  playTone(523.25, 0.15, 'sine', 0.12, 0);
  playTone(659.25, 0.15, 'sine', 0.12, 0.1);
  playTone(783.99, 0.2, 'sine', 0.12, 0.2);
}

export function playWrongSound() {
  playTone(370, 0.18, 'sine', 0.1, 0);
  playTone(294, 0.25, 'sine', 0.1, 0.15);
}

export function playStreakSound() {
  playTone(587.33, 0.12, 'sine', 0.1, 0);
  playTone(698.46, 0.12, 'sine', 0.1, 0.08);
  playTone(880, 0.2, 'sine', 0.12, 0.16);
}

export function playOnFireSound() {
  playTone(523.25, 0.1, 'sine', 0.12, 0);
  playTone(659.25, 0.1, 'sine', 0.12, 0.07);
  playTone(783.99, 0.1, 'sine', 0.12, 0.14);
  playTone(1046.50, 0.25, 'sine', 0.15, 0.21);
}

export function playLevelUpSound() {
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
  notes.forEach((freq, i) => {
    playTone(freq, 0.3, 'sine', 0.12, i * 0.12);
  });
}

export function playResultCountSound() {
  playTone(440, 0.05, 'sine', 0.05, 0);
}
