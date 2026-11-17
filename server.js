/* EDO LAB · servidor local (sin dependencias, Node 18+).  Uso:  node server.js  →  http://localhost:3000
   La API key vive SOLO en el servidor (nunca llega al navegador). Define ANTHROPIC_API_KEY como variable de entorno
   o crea un archivo .env junto a este archivo con:  ANTHROPIC_API_KEY=sk-ant-...  (ver .env.example). */
const http = require('http'), fs = require('fs'), path = require('path');
// Carga opcional de .env (sin dependencias)
try { for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch (e) { /* sin .env */ }
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', PORT = +process.env.PORT || 3000;
const HAS_KEY = API_KEY && !API_KEY.startsWith('PEGA_');
const SYSTEM = fs.readFileSync(path.join(__dirname, 'prompt.txt'), 'utf8');
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const PUBLIC = new Set(['index.html', 'styles.css', 'extra.css', 'script.js', 'engine.js', 'extra.js']); // lista blanca: server.js, prompt.txt, .env y chat.php nunca se sirven
const SEC = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin', 'x-frame-options': 'SAMEORIGIN' };
const hits = new Map();
setInterval(() => { const now = Date.now(); for (const [ip, h] of hits) if (!h.some(t => now - t < 60000)) hits.delete(ip); }, 60000).unref();
const send = (res, code, obj) => { res.writeHead(code, { ...SEC, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

async function readBody(req, limit = 60000) { let body = ''; for await (const c of req) { body += c; if (body.length > limit) throw Object.assign(new Error('Mensaje demasiado largo.'), { status: 413 }); } return body; }

async function chat(req, res) {
  const ip = req.socket.remoteAddress, now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (h.length >= 20) return send(res, 429, { error: 'Demasiadas preguntas seguidas, espera un minuto.' });
  h.push(now); hits.set(ip, h);
  let data; try { data = JSON.parse(await readBody(req)); } catch (e) { return send(res, e.status || 400, { error: e.status ? e.message : 'Solicitud inválida.' }); }
  if (!HAS_KEY) return send(res, 500, { error: 'falta la API key (variable ANTHROPIC_API_KEY o archivo .env)' });
  const msgs = (Array.isArray(data.messages) ? data.messages : []).slice(-10).map(m => ({ role: m && m.role === 'assistant' ? 'assistant' : 'user', content: String((m && m.content) ?? '').slice(0, 6000) })).filter(m => m.content.trim());
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  if (!msgs.length) return send(res, 400, { error: 'Mensaje vacío.' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(90000), headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model: MODEL, max_tokens: 3000, system: SYSTEM, messages: msgs }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return send(res, r.status, { error: (d.error && d.error.message) || 'error de la API' });
    return send(res, 200, { text: (d.content || []).map(c => c.text || '').join('') });
  } catch (e) { return send(res, 502, { error: e.name === 'TimeoutError' ? 'la IA tardó demasiado en responder' : 'no se pudo contactar a la IA' }); }
}

http.createServer(async (req, res) => {
  let url; try { url = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end('Solicitud inválida'); }
  if (url === '/api/chat') return req.method === 'POST' ? chat(req, res) : send(res, 405, { error: 'Usa POST' });
  if (url === '/api/health') return send(res, 200, { ai: !!HAS_KEY });
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, SEC); return res.end('Método no permitido'); }
  const name = url === '/' ? 'index.html' : url.replace(/^\/+/, ''), ext = path.extname(name).toLowerCase();
  if (!PUBLIC.has(name)) { res.writeHead(404, SEC); return res.end('No encontrado'); }
  fs.readFile(path.join(__dirname, name), (err, data) => { if (err) { res.writeHead(404, SEC); return res.end('No encontrado'); } res.writeHead(200, { ...SEC, 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-cache' }); res.end(req.method === 'HEAD' ? undefined : data); });
}).listen(PORT, () => console.log(`EDO LAB en http://localhost:${PORT}` + (HAS_KEY ? '' : '  (⚠ sin API key: el tutor IA no responderá, el motor del laboratorio sí funciona)')));
