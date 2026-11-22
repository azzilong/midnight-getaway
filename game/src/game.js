// Midnight Getaway — game state machine (one place, one job).
// Phases: title -> vault (stealth) -> getaway (driving chase) -> win | busted.
// Owns the alarm, wanted stars, tools, score and all phase transitions.
import { W, H, VAULT, GETAWAY, SCORE } from './config.js';
import { VAULT_WALLS, VAULT_COVER, VAULT as VAULT_RECT, VAULT_EXIT, PLAYER_START, GUARD_DEFS, CAMERA_DEFS, CITY, CITY_BUILDINGS, CAR_START, SAFEHOUSE, POLICE_SPAWNS } from './level.js';
import { makeGuard, guardUpdate, guardReset } from './guards.js';
import { makeCamera, cameraUpdate, cameraReset } from './cameras.js';
import { makePolice, policeUpdate, policeReset } from './police.js';
import { makeThief, thiefUpdate, makeCar, carUpdate, carInZone } from './player.js';
import { pointInRect, losBlocked } from './vision.js';
import { sfx, engineSet, engineStop } from './audio.js';
import { keys, axis, sprinting, wasPressed, consumeClick, endFrame } from './input.js';

const BEST_KEY = 'midnight-getaway-best';

export function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch {}
}

export function makeState() {
  return {
    phase: 'title', lastPhase: 'vault',
    time: 0, tGlobal: 0,
    thief: makeThief(PLAYER_START.x, PLAYER_START.y),
    guards: GUARD_DEFS.map(makeGuard),
    cameras: CAMERA_DEFS.map(makeCamera),
    vaultCracked: false, crackT: 0, loot: 0,
    alarm: 0, alarmAtExit: 0,
    smoke: { active: false, x: 0, y: 0, r: VAULT.smokeRadius, t: 0 },
    jammer: { active: false, t: 0 },
    tools: { smoke: VAULT.smokeUses, jammer: VAULT.jammerUses },
    hint: '',
    car: makeCar(CAR_START.x, CAR_START.y, CAR_START.angle),
    police: [],
    wanted: 1,
    getawayT: GETAWAY.seconds,
    bust: 0, loseTailT: 0, tail: [], // tail: recent player car positions (pursuit lag)
    score: { loot: 0, timeBonus: 0, alarmPenalty: 0, total: 0 },
    best: loadBest(),
    bustedReason: '',
    toast: '', toastT: 0,
    muted: false,
  };
}

function showToast(s, msg, seconds = 2.5) { s.toast = msg; s.toastT = seconds; }

function resetVaultRun(s) {
  s.thief = makeThief(PLAYER_START.x, PLAYER_START.y);
  s.guards.forEach(guardReset);
  s.cameras.forEach(cameraReset);
  s.vaultCracked = false; s.crackT = 0; s.loot = 0;
  s.alarm = 0; s.alarmAtExit = 0;
  s.smoke = { active: false, x: 0, y: 0, r: VAULT.smokeRadius, t: 0 };
  s.jammer = { active: false, t: 0 };
  s.tools = { smoke: VAULT.smokeUses, jammer: VAULT.jammerUses };
  s.time = 0;
}
function startGetaway(s) {
  s.phase = 'getaway'; s.lastPhase = 'getaway';
  s.time = 0;
  s.getawayT = GETAWAY.seconds;
  s.bust = 0; s.loseTailT = 0; s.tail = [];
  s.car = makeCar(CAR_START.x, CAR_START.y, CAR_START.angle);
  const n = Math.min(s.wanted + 1, 4);
  s.police = POLICE_SPAWNS.slice(0, n).map((p) => makePolice(p.x, p.y, 0));
  sfx.sirenStart();
  showToast(s, s.wanted >= 4 ? `WANTED ★★★★★ — THE WHOLE CITY IS LOOKING` : `WANTED ${'★'.repeat(s.wanted)} — LOSE THE LAW`, 3);
}
function finishScore(s) {
  const timeBonus = Math.max(0, Math.ceil(s.getawayT)) * SCORE.timeBonusPerSec;
  const alarmPenalty = Math.round(s.alarmAtExit) * SCORE.alarmPenaltyPerPoint;
  const total = Math.max(0, s.loot + timeBonus - alarmPenalty);
  s.score = { loot: s.loot, timeBonus, alarmPenalty, total };
  if (total > s.best) { s.best = total; saveBest(total); }
}
function endRun(s, won, reason = '') {
  if (won) {
    finishScore(s);
    s.phase = 'win';
    sfx.sirenStop(); engineStop();
    sfx.win();
  } else {
    s.bustedReason = reason;
    s.phase = 'busted';
    s.lastPhase = s.lastPhase || 'vault';
    finishScore(s);
    s.score.total = 0; // busted: no payout
    sfx.sirenStop(); engineStop();
    sfx.lose();
  }
}

function vaultSolids() {
  return [...VAULT_WALLS, ...VAULT_COVER, VAULT_RECT];
}
function vaultBlockers() {
  return [...VAULT_WALLS, ...VAULT_COVER];
}

function updateVault(s, dt) {
  s.time += dt;
  const solids = vaultSolids();
  const blockers = vaultBlockers();
  const mv = axis();
  thiefUpdate(s.thief, dt, mv, sprinting(), solids);

  // tools
  if (wasPressed('KeyQ') && s.tools.smoke > 0 && !s.smoke.active) {
    s.tools.smoke -= 1;
    s.smoke = { active: true, x: s.thief.x, y: s.thief.y, r: VAULT.smokeRadius, t: VAULT.smokeSeconds };
    s.alarm = Math.min(100, s.alarm + VAULT.alarmSmokeCost);
    sfx.smoke();
    showToast(s, 'SMOKE OUT — THEY CAN’T SEE THROUGH IT (+8 ALARM)');
  }
  if (wasPressed('KeyF') && s.tools.jammer > 0 && !s.jammer.active) {
    s.tools.jammer -= 1;
    s.jammer = { active: true, t: VAULT.jammerSeconds };
    s.alarm = Math.min(100, s.alarm + VAULT.alarmJammerCost);
    sfx.jammer();
    showToast(s, 'CAMERAS JAMMED FOR 10s (+15 ALARM)');
  }
  if (s.smoke.active) {
    s.smoke.t -= dt;
    if (s.smoke.t <= 0) s.smoke.active = false;
  }
  if (s.jammer.active) {
    s.jammer.t -= dt;
    if (s.jammer.t <= 0) s.jammer.active = false;
  }

  // guards + cameras -> alarm
  let seenByGuard = false, seenByCam = false;
  for (const g of s.guards) {
    const caught = guardUpdate(g, dt, s.thief, blockers, s.smoke, s.jammer.active, (gg) => {
      sfx.spotted();
      showToast(s, `${gg.name} IS ONTO YOU — BREAK LINE OF SIGHT!`);
    });
    if (g.seen) seenByGuard = true;
    if (caught) { endRun(s, false, `CAUGHT BY ${g.name} IN THE VAULT.`); return; }
  }
  for (const c of s.cameras) {
    if (cameraUpdate(c, dt, s.thief, blockers, s.smoke, s.jammer.active)) seenByCam = true;
  }
  if (seenByGuard) {
    const d = Math.min(...s.guards.filter((g) => g.seen).map((g) => Math.hypot(s.thief.x - g.x, s.thief.y - g.y)));
    s.alarm = Math.min(100, s.alarm + (d < 90 ? VAULT.alarmGuardClosePerSec : VAULT.alarmGuardPerSec) * dt);
  } else if (seenByCam) {
    s.alarm = Math.min(100, s.alarm + VAULT.alarmCamPerSec * dt);
  } else {
    s.alarm = Math.max(0, s.alarm - VAULT.alarmDecayPerSec * dt);
  }
  if (s.alarm >= 100 && s.wanted < 5) s.wanted = 5;

  // vault crack: stand close, hold E
  const vaultCx = VAULT_RECT.x + VAULT_RECT.w / 2, vaultCy = VAULT_RECT.y + VAULT_RECT.h / 2;
  const nearVault = Math.hypot(s.thief.x - vaultCx, s.thief.y - vaultCy) < 110;
  if (!s.vaultCracked && nearVault && keys.KeyE) {
    s.crackT += dt / VAULT.crackSeconds;
    if (Math.random() < dt * 6) sfx.crackTick();
    if (s.crackT >= 1) {
      s.vaultCracked = true;
      s.loot = VAULT.lootValue;
      s.alarm = Math.min(100, s.alarm + VAULT.alarmCrackBonus);
      sfx.crackDone(); sfx.pickup();
      showToast(s, 'VAULT CRACKED — $50,000! GET TO THE GREEN EXIT!', 3);
    }
  } else if (!s.vaultCracked) {
    s.crackT = Math.max(0, s.crackT - dt * 0.5);
  }
  if (!s.vaultCracked && nearVault) s.hint = 'HOLD E — CRACK THE VAULT';
  else if (s.vaultCracked) s.hint = '';
  else s.hint = '';

  // exit -> getaway
  if (s.vaultCracked && pointInRect(s.thief.x, s.thief.y, VAULT_EXIT, 4)) {
    s.alarmAtExit = s.alarm;
    s.wanted = Math.max(1, Math.min(5, 1 + Math.floor(s.alarm / 25)));
    startGetaway(s);
  }
}

function updateGetaway(s, dt) {
  s.time += dt;
  s.getawayT -= dt;
  if (s.getawayT <= 0) { endRun(s, false, 'ROADBLOCK — YOU RAN OUT OF TIME.'); return; }
  // driving: W/S throttle, A/D steer
  const throttle = (keys.KeyW || keys.ArrowUp ? 1 : 0) + (keys.KeyS || keys.ArrowDown ? -1 : 0);
  const steer = (keys.KeyD || keys.ArrowRight ? 1 : 0) + (keys.KeyA || keys.ArrowLeft ? -1 : 0);
  carUpdate(s.car, dt, throttle, steer, CITY_BUILDINGS, CITY);
  engineSet(Math.abs(s.car.speed) / GETAWAY.carMax);

  // pursuit lag: police chase where you were 0.4 s ago
  s.tail.push({ x: s.car.x, y: s.car.y, t: s.tGlobal });
  while (s.tail.length > 2 && s.tGlobal - s.tail[0].t > 0.4) s.tail.shift();
  const lag = s.tail[0] || { x: s.car.x, y: s.car.y };
  for (const p of s.police) policeUpdate(p, dt, s.car, lag, CITY_BUILDINGS);

  // bust meter: touching a police car fills it, distance drains it
  let touching = false;
  for (const p of s.police) {
    if (Math.hypot(p.x - s.car.x, p.y - s.car.y) < 34) { touching = true; break; }
  }
  if (touching) {
    s.bust += dt / GETAWAY.bustSeconds;
    if (Math.random() < dt * 8) sfx.crash();
  } else {
    s.bust = Math.max(0, s.bust - dt * 0.5);
  }
  if (s.bust >= 1) { endRun(s, false, 'RAMMED AND BUSTED BY THE POLICE.'); return; }

  // lose the tail: no police within range for a while
  const nearest = Math.min(...s.police.map((p) => Math.hypot(p.x - s.car.x, p.y - s.car.y)));
  if (nearest > GETAWAY.loseTailDist) {
    s.loseTailT += dt;
    if (s.loseTailT >= GETAWAY.loseTailSeconds) { endRun(s, true); return; }
  } else {
    s.loseTailT = 0;
  }
  // safehouse
  if (carInZone(s.car, SAFEHOUSE)) { endRun(s, true); return; }
}

export function update(s, dt) {
  s.tGlobal += dt;
  if (s.toastT > 0) { s.toastT -= dt; if (s.toastT <= 0) s.toast = ''; }
  if (s.phase === 'title') {
    if (wasPressed('Enter') || wasPressed('Space') || consumeClick()) {
      sfx.click();
      resetVaultRun(s);
      s.phase = 'vault'; s.lastPhase = 'vault';
      s.wanted = 1;
      showToast(s, 'STAY OUT OF THE RED CONES — CRACK THE GOLD VAULT', 3);
    }
    return;
  }
  if (s.phase === 'win' || s.phase === 'busted') {
    if (wasPressed('KeyR') || wasPressed('Enter') || consumeClick()) {
      sfx.click();
      s.phase = 'title';
    }
    return;
  }
  if (wasPressed('KeyR')) {
    resetVaultRun(s);
    s.phase = 'vault'; s.lastPhase = 'vault';
    s.wanted = 1;
    engineStop(); sfx.sirenStop();
    showToast(s, 'RUN RESTARTED', 1.5);
    return;
  }
  if (s.phase === 'vault') updateVault(s, dt);
  else if (s.phase === 'getaway') updateGetaway(s, dt);
  endFrame();
}

// ---- debug / test API (window.MG): used by tools/playtest.mjs and ?shot= ----
export function debugApi(s) {
  return {
    state() {
      return {
        phase: s.phase, alarm: +s.alarm.toFixed(1), wanted: s.wanted, loot: s.loot,
        vaultCracked: s.vaultCracked, crackT: +s.crackT.toFixed(2),
        thief: { x: Math.round(s.thief.x), y: Math.round(s.thief.y) },
        guards: s.guards.map((g) => ({ id: g.id, x: Math.round(g.x), y: Math.round(g.y), suspicion: +g.suspicion.toFixed(2), state: g.state, seen: g.seen })),
        cameras: s.cameras.map((c) => ({ id: c.id, seen: c.seen })),
        car: { x: Math.round(s.car.x), y: Math.round(s.car.y), speed: Math.round(s.car.speed) },
        police: s.police.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
        getawayT: +s.getawayT.toFixed(1), bust: +s.bust.toFixed(2), loseTailT: +s.loseTailT.toFixed(1),
        tools: { ...s.tools }, score: { ...s.score }, best: s.best,
      };
    },
    start() { resetVaultRun(s); s.phase = 'vault'; s.lastPhase = 'vault'; s.wanted = 1; },
    teleport(x, y) { s.thief.x = x; s.thief.y = y; },
    setAlarm(n) { s.alarm = n; },
    crack() { s.vaultCracked = true; s.loot = VAULT.lootValue; },
    toGetaway(wanted = 2) { s.alarmAtExit = s.alarm; s.wanted = wanted; startGetaway(s); },
    teleportCar(x, y, angle = 0) { s.car.x = x; s.car.y = y; s.car.angle = angle; s.car.speed = 0; },
    placePolice(i, x, y) { if (s.police[i]) { s.police[i].x = x; s.police[i].y = y; s.police[i].speed = 0; } },
    step(dt) { update(s, dt); },
    shot(name) { applyShot(s, name); },
  };
}

function applyShot(s, name) {
  // Deterministic staged states for screenshots (real game states, no edits).
  if (name === 'cover') {
    resetVaultRun(s);
    s.phase = 'vault'; s.lastPhase = 'vault';
    s.thief.x = 430; s.thief.y = 430; s.thief.face = 0.6;
    s.alarm = 35;
    const g1 = s.guards[0];
    g1.x = 520; g1.y = 380; g1.heading = 2.6; g1.suspicion = 0.45; g1.pauseT = 2; g1.arriveHeading = 2.6;
    const g2 = s.guards[1];
    g2.x = 960; g2.y = 420; g2.heading = -1.2; g2.suspicion = 0.1;
    const g3 = s.guards[2];
    g3.x = 1040; g3.y = 260; g3.heading = 0.9;
    s.cameras[0].angle = 1.4; s.cameras[1].angle = 2.2;
    s.hint = '';
  } else if (name === 'stealth') {
    resetVaultRun(s);
    s.phase = 'vault'; s.lastPhase = 'vault';
    s.thief.x = 500; s.thief.y = 590; s.thief.face = -1.2;
    s.alarm = 12;
    const g1 = s.guards[0];
    g1.x = 480; g1.y = 380; g1.heading = 0.2; g1.suspicion = 0.2;
    s.cameras[0].angle = 0.6;
  } else if (name === 'chase') {
    resetVaultRun(s);
    s.loot = VAULT.lootValue; s.vaultCracked = true; s.alarm = 55; s.alarmAtExit = 55;
    s.phase = 'getaway'; s.lastPhase = 'getaway';
    s.wanted = 3; s.getawayT = 62;
    s.car = makeCar(560, 400, 0); s.car.speed = 260;
    s.police = [
      makePolice(480, 400, 0),
      makePolice(560, 300, Math.PI / 2),
      makePolice(660, 460, Math.PI),
    ];
    s.police.forEach((p) => { p.speed = 240; });
  } else if (name === 'win') {
    s.phase = 'win'; s.lastPhase = 'getaway';
    s.loot = VAULT.lootValue; s.alarmAtExit = 20;
    s.getawayT = 34;
    finishScore(s);
    s.car = makeCar(1090, 160, 0);
  }
}
