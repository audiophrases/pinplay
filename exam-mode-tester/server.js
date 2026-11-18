#!/usr/bin/env node
// Exam mode tester: a small local web server for checking, on a real student
// Chromebook, which browser events fire when the student does things like
// tapping the lock key. The Chromebook opens the student page over the same
// Wi-Fi; this laptop watches the results live on /host. Every event is also
// saved to exam-mode-tester/logs/<session>.jsonl, so the results survive a
// restart and can be read afterwards. No dependencies, never deployed.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const ROOT = __dirname;
const LOG_DIR = path.join(ROOT, 'logs');
const FIRST_PORT = Number(process.env.EXAM_TESTER_PORT) || 8090;
const LAST_PORT = FIRST_PORT + 9;
const MAX_BODY = 2 * 1024 * 1024;
const ID_RE = /^[a-z0-9-]{6,40}$/i;

// session id -> { id, label, ua, ip, firstSeen, lastSeen, maxSeq: {page: seq}, events, file }
const sessions = new Map();

function getSession(id) {
  let s = sessions.get(id);
  if (!s) {
    s = { id, label: '', ua: '', ip: '', firstSeen: 0, lastSeen: 0, maxSeq: {}, events: [], file: path.join(LOG_DIR, id + '.jsonl') };
    sessions.set(id, s);
  }
  return s;
}

function applyMeta(s, meta) {
  s.label = meta.label || '';
  s.ua = meta.ua || '';
  s.ip = meta.ip || '';
  if (meta.at) {
    s.firstSeen = s.firstSeen ? Math.min(s.firstSeen, meta.at) : meta.at;
    s.lastSeen = Math.max(s.lastSeen, meta.at);
  }
}

// Each event carries the id of the page load it came from and a sequence
// number that restarts on every load, so a reload never collides with what
// the server already has and a retried batch is never stored twice.
function acceptEvent(s, ev) {
  if (!ev || typeof ev !== 'object') return false;
  const page = String(ev.page || '');
  const seq = Number(ev.seq);
  if (!page || !Number.isInteger(seq)) return false;
  if (seq <= (s.maxSeq[page] || 0)) return false;
  s.maxSeq[page] = seq;
  s.events.push(ev);
  if (ev.at) s.lastSeen = Math.max(s.lastSeen, ev.at);
  return true;
}

function loadSavedSessions() {
  let names;
  try { names = fs.readdirSync(LOG_DIR); } catch { return; }
  for (const name of names) {
    const m = /^(.+)\.jsonl$/.exec(name);
    if (!m || !ID_RE.test(m[1])) continue;
    const s = getSession(m[1]);
    for (const line of fs.readFileSync(s.file, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      let rec;
      try { rec = JSON.parse(line); } catch { continue; }
      if (rec.kind === 'meta') applyMeta(s, rec);
      else if (rec.kind === 'ev') acceptEvent(s, rec);
    }
  }
}

function lanAddresses(port) {
  const out = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal || a.address.startsWith('169.254.')) continue;
      let kind = 'other';
      if (a.address.startsWith('192.168.137.')) kind = 'hotspot';
      else if (/vethernet|virtualbox|vmware|hyper-v|wsl|docker|bluetooth|tailscale|zerotier|vpn|loopback/i.test(name)) kind = 'virtual';
      else if (/wi-?fi|wlan|wireless/i.test(name)) kind = 'wifi';
      else if (/ethernet/i.test(name)) kind = 'ethernet';
      out.push({ name, address: a.address, kind, url: `http://${a.address}:${port}` });
    }
  }
  const rank = { wifi: 0, hotspot: 1, ethernet: 2, other: 3, virtual: 4 };
  return out.sort((x, y) => rank[x.kind] - rank[y.kind]);
}

function sendJson(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function sendPage(res, file) {
  fs.readFile(path.join(ROOT, file), (err, buf) => {
    if (err) { res.writeHead(500); res.end('Missing ' + file); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleLog(req, res) {
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: 'bad body' }); return; }
  const id = String(body.session || '');
  if (!ID_RE.test(id)) { sendJson(res, 400, { error: 'bad session' }); return; }

  const s = getSession(id);
  const now = Date.now();
  const lines = [];
  const meta = {
    at: now,
    label: String(body.label || '').slice(0, 60),
    ua: String(body.ua || '').slice(0, 400),
    ip: String(req.socket.remoteAddress || '').replace(/^::ffff:/, ''),
  };
  if (!s.firstSeen || meta.label !== s.label || meta.ua !== s.ua || meta.ip !== s.ip) {
    applyMeta(s, meta);
    lines.push(JSON.stringify({ kind: 'meta', ...meta }));
  }
  s.lastSeen = now;

  for (const ev of Array.isArray(body.events) ? body.events : []) {
    if (acceptEvent(s, ev)) lines.push(JSON.stringify({ ...ev, kind: 'ev' }));
  }
  if (lines.length) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(s.file, lines.join('\n') + '\n');
  }
  sendJson(res, 200, { ok: true });
}

let listenPort = FIRST_PORT;

async function handle(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  try {
    if (req.method === 'GET' && (p === '/' || p === '/student')) return sendPage(res, 'student.html');
    if (req.method === 'GET' && p === '/host') return sendPage(res, 'host.html');
    if (req.method === 'POST' && p === '/api/log') return await handleLog(req, res);
    if (req.method === 'GET' && p === '/api/info') {
      return sendJson(res, 200, { port: listenPort, addresses: lanAddresses(listenPort), logDir: LOG_DIR });
    }
    if (req.method === 'GET' && p === '/api/sessions') {
      const list = [...sessions.values()]
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .map(({ id, label, ua, ip, firstSeen, lastSeen, events }) => ({ id, label, ua, ip, firstSeen, lastSeen, events }));
      return sendJson(res, 200, { now: Date.now(), sessions: list });
    }
    if (req.method === 'GET' && p === '/api/download') {
      const id = url.searchParams.get('id') || '';
      if (!ID_RE.test(id) || !sessions.has(id)) { res.writeHead(404); res.end('Not found'); return; }
      const s = sessions.get(id);
      const slug = (s.label || 'chromebook').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 30) || 'chromebook';
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="exam-test-${slug}-${id}.json"`,
      });
      res.end(JSON.stringify({ id, label: s.label, ua: s.ua, ip: s.ip, events: s.events }, null, 1));
      return;
    }
    if (p === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'server error' });
  }
}

function onReady(port) {
  listenPort = port;
  const addrs = lanAddresses(port);
  const host = `http://localhost:${port}/host`;
  console.log('');
  console.log('  PinPlay exam mode tester is running.');
  console.log('');
  console.log(`  Your dashboard (this laptop):   ${host}`);
  if (addrs.length) {
    console.log(`  Student Chromebook opens:       ${addrs[0].url}`);
    for (const a of addrs.slice(1)) console.log(`    or, on another network:       ${a.url}   (${a.name})`);
  } else {
    console.log('  No network found. Connect this laptop to Wi-Fi (or turn on Mobile hotspot) and restart.');
  }
  console.log('');
  console.log(`  Logs are saved in ${LOG_DIR}`);
  console.log('  Close this window to stop.');
  console.log('');
  if (process.argv.includes('--open') && process.platform === 'win32') exec(`start "" "${host}"`);
}

function listen(port) {
  const server = http.createServer(handle);
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < LAST_PORT) { listen(port + 1); return; }
    console.error(`Could not start the server: ${err.message}`);
    process.exit(1);
  });
  server.listen(port, '0.0.0.0', () => onReady(port));
}

loadSavedSessions();
listen(FIRST_PORT);
