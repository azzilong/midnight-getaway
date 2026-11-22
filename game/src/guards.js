// Midnight Getaway — vault guards: patrol, vision, suspicion, chase.
// A guard walks its waypoints, pauses at each end, and sweeps its cone in the
// direction it faces. Seeing the thief builds suspicion; a full meter flips
// the guard into a chase. Touching the thief while chasing ends the run.
import { VAULT } from './config.js';
import { inCone, losBlocked, angleDiff } from './vision.js';

export function makeGuard(def) {
  return {
    id: def.id, name: def.name, color: def.color,
    waypoints: def.waypoints, speed: def.speed, pause: def.pause,
    x: def.waypoints[0][0], y: def.waypoints[0][1],
    target: 1, heading: 0, pauseT: 0, arriveHeading: 0, pauseElapsed: 0,
    suspicion: 0, state: 'patrol', // patrol | suspicious | chase
    chaseT: 0, seen: false,
  };
}

export function guardUpdate(g, dt, thief, blockers, smoke, jammed, onSpotted) {
  const tx = thief.x, ty = thief.y;
  const inSmoke = smoke.active && Math.hypot(tx - smoke.x, ty - smoke.y) < smoke.r;
  let sees = false;
  if (!inSmoke) {
    sees = inCone(g.x, g.y, g.heading, VAULT.guardRange, VAULT.guardHalfAngle, tx, ty)
      && !losBlocked(g.x, g.y, tx, ty, blockers);
  }
  g.seen = sees;
  const sprinting = thief.sprinting;
  if (sees) {
    const dist = Math.hypot(tx - g.x, ty - g.y);
    const rate = VAULT.suspicionPerSec * (sprinting ? VAULT.suspicionSprintMult : 1) * (dist < 90 ? 1.6 : 1);
    const was = g.suspicion;
    g.suspicion = Math.min(1, g.suspicion + rate * dt);
    if (was < 0.5 && g.suspicion >= 0.5 && onSpotted) onSpotted(g);
  } else {
    g.suspicion = Math.max(0, g.suspicion - VAULT.suspicionDecayPerSec * dt);
  }

  if (g.suspicion >= 1 && g.state !== 'chase') { g.state = 'chase'; g.chaseT = 0; }
  if (g.state === 'chase') {
    g.chaseT += dt;
    const dx = tx - g.x, dy = ty - g.y;
    const d = Math.hypot(dx, dy);
    if (d > 1) {
      g.heading = Math.atan2(dy, dx);
      const step = VAULT.guardChase * dt;
      g.x += (dx / d) * step;
      g.y += (dy / d) * step;
    }
    // give up after 6 s without seeing the thief
    if (!sees && g.chaseT > 6) { g.state = 'patrol'; g.suspicion = 0.4; }
    return Math.hypot(tx - g.x, ty - g.y) < VAULT.catchDist;
  }

  // patrol: walk waypoints, pause at each end, face movement direction.
  // While paused the guard scans: heading swings around the arrival heading.
  if (g.pauseT > 0) {
    g.pauseElapsed = (g.pauseElapsed ?? 0) + dt;
    g.heading = g.arriveHeading + Math.sin(g.pauseElapsed * 2.2) * 0.6;
    g.pauseT -= dt;
    return false;
  }
  const [wx, wy] = g.waypoints[g.target];
  const dx = wx - g.x, dy = wy - g.y;
  const d = Math.hypot(dx, dy);
  const step = g.speed * dt;
  if (d <= Math.max(step, 2)) {
    g.x = wx; g.y = wy;
    g.arriveHeading = g.heading;
    g.target = (g.target + 1) % g.waypoints.length;
    g.pauseT = g.pause;
    g.pauseElapsed = 0;
  } else {
    g.heading = Math.atan2(dy, dx);
    g.x += (dx / d) * step;
    g.y += (dy / d) * step;
  }
  return false;
}
export function guardReset(g) {
  g.x = g.waypoints[0][0]; g.y = g.waypoints[0][1];
  g.target = 1; g.pauseT = 0; g.arriveHeading = 0; g.pauseElapsed = 0;
  g.suspicion = 0; g.state = 'patrol'; g.chaseT = 0; g.seen = false;
  g.heading = 0;
}
export function guardCone(g) {
  return { x: g.x, y: g.y, angle: g.heading, range: VAULT.guardRange, half: VAULT.guardHalfAngle, color: g.color };
}
