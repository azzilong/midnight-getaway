// Midnight Getaway — WebAudio synth SFX and loops (no audio files).
// Everything is an oscillator/noise envelope built at runtime.
let ctx = null;
let master = null;
let muted = false;
let sirenNodes = null;
let engineNodes = null;

export function audioInit() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  } catch { ctx = null; }
}
export function audioResume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
export function audioToggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
export function audioMuted() { return muted; }

function tone(freq, dur, type = 'sine', vol = 0.2, slideTo = null, delay = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
function noise(dur, vol = 0.15, freq = 800, delay = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
}

export const sfx = {
  click() { tone(660, 0.07, 'square', 0.08); },
  step() { noise(0.05, 0.04, 300); },
  pickup() { tone(523, 0.1, 'triangle', 0.18); tone(659, 0.1, 'triangle', 0.18, null, 0.09); tone(784, 0.16, 'triangle', 0.2, null, 0.18); },
  crackTick() { tone(1200, 0.04, 'square', 0.06); },
  crackDone() { tone(392, 0.12, 'triangle', 0.2); tone(523, 0.12, 'triangle', 0.2, null, 0.1); tone(659, 0.22, 'triangle', 0.22, null, 0.2); },
  spotted() { tone(880, 0.12, 'sawtooth', 0.14, 440); },
  alarmBlip() { tone(980, 0.09, 'square', 0.1); tone(740, 0.09, 'square', 0.1, null, 0.11); },
  smoke() { noise(0.4, 0.2, 500); },
  jammer() { tone(2200, 0.25, 'sawtooth', 0.07, 300); },
  crash() { noise(0.25, 0.25, 200); tone(90, 0.2, 'sine', 0.25, 40); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, null, i * 0.13)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'sawtooth', 0.12, null, i * 0.16)); },
  sirenStart() { sirenLoop(true); },
  sirenStop() { sirenLoop(false); },
};

function sirenLoop(on) {
  if (!ctx) return;
  if (!on) { if (sirenNodes) { try { sirenNodes.osc.stop(); } catch {} sirenNodes = null; } return; }
  if (sirenNodes) return;
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = 700;
  const lfo = ctx.createOscillator();
  lfo.type = 'square'; lfo.frequency.value = 0.9;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 220;
  lfo.connect(lfoGain); lfoGain.connect(o.frequency);
  const g = ctx.createGain(); g.gain.value = 0.05;
  o.connect(g); g.connect(master);
  o.start(); lfo.start();
  sirenNodes = { osc: o, lfo };
}
export function engineSet(speed01) {
  if (!ctx || muted) { if (engineNodes) { try { engineNodes.osc.stop(); } catch {} engineNodes = null; } return; }
  if (!engineNodes) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = 60;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
    const g = ctx.createGain(); g.gain.value = 0.05;
    o.connect(f); f.connect(g); g.connect(master);
    o.start();
    engineNodes = { osc: o, gain: g };
  }
  engineNodes.osc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.1);
  engineNodes.gain.gain.setTargetAtTime(0.02 + speed01 * 0.05, ctx.currentTime, 0.1);
}
export function engineStop() {
  if (engineNodes) { try { engineNodes.osc.stop(); } catch {} engineNodes = null; }
}
