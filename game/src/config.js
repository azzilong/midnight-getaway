// Midnight Getaway — tuning constants and palette (one place, one job).
// Top-down GTA-style heist: cross the vault room, grab the loot, lose the law.
export const W = 1280;
export const H = 720;
export const HUD_H = 64; // top bar height; play area starts below it

export const PALETTE = {
  bg: '#0d1026',          // night indigo
  floor: '#1a1f3a',       // vault floor
  floorAlt: '#171b33',    // floor checker
  wall: '#3a4066',        // walls
  wallTop: '#4d5480',
  cover: '#2c6e6a',       // safe cover (desks, crates) — teal = safe
  coverTop: '#3a8a84',
  gold: '#f5b81e',        // loot — gold = obvious
  goldDark: '#c78d0a',
  danger: '#ff4d5e',      // cones, alarm — coral red = danger
  dangerSoft: 'rgba(255,77,94,0.20)',
  camCone: 'rgba(255,214,64,0.16)', // camera cone — yellow
  guard: '#ff6b4a',       // guard body
  thief: '#e8ecff',       // thief — pale, reads against dark floor
  thiefTrim: '#f5b81e',
  police: '#4a7dff',      // police cars — blue
  policeLight: '#ff3b30',
  street: '#232744',      // getaway asphalt
  streetLine: '#3d4370',
  building: '#2e3357',
  buildingTop: '#3a4066',
  safehouse: '#2fae5f',   // escape zone — green = safe
  text: '#eef1ff',
  muted: '#9aa3c7',
  panel: 'rgba(10,13,32,0.82)',
};

export const VAULT = {
  lootValue: 50000,
  crackSeconds: 2.5,
  alarmGuardPerSec: 18,   // seen by a guard cone (up to 30 up close)
  alarmGuardClosePerSec: 30,
  alarmCamPerSec: 10,
  alarmDecayPerSec: 3,
  alarmCrackBonus: 10,
  alarmSmokeCost: 8,
  alarmJammerCost: 15,
  suspicionPerSec: 0.55,  // guard suspicion build while seen
  suspicionSprintMult: 1.5,
  suspicionDecayPerSec: 0.35,
  guardRange: 200,
  guardHalfAngle: 0.56,   // ~32 degrees
  guardWalk: 70,
  guardChase: 178,
  camRange: 230,
  camHalfAngle: 0.5,
  playerWalk: 152,
  playerSprint: 242,
  catchDist: 20,
  smokeUses: 2,
  smokeSeconds: 5,
  smokeRadius: 95,
  jammerUses: 1,
  jammerSeconds: 10,
};

export const GETAWAY = {
  seconds: 90,
  carAccel: 300,
  carBrake: 420,
  carMax: 330,
  carReverseMax: 120,
  carTurn: 2.7,           // rad/s at full speed
  policeMax: 305,
  policeTurn: 2.3,
  bustSeconds: 1.5,       // cumulative touch time to get busted
  loseTailDist: 300,      // no police within this for loseTailSeconds = clean getaway
  loseTailSeconds: 5,
};

export const SCORE = {
  timeBonusPerSec: 150,   // remaining getaway seconds on win
  alarmPenaltyPerPoint: 100, // alarm at vault exit
};
