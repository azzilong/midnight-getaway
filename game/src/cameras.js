// Midnight Getaway — wall security cameras: sweeping vision cones.
// A camera sits on a wall and sweeps its cone back and forth. Being caught in
// a live camera's cone raises the alarm (slower than a guard, but it never
// blinks unless jammed). A jammer turns all cameras off for a while.
import { VAULT } from './config.js';
import { inCone, losBlocked } from './vision.js';

export function makeCamera(def) {
  return {
    id: def.id, x: def.x, y: def.y,
    baseAngle: def.baseAngle, sweep: def.sweep, speed: def.speed,
    t: Math.random() * 10, angle: def.baseAngle, seen: false,
  };
}

export function cameraUpdate(c, dt, thief, blockers, smoke, jammed) {
  c.t += dt;
  c.angle = c.baseAngle + Math.sin(c.t * c.speed) * c.sweep;
  if (jammed) { c.seen = false; return false; }
  const inSmoke = smoke.active && Math.hypot(thief.x - smoke.x, thief.y - smoke.y) < smoke.r;
  if (inSmoke) { c.seen = false; return false; }
  c.seen = inCone(c.x, c.y, c.angle, VAULT.camRange, VAULT.camHalfAngle, thief.x, thief.y)
    && !losBlocked(c.x, c.y, thief.x, thief.y, blockers);
  return c.seen;
}
export function cameraReset(c) { c.t = 0; c.seen = false; c.angle = c.baseAngle; }
