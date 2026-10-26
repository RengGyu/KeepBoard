// 시안 전용 loopback 정적 서버: 이 폴더와 public/game-art만 제공한다. 사용자 Store·API·키를 쓰지 않는다.
// 실행: node docs/rummikub-board-redesign/mockup/serve.mjs [port]  → http://127.0.0.1:4400/#public
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const art = fileURLToPath(new URL('../../../public/game-art/', import.meta.url));
const port = Number(process.argv[2] || 4400);
const types = {'.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json'};

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const [root, rel] = path.startsWith('/game-art/') ? [art, path.slice('/game-art/'.length)] : [here, path === '/' ? 'index.html' : path.slice(1)];
  const file = join(root, rel);
  if (!file.startsWith(root) || !(extname(file) in types)) { res.writeHead(404).end(); return; }
  let body;
  try { body = await readFile(file); } catch { res.writeHead(404).end(); return; }
  res.writeHead(200, {'content-type': types[extname(file)]}).end(body);
}).listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/#public`));
