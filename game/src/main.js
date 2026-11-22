// Midnight Getaway — bootstrap and frame loop (one place, one job).
// Fixed 1280x720 canvas, scaled to the window. URL params for testing and
// screenshots: ?stage=title|vault|getaway|win|busted  ?shot=cover|stealth|chase|win
// ?mute=1 silences the synth. Debug API: window.MG (see game.js).
import { W, H } from './config.js';
import { makeState, update, debugApi } from './game.js';
import { render } from './render.js';
import { inputInit, wasPressed } from './input.js';
import { audioInit, audioResume, audioToggleMute, audioMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;
inputInit(canvas);

const state = makeState();
const mg = debugApi(state);
window.MG = mg;

const params = new URLSearchParams(location.search);
if (params.get('mute') === '1') { audioInit(); audioToggleMute(); state.muted = true; }
if (params.get('stage')) {
  const stage = params.get('stage');
  if (stage === 'vault') mg.start();
  else if (stage === 'getaway') { mg.start(); mg.crack(); mg.toGetaway(3); }
  else if (stage === 'win' || stage === 'busted') mg.shot(stage);
}
if (params.get('shot')) mg.shot(params.get('shot'));

let last = performance.now();
let firstGesture = false;
function armAudio() {
  if (firstGesture) return;
  firstGesture = true;
  audioInit();
  audioResume();
}
window.addEventListener('keydown', armAudio);
window.addEventListener('mousedown', armAudio);

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (wasPressed('KeyM')) { audioInit(); state.muted = audioToggleMute(); }
  update(state, dt);
  render(ctx, state, state.tGlobal);
  document.getElementById('status').textContent =
    `Midnight Getaway — ${state.phase}. Loot $${state.loot}. Alarm ${Math.round(state.alarm)}%. Wanted ${state.wanted} stars.`;
  requestAnimationFrame(frame);
}
// ?test=1 pauses the live loop: the playtest drives the sim with MG.step()
// so key events + simulation advance are deterministic.
if (params.get('test') === '1') {
  render(ctx, state, 0);
} else {
  requestAnimationFrame(frame);
}
