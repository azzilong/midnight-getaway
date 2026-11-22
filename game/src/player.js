// Midnight Getaway — the player: thief on foot, then getaway driver.
// On foot: WASD/arrows move, Shift sprints (louder — guards notice faster),
// E interacts (crack the vault), Q smoke, F jammer. In the car: W/S throttle
// and brake/reverse, A/D steer (steering only bites while moving).
import { VAULT, GETAWAY } from './config.js';
import { circleHitsRect, pointInRect } from './vision.js';
import { moveCar } from './police.js';

export function makeThief(x, y) {
  return { x, y, r: 13, sprinting: false, moving: false, face: -Math.PI / 2 };
}
export function thiefUpdate(t, dt, mv, sprint, solids) {
  const speed = sprint ? VAULT.playerSprint : VAULT.playerWalk;
  t.sprinting = sprint && (mv.x !== 0 || mv.y !== 0);
  t.moving = mv.x !== 0 || mv.y !== 0;
  if (t.moving) t.face = Math.atan2(mv.y, mv.x);
  const nx = t.x + mv.x * speed * dt;
  const ny = t.y + mv.y * speed * dt;
  if (!solids.some((r) => circleHitsRect(nx, t.y, t.r, r))) t.x = nx;
  if (!solids.some((r) => circleHitsRect(t.x, ny, t.r, r))) t.y = ny;
}

export function makeCar(x, y, angle) {
  return { x, y, angle, speed: 0, w: 34, h: 18 };
}
export function carUpdate(car, dt, throttle, steer, buildings, bounds) {
  // throttle: +1 forward, -1 brake/reverse; steer: -1 left, +1 right
  if (throttle > 0) car.speed += GETAWAY.carAccel * dt;
  else if (throttle < 0) car.speed -= (car.speed > 5 ? GETAWAY.carBrake : GETAWAY.carAccel * 0.55) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt);
  car.speed = Math.max(-GETAWAY.carReverseMax, Math.min(GETAWAY.carMax, car.speed));
  const spd = Math.abs(car.speed);
  const turnRate = GETAWAY.carTurn * Math.min(1, spd / 120) * (car.speed >= 0 ? 1 : -1);
  car.angle += steer * turnRate * dt;
  const before = { x: car.x, y: car.y };
  moveCar(car, dt, buildings);
  // keep inside the city bounds
  car.x = Math.max(bounds.x + 16, Math.min(bounds.x + bounds.w - 16, car.x));
  car.y = Math.max(bounds.y + 16, Math.min(bounds.y + bounds.h - 16, car.y));
  if ((car.x === before.x && car.y === before.y) && spd > 40) car.speed *= 0.6;
  return car;
}
export function carInZone(car, zone) { return pointInRect(car.x, car.y, zone); }
