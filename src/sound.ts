// Tiny sound effects made with the Web Audio API, so there are no sound files
// to download. Each effect is a few short beeps or a puff of noise.

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean) {
  muted = value;
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null; // No audio support: stay quiet.
  }
}

function tone(freq: number, start: number, length: number, type: OscillatorType = 'sine', volume = 0.15) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + length);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + length);
}

function thump(start = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
  gain.gain.setValueAtTime(0.4, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

const notes = (freqs: number[], step: number, length: number, type?: OscillatorType) =>
  freqs.forEach((f, i) => tone(f, i * step, length, type));

export const sounds = {
  right: () => notes([660, 880], 0.07, 0.12),
  wrong: () => notes([300, 250], 0.1, 0.18, 'triangle'),
  kick: () => thump(),
  goal: () => {
    thump();
    notes([523, 659, 784, 1047], 0.08, 0.2, 'square');
  },
  save: () => {
    thump();
    tone(180, 0.1, 0.3, 'sawtooth', 0.08);
  },
  search: () => tone(440, 0, 0.15, 'triangle'),
  found: () => notes([784, 988, 1175, 1568], 0.07, 0.15, 'square'),
  giggle: () => notes([900, 1200, 950, 1250, 1000, 1300], 0.06, 0.07, 'triangle'),
  power: () => {
    thump();
    notes([392, 523, 659, 784, 1047, 1319], 0.05, 0.18, 'sawtooth');
  },
  boss: () => notes([196, 185, 175, 165], 0.18, 0.3, 'square'),
  hatch: () => notes([523, 784, 1047, 1319, 1568], 0.1, 0.35),
};
