// Midnight Getaway — the hand-in program (Node 22, standard library only).
// A top-down GTA-style heist game: one thief, one vault room full of sweeping
// vision cones and cameras, one gold safe, then a police chase across a night
// city to the safehouse. The game itself is plain static files under game/ —
// a 1280x720 canvas, vanilla JS modules, WebAudio synth, no network request —
// and this program hands it in: it copies game/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json, the summary the judge
// reads, with the vendored make.fun library. Screenshots are real renders of
// the game running in a browser (first by name is the cover); the vault frame
// shows the whole heist in one shot: thief, guard cones, cameras, loot, alarm.
//
// Serve it locally with `node tools/serve.ts`, then open http://localhost:8081/.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// buildDossier caps (reference/gate.json): text_max_bytes shapes the dossier's
// source text; the other caps refuse an entry the scorer would refuse — more
// than 4 screenshots or one over 256 KiB; more than 993 files in game/ or
// 48 MiB of game files in all, or a path under game/ over 1000 bytes. game/
// counts beside /output's own 1000-entry cap, its screenshots/ and dossier.json.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
