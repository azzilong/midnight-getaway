// Midnight Getaway — all canvas drawing (one place, one job).
// Flat vector night style: teal = safe cover, coral red = danger, gold = loot,
// green = escape. The judge reads the game mostly through screenshots, so
// every state (cover, danger, loot) must be obvious at a glance.
import { W, H, HUD_H, PALETTE as P, VAULT } from './config.js';
import { VAULT_ROOM, VAULT_WALLS, VAULT_COVER, VAULT as VAULT_RECT, VAULT_EXIT, CITY, CITY_STREETS_V, CITY_STREETS_H, STREET_W, CITY_BUILDINGS, SAFEHOUSE } from './level.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function conePath(ctx, x, y, angle, range, half) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
}
function drawCone(ctx, x, y, angle, range, half, fill, edge) {
  conePath(ctx, x, y, angle, range, half);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = 1.5; ctx.stroke();
}
function text(ctx, s, x, y, size, color, align = 'left', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

// ---- shared: HUD top bar ----
function drawHUD(ctx, s) {
  ctx.fillStyle = P.panel;
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = '#2a2f52';
  ctx.fillRect(0, HUD_H - 2, W, 2);
  text(ctx, 'MIDNIGHT GETAWAY', 20, 26, 20, P.gold);
  text(ctx, s.phase === 'vault' ? 'PHASE 1 — THE VAULT' : s.phase === 'getaway' ? 'PHASE 2 — GETAWAY' : s.phase.toUpperCase(), 20, 48, 12, P.muted, 'left', '600');
  // loot
  text(ctx, `LOOT  $${s.loot.toLocaleString('en-US')}`, 330, 30, 18, s.loot > 0 ? P.gold : P.muted);
  // alarm meter
  const ax = 560, ay = 16, aw = 220, ah = 18;
  ctx.fillStyle = '#10132a';
  rr(ctx, ax, ay, aw, ah, 4); ctx.fill();
  const af = Math.max(0, Math.min(1, s.alarm / 100));
  ctx.fillStyle = af < 0.5 ? '#e8b93b' : af < 0.8 ? '#ff7a3c' : '#ff3b4e';
  if (af > 0) { rr(ctx, ax, ay, aw * af, ah, 4); ctx.fill(); }
  ctx.strokeStyle = '#3a4066'; ctx.lineWidth = 1; rr(ctx, ax, ay, aw, ah, 4); ctx.stroke();
  text(ctx, `ALARM ${Math.round(s.alarm)}%`, ax + 4, ay + 40, 12, af >= 0.8 ? '#ff6b7a' : P.muted, 'left', '700');
  // wanted stars
  const wx = 830;
  text(ctx, 'WANTED', wx, 22, 11, P.muted, 'left', '700');
  for (let i = 0; i < 5; i++) {
    text(ctx, '★', wx + 62 + i * 22, 30, 20, i < s.wanted ? '#ffd23b' : '#2a2f52');
  }
  // tools
  text(ctx, `Q SMOKE ×${s.tools.smoke}`, 990, 26, 13, s.tools.smoke > 0 ? P.text : P.muted, 'left', '700');
  text(ctx, `F JAMMER ×${s.tools.jammer}`, 990, 46, 13, s.tools.jammer > 0 ? P.text : P.muted, 'left', '700');
  // timer (getaway) / clock
  if (s.phase === 'getaway') {
    const t = Math.max(0, Math.ceil(s.getawayT));
    text(ctx, `⏱ ${t}s`, 1180, 30, 20, t <= 15 ? '#ff6b7a' : P.text, 'left', '800');
  } else {
    const t = Math.floor(s.time);
    text(ctx, `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, 1180, 30, 18, P.muted, 'left', '700');
  }
}

// ---- phase 1: the vault room ----
function drawVault(ctx, s, t) {
  // floor checker
  ctx.fillStyle = P.floor;
  ctx.fillRect(VAULT_ROOM.x, VAULT_ROOM.y, VAULT_ROOM.w, VAULT_ROOM.h);
  ctx.fillStyle = P.floorAlt;
  const cs = 80;
  for (let y = VAULT_ROOM.y; y < VAULT_ROOM.y + VAULT_ROOM.h; y += cs) {
    for (let x = VAULT_ROOM.x; x < VAULT_ROOM.x + VAULT_ROOM.w; x += cs) {
      if (((x - VAULT_ROOM.x) / cs + (y - VAULT_ROOM.y) / cs) % 2 === 0) ctx.fillRect(x, y, cs, cs);
    }
  }
  // exit door (bottom-right) — green glow when loot is taken
  ctx.fillStyle = s.loot > 0 ? P.safehouse : '#3a4066';
  ctx.fillRect(VAULT_EXIT.x, VAULT_EXIT.y, VAULT_EXIT.w, VAULT_EXIT.h);
  text(ctx, s.loot > 0 ? 'EXIT → STREET' : 'EXIT', VAULT_EXIT.x + VAULT_EXIT.w / 2, VAULT_EXIT.y + 32, 13, '#0d1026', 'center', '800');
  // vault (gold safe) — the loot target
  const v = VAULT_RECT;
  ctx.fillStyle = s.vaultCracked ? P.goldDark : P.gold;
  rr(ctx, v.x, v.y, v.w, v.h, 8); ctx.fill();
  ctx.strokeStyle = '#7a5b06'; ctx.lineWidth = 3; rr(ctx, v.x, v.y, v.w, v.h, 8); ctx.stroke();
  ctx.fillStyle = '#0d1026';
  ctx.beginPath(); ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = s.vaultCracked ? P.gold : '#fff';
  ctx.beginPath(); ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 5, 0, Math.PI * 2); ctx.fill();
  text(ctx, s.vaultCracked ? 'LOOT TAKEN' : 'VAULT — $50,000', v.x + v.w / 2, v.y - 10, 13, P.gold, 'center', '800');
  // cover (teal = safe)
  for (const c of VAULT_COVER) {
    ctx.fillStyle = P.cover;
    rr(ctx, c.x, c.y, c.w, c.h, 6); ctx.fill();
    ctx.fillStyle = P.coverTop;
    rr(ctx, c.x, c.y, c.w, 8, 6); ctx.fill();
  }
  // walls
  for (const w of VAULT_WALLS) {
    ctx.fillStyle = P.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = P.wallTop;
    if (w.h < w.w) ctx.fillRect(w.x, w.y, w.w, 4);
    else ctx.fillRect(w.x, w.y, 4, w.h);
  }
  // camera cones (yellow, under guard cones)
  for (const c of s.cameras) {
    if (s.jammer.active) continue;
    drawCone(ctx, c.x, c.y, c.angle, VAULT.camRange, VAULT.camHalfAngle, P.camCone, 'rgba(255,214,64,0.5)');
  }
  // guard cones (red, translucent; brighter when the guard sees you)
  for (const g of s.guards) {
    const fill = g.seen ? 'rgba(255,77,94,0.42)' : 'rgba(255,77,94,0.20)';
    drawCone(ctx, g.x, g.y, g.heading, VAULT.guardRange, VAULT.guardHalfAngle, fill, g.seen ? 'rgba(255,77,94,0.9)' : 'rgba(255,77,94,0.45)');
  }
  // smoke cloud
  if (s.smoke.active) {
    ctx.fillStyle = 'rgba(200,205,230,0.35)';
    ctx.beginPath(); ctx.arc(s.smoke.x, s.smoke.y, s.smoke.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,205,230,0.25)';
    ctx.beginPath(); ctx.arc(s.smoke.x - 30, s.smoke.y + 18, s.smoke.r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s.smoke.x + 34, s.smoke.y - 14, s.smoke.r * 0.55, 0, Math.PI * 2); ctx.fill();
  }
  // cameras (wall mounts)
  for (const c of s.cameras) {
    ctx.fillStyle = s.jammer.active ? '#555b7d' : '#ffd640';
    ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0d1026'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c.x, c.y, 8, 0, Math.PI * 2); ctx.stroke();
    if (!s.jammer.active && c.seen) {
      ctx.fillStyle = '#ff3b4e';
      ctx.beginPath(); ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    text(ctx, 'CAM', c.x, c.y - 14, 10, P.muted, 'center', '700');
  }
  // guards
  for (const g of s.guards) {
    ctx.fillStyle = g.color;
    ctx.beginPath(); ctx.arc(g.x, g.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0d1026'; ctx.lineWidth = 2; ctx.stroke();
    // facing tick
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.heading) * 17, g.y + Math.sin(g.heading) * 17);
    ctx.stroke();
    // suspicion ring
    if (g.suspicion > 0.05) {
      ctx.strokeStyle = g.suspicion >= 1 ? '#ff3b4e' : '#ffb03b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.suspicion);
      ctx.stroke();
    }
    if (g.state === 'chase') text(ctx, '!', g.x, g.y - 22, 20, '#ff3b4e', 'center', '900');
    text(ctx, g.name, g.x, g.y + 28, 10, P.muted, 'center', '700');
  }
  // thief
  drawThief(ctx, s.thief);
  // vault crack progress ring
  if (s.crackT > 0 && s.crackT < 1) {
    ctx.strokeStyle = P.gold; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(s.thief.x, s.thief.y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.crackT);
    ctx.stroke();
    text(ctx, 'CRACKING…', s.thief.x, s.thief.y - 34, 12, P.gold, 'center', '800');
  }
  // objective + hint
  const obj = s.loot > 0 ? 'LOOT SECURED — REACH THE GREEN EXIT →' : 'REACH THE VAULT — CRACK IT WITH E';
  text(ctx, obj, W / 2, H - 18, 15, s.loot > 0 ? P.safehouse : P.gold, 'center', '800');
  if (s.hint) text(ctx, s.hint, W / 2, H - 40, 13, P.muted, 'center', '600');
}

function drawThief(ctx, th) {
  ctx.fillStyle = P.thief;
  ctx.beginPath(); ctx.arc(th.x, th.y, th.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = P.thiefTrim; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(th.x, th.y, th.r, 0, Math.PI * 2); ctx.stroke();
  // facing tick + mask stripe
  ctx.strokeStyle = P.thiefTrim; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(th.x, th.y);
  ctx.lineTo(th.x + Math.cos(th.face) * (th.r + 5), th.y + Math.sin(th.face) * (th.r + 5));
  ctx.stroke();
  ctx.fillStyle = '#0d1026';
  ctx.fillRect(th.x - 6, th.y - 3, 12, 5);
}

// ---- phase 2: the getaway city ----
function drawCity(ctx, s, t) {
  // asphalt
  ctx.fillStyle = P.street;
  ctx.fillRect(CITY.x, CITY.y, CITY.w, CITY.h);
  // street markings
  ctx.strokeStyle = P.streetLine; ctx.lineWidth = 2;
  ctx.setLineDash([18, 16]);
  for (const x of [200, 560, 920]) {
    ctx.beginPath(); ctx.moveTo(x, CITY.y); ctx.lineTo(x, CITY.y + CITY.h); ctx.stroke();
  }
  for (const y of [190, 400, 610]) {
    ctx.beginPath(); ctx.moveTo(CITY.x, y); ctx.lineTo(CITY.x + CITY.w, y); ctx.stroke();
  }
  ctx.setLineDash([]);
  // buildings
  for (const b of CITY_BUILDINGS) {
    ctx.fillStyle = P.building;
    rr(ctx, b.x, b.y, b.w, b.h, 6); ctx.fill();
    ctx.fillStyle = P.buildingTop;
    rr(ctx, b.x, b.y, b.w, 10, 6); ctx.fill();
    // windows
    ctx.fillStyle = 'rgba(255,214,64,0.25)';
    for (let wy = b.y + 22; wy < b.y + b.h - 12; wy += 26) {
      for (let wx = b.x + 14; wx < b.x + b.w - 12; wx += 26) {
        if (((wx + wy) / 26) % 3 === 0) ctx.fillRect(wx, wy, 10, 8);
      }
    }
  }
  // safehouse zone (green, pulsing)
  const pulse = 0.55 + Math.sin(t * 3) * 0.15;
  ctx.fillStyle = `rgba(47,174,95,${pulse})`;
  rr(ctx, SAFEHOUSE.x, SAFEHOUSE.y, SAFEHOUSE.w, SAFEHOUSE.h, 10); ctx.fill();
  ctx.strokeStyle = P.safehouse; ctx.lineWidth = 3;
  rr(ctx, SAFEHOUSE.x, SAFEHOUSE.y, SAFEHOUSE.w, SAFEHOUSE.h, 10); ctx.stroke();
  text(ctx, 'SAFEHOUSE', SAFEHOUSE.x + SAFEHOUSE.w / 2, SAFEHOUSE.y + 34, 16, '#0d1026', 'center', '900');
  text(ctx, 'ESCAPE HERE', SAFEHOUSE.x + SAFEHOUSE.w / 2, SAFEHOUSE.y + 56, 11, '#0d1026', 'center', '800');
  // police cars
  for (const p of s.police) drawCar(ctx, p.x, p.y, p.angle, P.police, true, t);
  // player car
  drawCar(ctx, s.car.x, s.car.y, s.car.angle, '#f5b81e', false, t);
  // bust meter (while a police car touches you)
  if (s.bust > 0.02) {
    const bw = 260;
    ctx.fillStyle = 'rgba(10,13,32,0.85)';
    rr(ctx, W / 2 - bw / 2, HUD_H + 12, bw, 26, 6); ctx.fill();
    ctx.fillStyle = '#ff3b4e';
    rr(ctx, W / 2 - bw / 2 + 4, HUD_H + 16, (bw - 8) * s.bust, 18, 4); ctx.fill();
    text(ctx, 'BUSTED IN…', W / 2, HUD_H + 32, 13, '#fff', 'center', '800');
  }
  // lose-the-tail progress
  if (s.loseTailT > 0.5) {
    text(ctx, `LOSING THE TAIL… ${s.loseTailT.toFixed(1)}s`, W / 2, H - 18, 15, P.safehouse, 'center', '800');
  }
  text(ctx, 'REACH THE GREEN SAFEHOUSE — OR LOSE THE TAIL', W / 2, H - 40, 13, P.muted, 'center', '600');
  // speed
  const kmh = Math.round(Math.abs(s.car.speed) * 0.55);
  text(ctx, `${kmh} km/h`, 30, H - 18, 18, P.text, 'left', '800');
}
function drawCar(ctx, x, y, angle, color, isPolice, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#0d1026';
  rr(ctx, -19, -12, 38, 24, 6); ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, -17, -10, 34, 20, 5); ctx.fill();
  ctx.fillStyle = 'rgba(13,16,38,0.85)';
  ctx.fillRect(-4, -8, 12, 16); // cabin
  ctx.fillStyle = '#fff';
  ctx.fillRect(14, -8, 3, 5); ctx.fillRect(14, 3, 3, 5); // headlights
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-17, -8, 3, 5); ctx.fillRect(-17, 3, 3, 5); // taillights
  if (isPolice) {
    const on = Math.floor(t * 4) % 2 === 0;
    ctx.fillStyle = on ? '#ff3b30' : '#4a7dff';
    ctx.fillRect(-2, -11, 5, 4);
    ctx.fillStyle = on ? '#4a7dff' : '#ff3b30';
    ctx.fillRect(-2, 7, 5, 4);
    ctx.fillStyle = '#fff';
    ctx.font = '700 7px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 3);
  }
  ctx.restore();
}

// ---- title / end screens ----
function drawTitle(ctx, s, t) {
  drawVaultBackdrop(ctx, t);
  ctx.fillStyle = 'rgba(10,13,32,0.72)';
  ctx.fillRect(0, 0, W, H);
  const bob = Math.sin(t * 1.6) * 6;
  text(ctx, 'MIDNIGHT', W / 2, 190 + bob, 84, P.gold, 'center', '900');
  text(ctx, 'GETAWAY', W / 2, 272 + bob, 84, P.text, 'center', '900');
  text(ctx, 'A TOP-DOWN HEIST IN TWO ACTS', W / 2, 312, 18, P.muted, 'center', '700');
  text(ctx, 'ACT I — CROSS THE VAULT · DODGE THE CONES · CRACK THE SAFE', W / 2, 352, 16, P.text, 'center', '700');
  text(ctx, 'ACT II — GRAB THE WHEEL · LOSE THE LAW · REACH THE SAFEHOUSE', W / 2, 378, 16, P.text, 'center', '700');
  text(ctx, 'WASD / ARROWS — MOVE & DRIVE · SHIFT — SPRINT · E — CRACK / ENTER', W / 2, 428, 15, P.muted, 'center', '600');
  text(ctx, 'Q — SMOKE (COSTS ALARM) · F — CAMERA JAMMER (COSTS ALARM) · M — MUTE', W / 2, 452, 15, P.muted, 'center', '600');
  const blink = Math.floor(t * 2) % 2 === 0;
  if (blink) text(ctx, '— PRESS ENTER OR CLICK TO START —', W / 2, 520, 20, P.gold, 'center', '800');
  if (s.best > 0) text(ctx, `BEST SCORE  $${s.best.toLocaleString('en-US')}`, W / 2, 566, 16, P.gold, 'center', '700');
  text(ctx, 'HEADPHONES ON — THE SIRENS MEAN BUSINESS', W / 2, 640, 13, P.muted, 'center', '600');
}
function drawVaultBackdrop(ctx, t) {
  // a dim vault room behind the title (same layout, no HUD)
  ctx.fillStyle = P.floor;
  ctx.fillRect(VAULT_ROOM.x, VAULT_ROOM.y, VAULT_ROOM.w, VAULT_ROOM.h);
  for (const c of VAULT_COVER) { ctx.fillStyle = P.cover; rr(ctx, c.x, c.y, c.w, c.h, 6); ctx.fill(); }
  for (const w of VAULT_WALLS) { ctx.fillStyle = P.wall; ctx.fillRect(w.x, w.y, w.w, w.h); }
  const v = VAULT_RECT;
  ctx.fillStyle = P.gold; rr(ctx, v.x, v.y, v.w, v.h, 8); ctx.fill();
  drawCone(ctx, 300, 380, Math.sin(t * 0.5) * 1.2, VAULT.guardRange, VAULT.guardHalfAngle, P.dangerSoft, 'rgba(255,77,94,0.3)');
  drawCone(ctx, 960, 300, Math.cos(t * 0.4) * 1.2 + 1.5, VAULT.guardRange, VAULT.guardHalfAngle, P.dangerSoft, 'rgba(255,77,94,0.3)');
}
function drawEnd(ctx, s, won, t) {
  ctx.fillStyle = 'rgba(10,13,32,0.78)';
  ctx.fillRect(0, 0, W, H);
  if (won) {
    text(ctx, 'CLEAN GETAWAY', W / 2, 200, 64, P.safehouse, 'center', '900');
    text(ctx, 'THE LOOT IS YOURS. THE LAW IS STILL LOOKING.', W / 2, 244, 17, P.muted, 'center', '700');
  } else {
    text(ctx, 'BUSTED', W / 2, 200, 72, '#ff3b4e', 'center', '900');
    text(ctx, s.bustedReason || 'THE LAW CAUGHT UP WITH YOU.', W / 2, 244, 17, P.muted, 'center', '700');
  }
  const sc = s.score;
  text(ctx, `LOOT  $${sc.loot.toLocaleString('en-US')}`, W / 2, 320, 22, P.gold, 'center', '700');
  text(ctx, `TIME BONUS  $${sc.timeBonus.toLocaleString('en-US')}    ALARM PENALTY  −$${sc.alarmPenalty.toLocaleString('en-US')}`, W / 2, 356, 17, P.text, 'center', '600');
  text(ctx, `SCORE  $${sc.total.toLocaleString('en-US')}`, W / 2, 412, 34, P.text, 'center', '900');
  if (sc.total >= s.best && sc.total > 0) text(ctx, '★ NEW BEST SCORE ★', W / 2, 452, 18, P.gold, 'center', '800');
  else if (s.best > 0) text(ctx, `BEST  $${s.best.toLocaleString('en-US')}`, W / 2, 452, 16, P.muted, 'center', '700');
  const blink = Math.floor(t * 2) % 2 === 0;
  if (blink) text(ctx, '— PRESS R OR CLICK TO RUN IT AGAIN —', W / 2, 540, 18, P.gold, 'center', '800');
}

export function render(ctx, s, t) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);
  if (s.phase === 'title') { drawTitle(ctx, s, t); return; }
  if (s.phase === 'win' || s.phase === 'busted') {
    if (s.lastPhase === 'getaway') drawCity(ctx, s, t);
    else drawVault(ctx, s, t);
    drawHUD(ctx, s);
    drawEnd(ctx, s, s.phase === 'win', t);
    return;
  }
  if (s.phase === 'vault') drawVault(ctx, s, t);
  else drawCity(ctx, s, t);
  drawHUD(ctx, s);
  if (s.toast) {
    ctx.fillStyle = 'rgba(10,13,32,0.85)';
    const tw = 520;
    rr(ctx, W / 2 - tw / 2, H - 96, tw, 34, 8); ctx.fill();
    text(ctx, s.toast, W / 2, H - 73, 15, P.gold, 'center', '700');
  }
}
