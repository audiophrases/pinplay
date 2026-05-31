#!/usr/bin/env node
/**
 * PinPlay teacher install + onboarding wizard.
 *
 * A guided, cross-platform CLI that sets up a brand-new teacher's own PinPlay
 * instance on THEIR own free Cloudflare account (Worker + Durable Objects + R2 +
 * static site) plus their own Edge TTS bridge on Render — ending with working
 * student + teacher URLs.
 *
 * Owner-safety (hard rule): this script NEVER edits the repo's canonical files
 * (cloudflare/wrangler.toml, wrangler.jsonc, app.js, play.js, cloudflare/worker.js).
 * Everything teacher-specific is written to setup/.generated/ (git-ignored) and
 * all backend repointing happens on throwaway COPIES.
 *
 * Run:  node setup/pinplay-setup.mjs            (full setup)
 *       node setup/pinplay-setup.mjs --update   (re-deploy code only)
 *
 * Requires Node 18+. Zero npm dependencies (Node built-ins only).
 */

import { spawn, spawnSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

// ---------- Paths ----------
const __filename = fileURLToPath(import.meta.url);
const SETUP_DIR = path.dirname(__filename);
const REPO_ROOT = path.resolve(SETUP_DIR, '..');
const CF_DIR = path.join(REPO_ROOT, 'cloudflare');
const GEN_DIR = path.join(SETUP_DIR, '.generated');
const SITE_DIR = path.join(REPO_ROOT, '_site');

// Owner constants that must be replaced with each teacher's own values.
const OWNER_API_HOST = 'https://pinplay-api.eugenime.workers.dev'; // stamped into media by worker.js
const OWNER_FRONTEND_BASE = 'https://api.pinplay.win';             // DEFAULT_BACKEND_URL in app.js/play.js
const R2_BUCKET = 'pinplay-quiz-media';

// Canonical frontend assets to publish (the assets worker serves _site/).
const FRONTEND_ASSETS = ['index.html', 'app.js', 'play.js', 'styles.css', 'favicon.svg', 'question-bank-ui.js'];
const FRONTEND_DIRS = ['create', 'music'];
const FRONTEND_GLOB_JSON = true; // also copy *.json templates at repo root

// Optional worker secrets the wizard can set (name → human description).
const OPTIONAL_SECRETS = [
  ['PEXELS_API_KEY', 'Image search (Pexels) in the quiz builder'],
  ['GIPHY_API_KEY', 'GIF search per question'],
  ['YOUTUBE_API_KEY', 'YouTube video lookup for questions'],
  ['VIMEO_ACCESS_TOKEN', 'Vimeo video lookup for questions'],
  ['CREATOR_SIGNING_KEY', 'Guest workspace sign-in tokens (advanced)'],
];

// ---------- Tiny ANSI helpers (no deps) ----------
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m', cyan: '\x1b[36m',
};
const supportsColor = output.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (supportsColor ? `${code}${s}${C.reset}` : s);
const bold = (s) => paint(C.bold, s);
const ok = (s) => paint(C.green, s);
const warn = (s) => paint(C.yellow, s);
const err = (s) => paint(C.red, s);
const dim = (s) => paint(C.dim, s);
const head = (s) => `\n${bold(paint(C.cyan, s))}`;

let rl;
function getRl() {
  if (!rl) rl = readline.createInterface({ input, output });
  return rl;
}
async function ask(question, def = '') {
  const suffix = def ? dim(` [${def}]`) : '';
  const a = (await getRl().question(`${question}${suffix} `)).trim();
  return a || def;
}
async function pause(msg = 'Press ENTER when you are ready to continue…') {
  await getRl().question(`\n${dim(msg)} `);
}
async function confirm(question, def = true) {
  const hint = def ? 'Y/n' : 'y/N';
  const a = (await ask(`${question} (${hint})`)).toLowerCase();
  if (!a) return def;
  return a === 'y' || a === 'yes';
}

// ---------- Process helpers ----------
function openInBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      // `start` is a cmd builtin; empty title arg avoids quoting issues.
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    } else if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  } catch {
    /* best-effort; URL is always printed too */
  }
}

// Run a command, inheriting stdio (for interactive things like `wrangler login`).
function runInherit(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  return res.status === 0;
}

// Run a command and capture stdout (for parsing deploy URLs etc.).
function runCapture(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...opts,
  });
  return { code: res.status ?? 1, stdout: res.stdout || '', stderr: res.stderr || '' };
}

// Run a command, feeding `stdinData` to it (for `wrangler secret put`).
function runWithStdin(cmd, args, stdinData, opts = {}) {
  const res = spawnSync(cmd, args, {
    input: stdinData,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...opts,
  });
  return { code: res.status ?? 1, stdout: res.stdout || '', stderr: res.stderr || '' };
}

const npx = (args, opts) => runInherit('npx', ['--yes', 'wrangler', ...args], opts);
const npxCapture = (args, opts) => runCapture('npx', ['--yes', 'wrangler', ...args], opts);
const npxStdin = (args, stdinData, opts) => runWithStdin('npx', ['--yes', 'wrangler', ...args], stdinData, opts);

// ---------- Crypto: must match worker.js sha256Hex ----------
async function sha256Hex(inputStr) {
  const data = new TextEncoder().encode(String(inputStr || ''));
  const digest = await webcrypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- FS helpers ----------
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
function copyFileSafe(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}
function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(destDir);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) copyDirRecursive(src, dest);
    else copyFileSafe(src, dest);
  }
}
// Replace every occurrence of `from` with `to` in a UTF-8 file, in place.
function replaceInFile(file, from, to) {
  const text = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, text.split(from).join(to));
}

// Parse the workers.dev URL wrangler prints on deploy.
function parseDeployedUrl(stdout) {
  const m = stdout.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i);
  return m ? m[0] : '';
}

// ---------- State persistence (resume / --update) ----------
const STATE_FILE = path.join(GEN_DIR, 'state.json');
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; }
}
function saveState(state) {
  ensureDir(GEN_DIR);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ====================================================================
// Steps
// ====================================================================

async function step1Prereqs() {
  console.log(head('Step 1 — Checking your computer'));
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 18) {
    console.log(err(`\nPinPlay setup needs Node.js 18 or newer. You have ${process.version}.`));
    console.log(`Please install the latest "LTS" version from ${bold('https://nodejs.org')} and run this again.`);
    openInBrowser('https://nodejs.org');
    process.exit(1);
  }
  console.log(ok(`✓ Node.js ${process.version}`));
  const v = npxCapture(['--version']);
  if (v.code !== 0) {
    console.log(err('\nCould not run wrangler (Cloudflare\'s deploy tool).'));
    console.log('Make sure you have an internet connection and try again.');
    process.exit(1);
  }
  console.log(ok(`✓ wrangler ${v.stdout.trim().split('\n').pop()}`));
}

async function step2Account() {
  console.log(head('Step 2 — Your free Cloudflare account'));
  console.log(`PinPlay runs on ${bold('Cloudflare')}, which is free for classroom use.`);
  console.log('I\'ll open the sign-up page. If you already have an account, just log in there and come back.');
  const url = 'https://dash.cloudflare.com/sign-up';
  console.log(dim(`\nOpening: ${url}`));
  openInBrowser(url);
  await pause('Create/confirm your account, then press ENTER here.');
}

async function step3Login(state) {
  console.log(head('Step 3 — Connecting this computer to your Cloudflare account'));
  console.log('A browser window will open asking you to allow access. Click "Allow".');
  await pause();
  if (!npx(['login'])) {
    console.log(err('\nLogin did not complete. Please run the wizard again.'));
    process.exit(1);
  }
  const who = npxCapture(['whoami']);
  if (who.code === 0) {
    console.log(ok('\n✓ Connected to your Cloudflare account.'));
    console.log(dim(who.stdout.trim().split('\n').slice(0, 6).join('\n')));
  }
  state.loggedIn = true;
  saveState(state);
}

async function step4EnableR2() {
  console.log(head('Step 4 — Turn on R2 storage (one-time)'));
  console.log('R2 is where your quiz images and audio are stored.');
  console.log(warn('Cloudflare asks for a card to switch R2 on, but the free allowance'));
  console.log(warn('(10 GB) is far more than a classroom needs — normal use is not charged.'));
  const url = 'https://dash.cloudflare.com/?to=/:account/r2';
  console.log(dim(`\nOpening the R2 page: ${url}`));
  openInBrowser(url);
  console.log('On that page, click ' + bold('"Enable R2"') + ' / ' + bold('"Purchase R2"') + ' (free tier) and add a card if asked.');
  await pause('Once R2 says it\'s enabled, press ENTER.');
}

function step5Bucket() {
  console.log(head('Step 5 — Creating your storage bucket'));
  const res = npxCapture(['r2', 'bucket', 'create', R2_BUCKET]);
  const out = (res.stdout + res.stderr).toLowerCase();
  if (res.code === 0 || out.includes('already') || out.includes('exists')) {
    console.log(ok(`✓ Storage bucket "${R2_BUCKET}" ready.`));
    return true;
  }
  console.log(err('\nCould not create the storage bucket. Output:'));
  console.log(res.stdout + res.stderr);
  console.log(warn('This usually means R2 is not enabled yet (see Step 4). Fix that and re-run.'));
  process.exit(1);
}

function generateTeacherConfig() {
  // Copy the canonical worker, and write a teacher wrangler.toml that points at
  // the copy and drops the owner's account_id (wrangler infers it from login).
  ensureDir(GEN_DIR);
  const workerCopy = path.join(GEN_DIR, 'worker.teacher.js');
  copyFileSafe(path.join(CF_DIR, 'worker.js'), workerCopy);

  // Line-based + CRLF-safe (the repo toml uses \r\n): drop the owner's account_id
  // (wrangler infers it from the logged-in session) and repoint `main` at our copy.
  const ownerToml = fs.readFileSync(path.join(CF_DIR, 'wrangler.toml'), 'utf8');
  const outLines = [];
  for (const rawLine of ownerToml.split(/\r?\n/)) {
    if (/^\s*account_id\s*=/.test(rawLine)) continue;
    if (/^\s*main\s*=/.test(rawLine)) { outLines.push('main = "worker.teacher.js"'); continue; }
    outLines.push(rawLine);
  }
  const teacherToml = outLines.join('\n');

  const tomlPath = path.join(GEN_DIR, 'wrangler.teacher.toml');
  fs.writeFileSync(tomlPath, teacherToml);
  return { tomlPath, workerCopy };
}

async function step7Password(tomlPath, state) {
  console.log(head('Step 6 — Your teacher password'));
  console.log('This password lets YOU create live games and assignments. Students never need it.');
  let pw = '';
  while (!pw) {
    pw = await ask('Choose a teacher password:');
    if (pw && pw.length < 6) {
      console.log(warn('Please use at least 6 characters.'));
      pw = '';
    }
  }
  const hash = await sha256Hex(pw.trim().normalize('NFC'));
  const res = npxStdin(['secret', 'put', 'CREATE_PASSWORD_HASH', '--config', tomlPath], hash + '\n', { cwd: CF_DIR });
  if (res.code !== 0) {
    console.log(err('\nCould not set the password secret:'));
    console.log(res.stdout + res.stderr);
    process.exit(1);
  }
  console.log(ok('✓ Teacher password set.'));
  state.passwordSet = true;
  saveState(state);
}

async function step8TtsBridge(tomlPath, state) {
  console.log(head('Step 7 — Question audio (neural voices) — optional'));
  console.log('PinPlay can read questions aloud in natural voices. This needs a tiny free');
  console.log('helper service on Render (your own, so it never shares anyone else\'s limits).');
  console.log('If you skip this, audio still works using your device\'s built-in voice.');
  if (!(await confirm('\nSet up neural voices now?', false))) {
    console.log(dim('Skipped — you can run the wizard again later to add this.'));
    return;
  }

  // Generate a deployable bridge folder from the repo's bridge source.
  const bridgeDir = path.join(GEN_DIR, 'tts-bridge');
  ensureDir(bridgeDir);
  copyFileSafe(path.join(CF_DIR, 'edge_tts_bridge.py'), path.join(bridgeDir, 'edge_tts_bridge.py'));
  fs.writeFileSync(path.join(bridgeDir, 'requirements.txt'), 'edge-tts\nfastapi\nuvicorn\n');
  fs.writeFileSync(path.join(bridgeDir, 'render.yaml'), [
    'services:',
    '  - type: web',
    '    name: pinplay-tts-bridge',
    '    runtime: python',
    '    plan: free',
    '    buildCommand: pip install -r requirements.txt',
    '    startCommand: uvicorn edge_tts_bridge:app --host 0.0.0.0 --port $PORT',
    '',
  ].join('\n'));
  console.log(ok(`\n✓ Created a ready-to-deploy bridge in: ${bridgeDir}`));
  console.log('Deploy it free on Render:');
  console.log('  1. Create a free account at ' + bold('https://render.com'));
  console.log('  2. New ➜ Web Service ➜ upload/connect this folder (it includes render.yaml)');
  console.log('  3. When it\'s live, copy the service URL (looks like https://something.onrender.com)');
  openInBrowser('https://render.com');
  await pause('Deploy the bridge, then press ENTER.');

  let bridgeUrl = '';
  while (!bridgeUrl) {
    bridgeUrl = await ask('Paste your Render bridge URL (or leave blank to skip):');
    if (!bridgeUrl) {
      console.log(dim('Skipped neural voices for now.'));
      return;
    }
    if (!/^https?:\/\//i.test(bridgeUrl)) {
      console.log(warn('That doesn\'t look like a URL (should start with https://).'));
      bridgeUrl = '';
    }
  }
  const ttsUrl = bridgeUrl.replace(/\/+$/, '') + '/tts';
  const r = npxStdin(['secret', 'put', 'EDGE_TTS_URL', '--config', tomlPath], ttsUrl + '\n', { cwd: CF_DIR });
  if (r.code !== 0) {
    console.log(warn('Could not set EDGE_TTS_URL; you can re-run the wizard to retry.'));
    return;
  }
  console.log(ok('✓ Neural voices connected.'));
  state.ttsBridge = ttsUrl;
  saveState(state);
}

async function step9OptionalSecrets(tomlPath) {
  console.log(head('Step 8 — Optional extras'));
  console.log('These add nice-to-have features. Skip any you don\'t need — you can add them later.');
  if (!(await confirm('\nConfigure any optional features now?', false))) {
    console.log(dim('Skipped all optional extras.'));
    return;
  }
  for (const [name, desc] of OPTIONAL_SECRETS) {
    const val = await ask(`\n${desc}\n  ${name} (paste key or leave blank to skip):`);
    if (!val) continue;
    const r = npxStdin(['secret', 'put', name, '--config', tomlPath], val + '\n', { cwd: CF_DIR });
    console.log(r.code === 0 ? ok(`  ✓ ${name} set.`) : warn(`  Could not set ${name}; skipping.`));
  }
}

function deployApiPass1(tomlPath, state) {
  console.log(head('Step 9 — Publishing your PinPlay backend (1/2)'));
  const res = npxCapture(['deploy', '--config', tomlPath], { cwd: CF_DIR });
  process.stdout.write(res.stdout);
  if (res.stderr) process.stdout.write(dim(res.stderr));
  if (res.code !== 0) {
    console.log(err('\nBackend deploy failed (see output above).'));
    process.exit(1);
  }
  const apiUrl = parseDeployedUrl(res.stdout + res.stderr);
  if (!apiUrl) {
    console.log(err('\nDeployed, but could not detect your backend URL automatically.'));
    process.exit(1);
  }
  console.log(ok(`\n✓ Backend live at: ${apiUrl}`));
  state.apiUrl = apiUrl;
  saveState(state);
  return apiUrl;
}

function deployApiPass2(tomlPath, workerCopy, apiUrl) {
  console.log(head('Step 10 — Linking your media to your own backend (2/2)'));
  // Repoint the media host stamped into uploads, on the COPY only.
  replaceInFile(workerCopy, OWNER_API_HOST, apiUrl);
  const res = npxCapture(['deploy', '--config', tomlPath], { cwd: CF_DIR });
  if (res.code !== 0) {
    console.log(err('\nSecond backend deploy failed:'));
    console.log(res.stdout + res.stderr);
    process.exit(1);
  }
  console.log(ok('✓ Your uploaded images/audio will be served from your own backend.'));
}

function buildAndDeployFrontend(apiUrl, state) {
  console.log(head('Step 11 — Publishing your PinPlay website'));
  // Populate _site/ from canonical root files (git-ignored payload).
  ensureDir(SITE_DIR);
  for (const f of FRONTEND_ASSETS) {
    const src = path.join(REPO_ROOT, f);
    if (fs.existsSync(src)) copyFileSafe(src, path.join(SITE_DIR, f));
  }
  for (const d of FRONTEND_DIRS) {
    copyDirRecursive(path.join(REPO_ROOT, d), path.join(SITE_DIR, d));
  }
  if (FRONTEND_GLOB_JSON) {
    for (const f of fs.readdirSync(REPO_ROOT)) {
      if (f.endsWith('.json')) copyFileSafe(path.join(REPO_ROOT, f), path.join(SITE_DIR, f));
    }
  }
  // Repoint the frontend's backend on the published COPIES only. We replace
  // OWNER_FRONTEND_BASE (api.pinplay.win) — the DEFAULT_BACKEND_URL + fallbacks —
  // because that points at the OWNER's worker and MUST NOT be used by a teacher.
  // We deliberately leave the eugenime.workers.dev literal (the source string of
  // the app's runtime media-host rewrite at app.js:13935/play.js:5240) untouched:
  // a teacher's media is already stamped with their own host by worker pass-2, so
  // that rewrite is a harmless no-op, and not editing it keeps the wizard minimal.
  for (const f of fs.readdirSync(SITE_DIR)) {
    if (f.endsWith('.js') || f.endsWith('.html')) {
      replaceInFile(path.join(SITE_DIR, f), OWNER_FRONTEND_BASE, apiUrl);
    }
  }
  const res = npxCapture(['deploy'], { cwd: REPO_ROOT });
  process.stdout.write(res.stdout);
  if (res.stderr) process.stdout.write(dim(res.stderr));
  if (res.code !== 0) {
    console.log(err('\nWebsite deploy failed (see output above).'));
    process.exit(1);
  }
  const siteUrl = parseDeployedUrl(res.stdout + res.stderr);
  console.log(ok(`\n✓ Website live${siteUrl ? ` at: ${siteUrl}` : ''}.`));
  state.siteUrl = siteUrl;
  saveState(state);
  return siteUrl;
}

function summary(state) {
  const site = state.siteUrl || '(your website URL — see the deploy output above)';
  const lines = [
    '',
    bold(paint(C.green, '🎉 PinPlay is set up!')),
    '',
    `${bold('Teacher (create & host):')} ${site}/create/`,
    `${bold('Students join at:')}       ${site}/`,
    `${bold('Assignment links:')}       ${site}/?assignment=CODE`,
    '',
    `${bold('Backend:')} ${state.apiUrl || '(see output above)'}`,
    `${bold('Teacher password:')} set ${dim('(the one you chose)')}`,
    `${bold('Neural voices:')} ${state.ttsBridge ? 'on (your own Render bridge)' : 'off (device voice fallback)'}`,
    '',
    dim('To update PinPlay later: node setup/pinplay-setup.mjs --update'),
    '',
  ];
  const text = lines.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '')).join('\n');
  console.log(lines.join('\n'));
  ensureDir(GEN_DIR);
  fs.writeFileSync(path.join(GEN_DIR, 'SETUP-SUMMARY.txt'), text);
  console.log(dim(`A copy of this summary was saved to setup/.generated/SETUP-SUMMARY.txt`));
}

// ====================================================================
// Main
// ====================================================================

async function main() {
  const isUpdate = process.argv.includes('--update');
  const state = loadState();

  console.log(bold(paint(C.cyan, '\n=== PinPlay Teacher Setup ===')));

  if (isUpdate) {
    console.log(dim('Update mode: re-deploying the latest PinPlay code to your existing setup.\n'));
    if (!state.apiUrl) {
      console.log(err('No previous setup found. Run the full wizard first (without --update).'));
      process.exit(1);
    }
    await step1Prereqs();
    const { tomlPath, workerCopy } = generateTeacherConfig();
    const apiUrl = deployApiPass1(tomlPath, state);
    deployApiPass2(tomlPath, workerCopy, apiUrl);
    buildAndDeployFrontend(apiUrl, state);
    summary(state);
    getRl().close();
    return;
  }

  await step1Prereqs();
  await step2Account();
  await step3Login(state);
  await step4EnableR2();
  step5Bucket();
  const { tomlPath, workerCopy } = generateTeacherConfig();
  await step7Password(tomlPath, state);
  await step8TtsBridge(tomlPath, state);
  await step9OptionalSecrets(tomlPath);
  const apiUrl = deployApiPass1(tomlPath, state);
  deployApiPass2(tomlPath, workerCopy, apiUrl);
  buildAndDeployFrontend(apiUrl, state);
  summary(state);
  getRl().close();
}

main().catch((e) => {
  console.error(err(`\nSomething went wrong: ${e?.message || e}`));
  console.error(dim('You can safely run the wizard again — it picks up where it can.'));
  try { getRl().close(); } catch { /* */ }
  process.exit(1);
});
