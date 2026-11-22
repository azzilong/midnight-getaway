// Midnight Getaway — CDP playtest (Node 22+ stdlib only).
// Drives the game in ?test=1 mode: real CDP key events + MG.step(dt) advance
// the same update() the live loop runs. Prints one line per test, exits 1 on
// any failure. Usage: node tools/playtest.mjs [--url=<page>] [--port=9223]
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const baseUrl = arg('url', `file://${join(here, '..', 'game', 'index.html')}?test=1&mute=1`);
const port = Number(arg('port', '9223'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function portUp() {
  try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); return r.ok; } catch { return false; }
}
let chrome = null;
if (!(await portUp())) {
  chrome = spawn('bash', [join(here, 'chrome.sh'), String(port), `/tmp/midnight-chrome-${port}`, 'about:blank'], { stdio: 'ignore', detached: true });
  chrome.unref();
  for (let i = 0; i < 40; i++) { if (await portUp()) break; await sleep(500); }
}
const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
const events = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) events.push(m);
};
const send = (method, params = {}) => new Promise((res) => {
  const mid = ++id;
  pending.set(mid, res);
  ws.send(JSON.stringify({ id: mid, method, params }));
});
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await sleep(1500);
const evalJs = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300));
  return r.result?.result?.value;
};
const key = async (type, code, keyName, vk) => send('Input.dispatchKeyEvent', { type, code, key: keyName, windowsVirtualKeyCode: vk });
const keyTap = async (code, keyName, vk) => { await key('keyDown', code, keyName, vk); await sleep(60); await key('keyUp', code, keyName, vk); };
const keyHold = async (code, keyName, vk) => key('keyDown', code, keyName, vk);
const keyRelease = async (code, keyName, vk) => key('keyUp', code, keyName, vk);
const step = async (seconds, stepDt = 0.05) => {
  const n = Math.round(seconds / stepDt);
  for (let i = 0; i < n; i++) await evalJs(`window.MG.step(${stepDt})`);
};
const state = async () => evalJs('window.MG.state()');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const pageErrors = [];
// collect console errors / exceptions from the events seen so far
function drainErrors() {
  const found = [];
  for (const e of events.splice(0)) {
    if (e.method === 'Runtime.exceptionThrown') found.push(JSON.stringify(e.params.exceptionDetails).slice(0, 200));
    if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') found.push(e.params.entry.text.slice(0, 200));
    if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') found.push(JSON.stringify(e.params.args).slice(0, 200));
  }
  pageErrors.push(...found);
  return found;
}

try {
  // 1 — boot: game object exists, title phase, no page errors
  await sleep(500);
  const booted = await evalJs('!!window.MG && window.MG.state().phase');
  drainErrors();
  check('boot: title phase, no page errors', booted === 'title' && pageErrors.length === 0, `phase=${booted}, errors=${pageErrors.length}`);

  // 2 — start the run with Enter
  await keyTap('Enter', 'Enter', 13);
  await step(0.2);
  check('start: Enter -> vault phase', (await state()).phase === 'vault');

  // 3 — movement: hold D, thief moves right
  let s0 = await state();
  await keyHold('KeyD', 'd', 68);
  await step(1.0);
  await keyRelease('KeyD', 'd', 68);
  let s1 = await state();
  check('movement: hold D moves thief right', s1.thief.x > s0.thief.x + 80, `${s0.thief.x} -> ${s1.thief.x}`);

  // 4 — wall collision: push into the left wall, thief stays inside the room
  await evalJs('window.MG.teleport(70, 620)');
  await keyHold('KeyA', 'a', 65);
  await step(1.0);
  await keyRelease('KeyA', 'a', 65);
  s1 = await state();
  check('walls: thief cannot leave the room', s1.thief.x >= 60 && s1.thief.x <= 80, `x=${s1.thief.x}`);

  // 5 — guard vision: stand in front of Marco, suspicion + alarm rise
  await evalJs('window.MG.start()');
  await evalJs('window.MG.teleport(520, 330)');
  await step(2.0);
  s1 = await state();
  const g1 = s1.guards.find((g) => g.id === 'marco');
  check('guard vision: suspicion + alarm rise in cone', g1.suspicion > 0.4 && s1.alarm > 5, `suspicion=${g1.suspicion}, alarm=${s1.alarm}`);

  // 6 — smoke blocks vision: suspicion stops rising inside smoke
  await evalJs('window.MG.start()');
  await evalJs('window.MG.teleport(520, 330)');
  await keyTap('KeyQ', 'q', 81);
  await step(0.3);
  const before = (await state()).guards.find((g) => g.id === 'marco').suspicion;
  await step(2.0);
  const after = (await state()).guards.find((g) => g.id === 'marco').suspicion;
  check('smoke: blocks guard vision', after <= before + 0.05, `suspicion ${before} -> ${after}`);

  // 7 — jammer disables cameras: stand in a camera cone, alarm does not rise from it
  await evalJs('window.MG.start()');
  await evalJs('window.MG.teleport(300, 200)');
  await keyTap('KeyF', 'f', 70);
  await step(0.5);
  const a0 = (await state()).alarm;
  await step(2.0);
  const a1 = (await state()).alarm;
  check('jammer: cameras off, no camera alarm', a1 <= a0 + 2, `alarm ${a0} -> ${a1}`);

  // 8 — crack the vault: hold E near the safe
  await evalJs('window.MG.start()');
  await evalJs('window.MG.teleport(1130, 230)');
  await keyHold('KeyE', 'e', 69);
  await step(3.2);
  await keyRelease('KeyE', 'e', 69);
  s1 = await state();
  check('vault crack: hold E -> loot $50,000', s1.vaultCracked && s1.loot === 50000, `cracked=${s1.vaultCracked}, loot=${s1.loot}`);

  // 9 — exit to getaway with wanted stars
  await evalJs('window.MG.teleport(1160, 645)');
  await step(0.5);
  s1 = await state();
  check('exit: vault -> getaway phase, wanted set', s1.phase === 'getaway' && s1.wanted >= 1, `phase=${s1.phase}, wanted=${s1.wanted}`);

  // 10 — driving: hold W, car accelerates and moves
  s0 = await state();
  await keyHold('KeyW', 'w', 87);
  await step(2.0);
  await keyRelease('KeyW', 'w', 87);
  s1 = await state();
  check('driving: hold W accelerates the car', s1.car.speed > 100 && Math.hypot(s1.car.x - s0.car.x, s1.car.y - s0.car.y) > 150, `speed=${s1.car.speed}`);

  // 11 — safehouse win: drive into the green zone
  await evalJs('window.MG.teleportCar(1000, 200, 0)');
  await keyHold('KeyW', 'w', 87);
  await step(1.2);
  await keyRelease('KeyW', 'w', 87);
  await step(0.3);
  s1 = await state();
  check('safehouse: reaching it wins the run', s1.phase === 'win' && s1.score.total > 0, `phase=${s1.phase}, score=${s1.score.total}`);

  // 12 — lose-the-tail win: police far away for 5 s
  await evalJs('window.MG.start()');
  await evalJs('window.MG.crack(); window.MG.toGetaway(1)');
  await evalJs('window.MG.teleportCar(200, 640, -1.5708); window.MG.placePolice(0, 920, 190); window.MG.placePolice(1, 920, 400)');
  await step(6.0);
  s1 = await state();
  check('lose the tail: 5 s clear wins', s1.phase === 'win', `phase=${s1.phase}, loseTailT=${s1.loseTailT}`);

  // 13 — busted by a guard: stand ON Marco's patrol line until caught.
  // (520,330) is a blind pocket behind his pause-scan; (400,380) is dead ahead.
  await evalJs('window.MG.start()');
  await evalJs('window.MG.teleport(400, 380)');
  await step(8.0);
  s1 = await state();
  check('caught: guard touch busts the run', s1.phase === 'busted', `phase=${s1.phase}`);

  // 14 — restart from the end screen
  await keyTap('KeyR', 'r', 82);
  await step(0.3);
  check('restart: R from end screen -> title', (await state()).phase === 'title');

  drainErrors();
  check('no page errors during the whole run', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  console.log('FAIL  harness error — ' + e.message.slice(0, 300));
  results.push({ name: 'harness', ok: false });
}
ws.close();
if (chrome) { try { process.kill(-chrome.pid, 'SIGTERM'); } catch {} }
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exit(failed ? 1 : 0);
