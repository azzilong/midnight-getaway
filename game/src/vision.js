// Midnight Getaway — vision cones and line of sight (one place, one job).
// A watcher sees the thief when the thief is inside its cone AND the segment
// watcher->thief is not blocked by a wall or cover rect. Smoke blocks all sight.

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export function inCone(wx, wy, angle, range, halfAngle, tx, ty) {
  const dx = tx - wx, dy = ty - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 4) return true;
  return Math.abs(angleDiff(Math.atan2(dy, dx), angle)) <= halfAngle;
}
function segHitsRect(x0, y0, x1, y1, r) {
  // segment vs axis-aligned rect (slab test)
  const dx = x1 - x0, dy = y1 - y0;
  let tmin = 0, tmax = 1;
  if (dx === 0) { if (x0 < r.x || x0 > r.x + r.w) return false; }
  else {
    let t1 = (r.x - x0) / dx, t2 = (r.x + r.w - x0) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) { if (y0 < r.y || y0 > r.y + r.h) return false; }
  else {
    let t1 = (r.y - y0) / dy, t2 = (r.y + r.h - y0) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}
export function losBlocked(x0, y0, x1, y1, blockers) {
  for (const r of blockers) if (segHitsRect(x0, y0, x1, y1, r)) return true;
  return false;
}
export function pointInRect(x, y, r, pad = 0) {
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad;
}
export function circleHitsRect(cx, cy, rad, r) {
  const nx = Math.max(r.x, Math.min(cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(cy, r.y + r.h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < rad * rad;
}
