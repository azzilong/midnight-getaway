// Midnight Getaway — tiny static file server (Node 22 stdlib only).
// Serves the repo's game/ folder so the game can be played at
// http://localhost:8081/ exactly like the grader serves it.
// Usage: node tools/serve.ts [--port 8081]   (default 8081; 8080 is taken)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '..', 'game');
const port = Number(process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] ?? 8081);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

createServer(async (req, res) => {
  try {
    const path = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html'));
    if (!path.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(path);
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(port, () => console.log(`Midnight Getaway serving game/ at http://localhost:${port}/`));
