// Midnight Getaway — CDP screenshot capture (Node 22+ stdlib only).
// Usage: node tools/capture.mjs --url=<page> --out=<file.jpg> [--wait=1500] [--port=9223] [--width=1280] [--height=720]
// Starts headless Chrome on the port when nothing answers there yet.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const url = arg('url', '');
const out = arg('out', '');
const waitMs = Number(arg('wait', '1500'));
const port = Number(arg('port', '9223'));
const width = Number(arg('width', '1280'));
const height = Number(arg('height', '720'));
if (!url || !out) { console.error('usage: capture.mjs --url=<page> --out=<file.jpg>'); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function portUp() {
  try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); return r.ok; } catch { return false; }
}
let chrome = null;
if (!(await portUp())) {
  chrome = spawn('bash', [join(here, 'chrome.sh'), String(port), `/tmp/midnight-chrome-${port}`, 'about:blank'], { stdio: 'ignore', detached: true });
  chrome.unref();
  for (let i = 0; i < 40; i++) { if (await portUp()) break; await sleep(500); }
}
if (!(await portUp())) { console.error('chrome did not come up on port ' + port); process.exit(1); }

const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
const send = (method, params = {}) => new Promise((res) => {
  const mid = ++id;
  pending.set(mid, res);
  ws.send(JSON.stringify({ id: mid, method, params }));
});
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
await sleep(waitMs);
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
if (shot.result?.data) {
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log(`saved ${out}`);
} else {
  console.error('capture failed', JSON.stringify(shot).slice(0, 400));
  process.exit(1);
}
ws.close();
if (chrome) { try { process.kill(-chrome.pid, 'SIGTERM'); } catch {} }
process.exit(0);
