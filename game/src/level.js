// Midnight Getaway — level data: the vault room and the getaway city.
// Plain data + layout constants. Nothing here moves; the entities live in
// guards.js / cameras.js / police.js / player.js.
import { W, H, HUD_H } from './config.js';

// ---- Phase 1: the vault room (top-down, whole canvas under the HUD) ----
export const VAULT_ROOM = {
  x: 40, y: HUD_H + 26, w: W - 80, h: H - HUD_H - 56, // outer walls
};
// Walls are solid rects (the room border is 4 of them + interior dividers).
export const VAULT_WALLS = [
  { x: 40, y: 90, w: 1200, h: 14 },    // top
  { x: 40, y: 90, w: 14, h: 596 },     // left
  { x: 1226, y: 90, w: 14, h: 596 },   // right
  { x: 40, y: 672, w: 1060, h: 14 },   // bottom (gap at exit, bottom-right)
  // interior dividers — they make three routes: left lane, centre hall, right lane
  { x: 420, y: 90, w: 14, h: 220 },    // top divider, left side
  { x: 420, y: 470, w: 14, h: 216 },   // bottom divider, left side (gap 310..470)
  { x: 830, y: 90, w: 14, h: 180 },    // top divider, right side
  { x: 830, y: 430, w: 14, h: 256 },   // bottom divider, right side (gap 270..430)
];
// Cover blocks line of sight (desks, crates, planters) — teal = safe.
export const VAULT_COVER = [
  { x: 180, y: 220, w: 110, h: 46 },   // desk row, left lane
  { x: 180, y: 470, w: 110, h: 46 },   // crates, left lane
  { x: 480, y: 150, w: 120, h: 40 },   // desk, centre-top
  { x: 560, y: 330, w: 46, h: 110 },   // pillar, centre
  { x: 480, y: 540, w: 120, h: 40 },   // desk, centre-bottom
  { x: 1060, y: 220, w: 110, h: 46 },  // crates, right lane (clear of G2's lane x 960)
  { x: 1060, y: 470, w: 110, h: 46 },  // planter, right lane (clear of G2's lane x 960)
  { x: 1060, y: 330, w: 46, h: 110 },  // pillar, vault approach
];
export const VAULT = { x: 1130, y: 150, w: 76, h: 54 }; // the loot target (gold safe)
export const VAULT_EXIT = { x: 1100, y: 620, w: 126, h: 52 }; // street door, bottom-right
export const PLAYER_START = { x: 110, y: 620 };

export const GUARD_DEFS = [
  { id: 'marco', name: 'MARCO', color: '#ff6b4a', waypoints: [[300, 380], [520, 380]], speed: 70, pause: 1.2 },
  { id: 'rosa', name: 'ROSA', color: '#ff8c42', waypoints: [[960, 300], [960, 560]], speed: 62, pause: 1.0 },
  { id: 'vince', name: 'VINCE', color: '#e14b7a', waypoints: [[1000, 200], [1080, 320]], speed: 58, pause: 1.6 },
];
export const CAMERA_DEFS = [
  { id: 'cam1', x: 170, y: 104, baseAngle: 1.1, sweep: 0.9, speed: 0.55 },   // top-left wall
  { id: 'cam2', x: 1180, y: 104, baseAngle: 2.0, sweep: 0.8, speed: 0.45 },  // above the vault
];

// ---- Phase 2: the getaway city (top-down street grid) ----
export const CITY = {
  x: 40, y: HUD_H + 26, w: W - 80, h: H - HUD_H - 56,
};
// Streets (driveable): verticals and horizontals; buildings fill the blocks.
export const CITY_STREETS_V = [200, 560, 920];   // street centre x
export const CITY_STREETS_H = [190, 400, 610];   // street centre y
export const STREET_W = 92;
export const CAR_START = { x: 200, y: 640, angle: -Math.PI / 2 }; // on the street, facing up
export const SAFEHOUSE = { x: 980, y: 96, w: 220, h: 130 };       // escape plaza, top-right (carved out of the buildings)
export const POLICE_SPAWNS = [
  { x: 560, y: 190 }, { x: 920, y: 400 }, { x: 200, y: 610 }, { x: 920, y: 190 },
];

// Building blocks between streets (solid rects, computed from the grid).
// The safehouse plaza is carved out: no building may overlap it.
export function cityBuildings() {
  const colEdges = [CITY.x, CITY_STREETS_V[0] - STREET_W / 2, CITY_STREETS_V[0] + STREET_W / 2, CITY_STREETS_V[1] - STREET_W / 2, CITY_STREETS_V[1] + STREET_W / 2, CITY_STREETS_V[2] - STREET_W / 2, CITY_STREETS_V[2] + STREET_W / 2, CITY.x + CITY.w];
  const rowEdges = [CITY.y, CITY_STREETS_H[0] - STREET_W / 2, CITY_STREETS_H[0] + STREET_W / 2, CITY_STREETS_H[1] - STREET_W / 2, CITY_STREETS_H[1] + STREET_W / 2, CITY_STREETS_H[2] - STREET_W / 2, CITY_STREETS_H[2] + STREET_W / 2, CITY.y + CITY.h];
  const blocks = [];
  for (let c = 0; c < colEdges.length - 1; c += 2) {
    for (let r = 0; r < rowEdges.length - 1; r += 2) {
      const x0 = colEdges[c], x1 = colEdges[c + 1];
      const y0 = rowEdges[r], y1 = rowEdges[r + 1];
      if (x1 - x0 <= 20 || y1 - y0 <= 20) continue;
      const b = { x: x0 + 6, y: y0 + 6, w: x1 - x0 - 12, h: y1 - y0 - 12 };
      const overlapsSafehouse = b.x < SAFEHOUSE.x + SAFEHOUSE.w && b.x + b.w > SAFEHOUSE.x && b.y < SAFEHOUSE.y + SAFEHOUSE.h && b.y + b.h > SAFEHOUSE.y;
      if (!overlapsSafehouse) blocks.push(b);
    }
  }
  return blocks;
}
export const CITY_BUILDINGS = cityBuildings();
