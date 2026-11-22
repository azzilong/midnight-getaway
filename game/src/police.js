// Midnight Getaway — police pursuit cars (getaway phase).
// A police car steers toward where the player was a moment ago (pursuit lag),
// so a sharp turn buys distance. Touching the player's car fills the bust
// meter; a full meter ends the run. They are a touch slower than the player
// at top speed, so a clean line outruns them.
import { GETAWAY } from './config.js';
import { angleDiff, circleHitsRect } from './vision.js';

export function makePolice(x, y, angle = 0) {
  return { x, y, angle, speed: 0, bustTouch: 0 };
}

export function policeUpdate(p, dt, target, lagTarget, buildings) {
  const dx = lagTarget.x - p.x, dy = lagTarget.y - p.y;
  const dist = Math.hypot(dx, dy);
  const want = Math.atan2(dy, dx);
  const diff = angleDiff(want, p.angle);
  const turn = Math.max(-GETAWAY.policeTurn, Math.min(GETAWAY.policeTurn, diff * 3));
  p.angle += turn * dt;
  const accel = dist > 60 ? GETAWAY.policeMax : GETAWAY.policeMax * 0.55;
  p.speed += (accel - p.speed) * Math.min(1, 1.6 * dt);
  moveCar(p, dt, buildings);
  void target;
}
export function moveCar(c, dt, buildings) {
  // shared car mover: forward along heading, slide on building collision
  const nx = c.x + Math.cos(c.angle) * c.speed * dt;
  const ny = c.y + Math.sin(c.angle) * c.speed * dt;
  const r = 15;
  if (!buildings.some((b) => circleHitsRect(nx, c.y, r, b))) c.x = nx;
  else c.speed *= 0.55;
  if (!buildings.some((b) => circleHitsRect(c.x, ny, r, b))) c.y = ny;
  else c.speed *= 0.55;
}
export function policeReset(p, x, y) { p.x = x; p.y = y; p.angle = 0; p.speed = 0; p.bustTouch = 0; }
