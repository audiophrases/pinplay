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

// Silence Node's DEP0190 "args to a child process with shell" warning. The wizard
// only ever passes its OWN controlled arguments to wrangler (any teacher input —
// passwords, keys — is fed through stdin, never as a shell argument), so the
// warning is harmless noise that needlessly alarms non-technical teachers.
process.noDeprecation = true;

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
const OWNER_GH_PAGES = 'https://audiophrases.github.io/pinplay';   // owner's frontend host baked into QR/join/assignment links
const OWNER_STUDENT_ALIAS = 'PinPlayGame';                         // owner's hardcoded tinyurl alias on the live-host screen (create/index.html)
const OWNER_LOGIN_LOOKUP_URL = 'https://script.google.com/macros/s/AKfycbz5lL1e-bzNT8moViNmCzYEf2tiyCEU_j8BmHlQ_8Lvqhryj7dsoAo8yCiFoS4WWc7mqw/exec'; // owner's Apps Script "look up login" (play.js); cleared for teachers
const R2_BUCKET = 'pinplay-quiz-media';

// Public source for self-update (--update downloads + unpacks this, then redeploys).
const UPDATE_TARBALL_URL = 'https://codeload.github.com/audiophrases/pinplay/tar.gz/refs/heads/main';
const UPDATE_TARBALL_TOPDIR = 'pinplay-main'; // top-level folder inside the tarball
const REPO_WEB_URL = 'https://github.com/audiophrases/pinplay'; // public repo, used for the Render bridge deploy
const RENDER_DEPLOY_URL = 'https://render.com/deploy?repo=' + REPO_WEB_URL; // one-click Deploy to Render (reads root render.yaml)

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
];
// CREATOR_SIGNING_KEY (Guest Workspaces) is NOT a paste-a-key secret — it's an
// internal HMAC key. The wizard auto-generates it (see provisionGuestWorkspaces).

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
// Resolve the `npx` launcher next to the SAME node that's running this wizard,
// instead of trusting bare `npx` to be on PATH. The one-click installer runs the
// wizard elevated (administrator), and an elevated session can carry a different
// PATH than the teacher's normal shell — so `npx` may be unresolvable even though
// node is fine. node.exe and npx(.cmd) always ship side by side, so this is the
// reliable launcher. Falls back to bare 'npx' if the sibling can't be found.
function resolveNpx() {
  try {
    const dir = path.dirname(process.execPath);
    const candidate = path.join(dir, process.platform === 'win32' ? 'npx.cmd' : 'npx');
    if (fs.existsSync(candidate)) return candidate;
  } catch {
    /* fall through to PATH lookup */
  }
  return 'npx';
}
const NPX = resolveNpx();

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

const npx = (args, opts) => runInherit(NPX, ['--yes', 'wrangler', ...args], opts);
const npxCapture = (args, opts) => runCapture(NPX, ['--yes', 'wrangler', ...args], opts);
const npxStdin = (args, stdinData, opts) => runWithStdin(NPX, ['--yes', 'wrangler', ...args], stdinData, opts);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cryptographically-random lowercase hex string of `bytes` length (for secrets).
function randomHex(bytes) {
  return [...webcrypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Run `wrangler deploy` with an INTERACTIVE stdin (so a brand-new account can
// answer wrangler's one-time prompts, e.g. registering a *.workers.dev subdomain)
// while still capturing stdout to parse the deployed URL. stderr streams live so
// the teacher sees progress and any prompt text.
function runDeploy(args, opts = {}) {
  const res = spawnSync(NPX, ['--yes', 'wrangler', ...args], {
    stdio: ['inherit', 'pipe', 'inherit'],
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...opts,
  });
  const stdout = res.stdout || '';
  if (stdout) process.stdout.write(stdout);
  return { code: res.status ?? 1, stdout };
}

// Deploy with a few retries — a fresh account's *.workers.dev address can take a
// minute to activate, which surfaces as a transient deploy failure.
async function deployWithRetry(label, args, opts = {}) {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = runDeploy(args, opts);
    if (res.code === 0) return res;
    if (attempt < maxAttempts) {
      console.log(warn(`\n${label} didn't go through (try ${attempt}/${maxAttempts}). On a brand-new`));
      console.log(warn('account this is usually just your free address still activating — waiting 15s…'));
      await sleep(15000);
    }
  }
  return { code: 1, stdout: '' };
}

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
// Strip the question-bank-ui.js <script> from create-page COPIES so the bank button
// (hidden by default in the markup) is never revealed. Recurses; HTML only. The
// owner's canonical files are untouched — this only edits the git-ignored _site copy.
function hideQuestionBankInSite(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { hideQuestionBankInSite(p); continue; }
    if (!p.endsWith('.html')) continue;
    const text = fs.readFileSync(p, 'utf8');
    const stripped = text.replace(/[ \t]*<script\b[^>]*question-bank-ui\.js[^>]*>\s*<\/script>\s*\r?\n?/gi, '');
    if (stripped !== text) fs.writeFileSync(p, stripped);
  }
}

// Recursively repoint owner constants in every .js/.html under a site dir (COPIES).
//  - OWNER_FRONTEND_BASE  -> teacher backend (apiUrl)
//  - OWNER_GH_PAGES       -> teacher site (siteUrl): the host baked into the live-game
//    QR codes and assignment share links. The plain form is swapped in .js only
//    (the dynamic join/QR/assignment builders) so the static "Try the showcase quiz"
//    demo link in HTML keeps pointing at the owner; the URL-encoded form is swapped
//    everywhere (it appears inside a pre-built QR image URL in create/index.html).
//  - OWNER_STUDENT_ALIAS  -> teacher's tinyurl alias (the displayed live-screen link)
function repointSiteFiles(dir, apiUrl, siteUrl, teacherAlias) {
  const ghEnc = encodeURIComponent(OWNER_GH_PAGES);
  const siteEnc = siteUrl ? encodeURIComponent(siteUrl) : '';
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { repointSiteFiles(p, apiUrl, siteUrl, teacherAlias); continue; }
    const isJs = p.endsWith('.js');
    if (!isJs && !p.endsWith('.html')) continue;
    replaceInFile(p, OWNER_FRONTEND_BASE, apiUrl);
    if (siteUrl) {
      replaceInFile(p, ghEnc, siteEnc);
      if (isJs) replaceInFile(p, OWNER_GH_PAGES, siteUrl);
    }
    if (teacherAlias) replaceInFile(p, OWNER_STUDENT_ALIAS, teacherAlias);
    // Clear the owner's "look up login" Apps Script (play.js hides the link when
    // empty). New teachers get self-service recovery via the student-accounts UI.
    if (isJs) replaceInFile(p, OWNER_LOGIN_LOOKUP_URL, '');
  }
}

// When self-service student accounts are enabled, publish + load the enhancement
// scripts: the student signup/login/forgotten UI on the join page (index.html), and
// the teacher "Students" admin panel on the create dashboard (create/index.html).
// Both self-gate at runtime on /api/students/config and read window.__PINPLAY_API.
function injectStudentAccountsUi(siteDir, apiUrl) {
  copyFileSafe(path.join(SETUP_DIR, 'student-accounts-ui.js'), path.join(siteDir, 'student-accounts-ui.js'));
  injectScriptTag(path.join(siteDir, 'index.html'), 'student-accounts-ui.js', apiUrl);
  copyFileSafe(path.join(SETUP_DIR, 'student-admin-ui.js'), path.join(siteDir, 'student-admin-ui.js'));
  injectScriptTag(path.join(siteDir, 'create', 'index.html'), '../student-admin-ui.js', apiUrl);
}
function injectScriptTag(htmlPath, src, apiUrl) {
  if (!fs.existsSync(htmlPath)) return;
  let html = fs.readFileSync(htmlPath, 'utf8');
  if (html.includes(src)) return; // already injected
  const inject = `<script>window.__PINPLAY_API=${JSON.stringify(apiUrl)};</script>\n  <script src="${src}" defer></script>`;
  html = html.includes('</body>') ? html.replace('</body>', `  ${inject}\n</body>`) : `${html}\n${inject}\n`;
  fs.writeFileSync(htmlPath, html);
}

// Parse the workers.dev URL wrangler prints on deploy.
function parseDeployedUrl(stdout) {
  const m = stdout.match(/https:\/\/[a-z0-9.-]+\.workers\.dev/i);
  return m ? m[0] : '';
}

// Shorten a URL via TinyURL's no-account endpoint (returns '' on any failure, so
// callers can fall back to a manual flow). The student join page is much easier to
// type as tinyurl.com/xxxx than a long workers.dev address.
async function makeTinyUrl(longUrl) {
  if (typeof fetch !== 'function') return '';
  try {
    const res = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(longUrl));
    if (!res.ok) return '';
    const txt = (await res.text()).trim();
    return /^https?:\/\/tinyurl\.com\//i.test(txt) ? txt : '';
  } catch {
    return '';
  }
}

// Download the latest published PinPlay code (public tarball) and copy the
// canonical app files over the local repo, so a teacher gets the owner's newest
// bug fixes / features without needing git. Refreshes ONLY canonical app files —
// never touches setup/.generated/ (the teacher's own config/secrets) or _site/
// (rebuilt fresh from these files during deploy). Returns true on success.
async function fetchLatestCode() {
  console.log(head('Getting the latest PinPlay updates'));
  if (typeof fetch !== 'function') {
    console.log(warn('This Node version can\'t download updates automatically. Deploying the code you have.'));
    return false;
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pinplay-update-'));
  const tgz = path.join(tmpDir, 'pinplay.tgz');
  try {
    console.log(dim('Downloading the newest version…'));
    const res = await fetch(UPDATE_TARBALL_URL, { redirect: 'follow' });
    if (!res.ok) throw new Error(`download failed (HTTP ${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(tgz, buf);

    // Extract with cwd = tmpDir and a RELATIVE archive name, so no "C:\..." path
    // is ever passed to tar. This works with both Windows tar builds — bsdtar
    // (System32 default, rejects --force-local) and GNU tar (e.g. Git-for-Windows,
    // which would otherwise read "C:\" as a remote host) — and on macOS/Linux.
    const ex = runCapture('tar', ['-xzf', 'pinplay.tgz'], { cwd: tmpDir });
    if (ex.code !== 0) throw new Error(`could not unpack update: ${ex.stderr.trim()}`);

    const srcRoot = path.join(tmpDir, UPDATE_TARBALL_TOPDIR);
    if (!fs.existsSync(srcRoot)) throw new Error('unexpected update archive layout');

    // Canonical files/dirs to refresh = exactly what the deploy steps consume.
    const files = ['cloudflare/worker.js', 'cloudflare/wrangler.toml', 'cloudflare/edge_tts_bridge.py', ...FRONTEND_ASSETS];
    for (const rel of files) {
      const from = path.join(srcRoot, rel);
      if (fs.existsSync(from)) copyFileSafe(from, path.join(REPO_ROOT, rel));
    }
    for (const d of FRONTEND_DIRS) {
      const from = path.join(srcRoot, d);
      if (fs.existsSync(from)) copyDirRecursive(from, path.join(REPO_ROOT, d));
    }
    // Refresh bundled JSON templates too.
    for (const f of fs.readdirSync(srcRoot)) {
      if (f.endsWith('.json')) copyFileSafe(path.join(srcRoot, f), path.join(REPO_ROOT, f));
    }
    console.log(ok('✓ Updated to the latest PinPlay version.'));
    return true;
  } catch (e) {
    console.log(warn(`Could not fetch updates (${e.message}). Deploying the code you already have.`));
    return false;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* */ }
  }
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

// Has the teacher made any progress in a previous run? (Used to offer "resume".)
function hasPriorProgress(state) {
  return Boolean(
    state && (state.loggedIn || state.passwordSet || state.bucketCreated ||
      state.apiUrl || (state.secrets && Object.keys(state.secrets).length)),
  );
}

// Record that a secret NAME is set (never the value — values live only in
// Cloudflare). This lets a resume know what's already configured.
function markSecret(state, name) {
  state.secrets = state.secrets || {};
  state.secrets[name] = true;
  saveState(state);
}

// Best-effort: which worker secrets are already set? Merges names recorded in
// state with a live `wrangler secret list` (names only — Cloudflare never returns
// values). Returns a Set; empty/partial on any failure (e.g. worker not deployed).
function liveSecretNames(tomlPath, state) {
  const names = new Set(Object.keys((state && state.secrets) || {}));
  try {
    const res = npxCapture(['secret', 'list', '--config', tomlPath], { cwd: CF_DIR });
    if (res.code === 0) {
      const text = res.stdout || '';
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end > start) {
        for (const s of JSON.parse(text.slice(start, end + 1))) {
          if (s && s.name) names.add(s.name);
        }
      }
    }
  } catch { /* best-effort only */ }
  return names;
}

// Returning teacher: summarize what's configured and ask how to proceed.
// Returns 'continue' (keep all, just finish), 'review' (add/change keys), or
// 'fresh' (reconfigure everything).
async function chooseResumeMode(state, setNames) {
  console.log(head('Welcome back — I found your previous PinPlay setup'));
  console.log('Here\'s what\'s already configured:');
  const row = (done, label) => '  ' + (done ? ok('✓ ') : dim('• ')) + label;
  console.log(row(state.loggedIn, 'Cloudflare account connected'));
  console.log(row(state.bucketCreated, 'Storage bucket'));
  console.log(row(setNames.has('CREATE_PASSWORD_HASH'), 'Teacher password'));
  console.log(row(setNames.has('EDGE_TTS_URL'), 'Neural voices' + (setNames.has('EDGE_TTS_URL') ? '' : dim(' (off)'))));
  const opt = OPTIONAL_SECRETS.map(([n]) => n).filter((n) => setNames.has(n));
  console.log(row(opt.length > 0, 'Optional keys: ' + (opt.length ? opt.join(', ') : dim('none'))));
  if (state.apiUrl) console.log(row(true, 'Backend: ' + state.apiUrl));
  if (state.siteUrl) console.log(row(true, 'Website: ' + state.siteUrl));

  console.log('\nWhat would you like to do?');
  console.log('  ' + bold('1') + ') Keep everything and finish — re-publish and pick up where we left off  ' + dim('(recommended)'));
  console.log('  ' + bold('2') + ') Add or change keys / settings, then finish');
  console.log('  ' + bold('3') + ') Start over — reconfigure everything from scratch');
  const a = (await ask('\nChoose 1, 2, or 3:', '1')).trim();
  if (a === '2') return 'review';
  if (a === '3') return 'fresh';
  return 'continue';
}

// Verify we're still connected (the wrangler login persists between runs). Only
// triggers a fresh login if the saved session is gone.
async function ensureLogin(state) {
  console.log(head('Connecting to your Cloudflare account'));
  const who = npxCapture(['whoami']);
  const text = (who.stdout + who.stderr).toLowerCase();
  const loggedOut = /not authenticated|not logged in|you are not/.test(text);
  if (who.code === 0 && !loggedOut) {
    console.log(ok('✓ Still connected to your Cloudflare account.'));
    console.log(dim(who.stdout.trim().split('\n').slice(0, 6).join('\n')));
    state.loggedIn = true;
    saveState(state);
    return;
  }
  await step3Login(state);
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
    const detail = (v.stderr || v.stdout || '').trim();
    if (detail) console.log(dim('\nDetails:\n' + detail.split('\n').slice(0, 12).join('\n')));
    console.log(dim(`\n(launcher: ${NPX})`));
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

function step5Bucket(state) {
  console.log(head('Step 5 — Creating your storage bucket'));
  const res = npxCapture(['r2', 'bucket', 'create', R2_BUCKET]);
  const out = (res.stdout + res.stderr).toLowerCase();
  if (res.code === 0 || out.includes('already') || out.includes('exists')) {
    console.log(ok(`✓ Storage bucket "${R2_BUCKET}" ready.`));
    if (state) { state.bucketCreated = true; saveState(state); }
    return true;
  }
  console.log(err('\nCould not create the storage bucket. Output:'));
  console.log(res.stdout + res.stderr);
  console.log(warn('This usually means R2 is not enabled yet (see Step 4). Fix that and re-run.'));
  process.exit(1);
}

function generateTeacherConfig() {
  // Owner-safe worker setup: the canonical worker.js is copied VERBATIM to
  // worker.original.js (this is the file the media-host repoint edits), and the
  // teacher's entry point (worker.teacher.js) is a thin WRAPPER that handles the
  // additive self-service student routes first, then falls through to the owner's
  // unmodified worker for everything else. So worker.js itself is never changed.
  ensureDir(GEN_DIR);
  const workerOriginal = path.join(GEN_DIR, 'worker.original.js');
  copyFileSafe(path.join(CF_DIR, 'worker.js'), workerOriginal);
  // Self-service student-accounts module (only runs when STUDENT_ACCOUNTS=self).
  copyFileSafe(path.join(SETUP_DIR, 'student-accounts.js'), path.join(GEN_DIR, 'student-accounts.js'));
  // Wrapper entry point. Re-exports the Durable Object class so the binding resolves.
  // Cloudflare blocks a Worker from fetch()ing its OWN hostname, which would break
  // the owner worker's lookupAndVerifyStudent() self-call to /api/students/lookup
  // (that's why assignment login failed). So we intercept that one self-call here and
  // serve it in-process. `capturedEnv` is refreshed each request; bindings/secrets are
  // identical across requests, so reusing it for the interception is concurrency-safe.
  fs.writeFileSync(path.join(GEN_DIR, 'worker.teacher.js'), [
    "import base, { QuizRoom } from './worker.original.js';",
    "import { handleStudentRoutes } from './student-accounts.js';",
    'export { QuizRoom };',
    '',
    'let capturedEnv = null;',
    'let capturedCtx = null;',
    'const __origFetch = globalThis.fetch.bind(globalThis);',
    'globalThis.fetch = async function (input, init) {',
    '  try {',
    '    if (capturedEnv) {',
    "      const u = typeof input === 'string' ? input : (input && input.url) || '';",
    "      if (u && u.indexOf('/api/students/') !== -1 && new URL(u).pathname.startsWith('/api/students/')) {",
    '        const req = input instanceof Request ? input : new Request(u, init);',
    '        const handled = await handleStudentRoutes(req, capturedEnv, capturedCtx);',
    '        if (handled) return handled;',
    '      }',
    '    }',
    '  } catch (e) { /* fall through to the network */ }',
    '  return __origFetch(input, init);',
    '};',
    '',
    'export default {',
    '  async fetch(request, env, ctx) {',
    '    capturedEnv = env;',
    '    capturedCtx = ctx;',
    '    const handled = await handleStudentRoutes(request, env, ctx);',
    '    if (handled) return handled;',
    '    return base.fetch(request, env, ctx);',
    '  },',
    '};',
    '',
  ].join('\n'));

  // Line-based + CRLF-safe (the repo toml uses \r\n): drop the owner's account_id
  // (wrangler infers it from the logged-in session) and repoint `main` at the wrapper.
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
  return { tomlPath, workerOriginal };
}

async function step7Password(tomlPath, state, mode = 'first', setNames = new Set()) {
  console.log(head('Step 6 — Your teacher password'));
  const alreadySet = setNames.has('CREATE_PASSWORD_HASH') || state.passwordSet;
  if (alreadySet && mode === 'continue') {
    console.log(ok('✓ Teacher password already set — keeping it.'));
    state.passwordSet = true;
    saveState(state);
    return;
  }
  if (alreadySet && mode === 'review') {
    if (!(await confirm('A teacher password is already set. Change it?', false))) {
      console.log(dim('Keeping your current password.'));
      return;
    }
  }
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
  markSecret(state, 'CREATE_PASSWORD_HASH');
}

async function step8TtsBridge(tomlPath, state, mode = 'first', setNames = new Set()) {
  console.log(head('Step 7 — Question audio (neural voices) — optional'));
  const alreadySet = setNames.has('EDGE_TTS_URL') || Boolean(state.ttsBridge);
  if (mode === 'continue') {
    console.log(alreadySet
      ? ok('✓ Neural voices already set up — keeping them.')
      : dim('Neural voices stay off (device voice). Choose option 2 next time to add them.'));
    return;
  }
  if (mode === 'review' && alreadySet) {
    if (!(await confirm('Neural voices are ON (your Render bridge). Change the bridge URL?', false))) {
      console.log(dim('Keeping your current neural-voice bridge.'));
      return;
    }
  }
  console.log('PinPlay can read questions aloud in natural voices. This needs a tiny free');
  console.log('helper service on Render (your own, so it never shares anyone else\'s limits).');
  console.log('If you skip this, audio still works using your device\'s built-in voice.');
  if (!(await confirm('\nSet up neural voices now?', false))) {
    console.log(dim('Skipped — you can run the wizard again later to add this.'));
    return;
  }

  // The bridge lives in the public repo at setup/tts-bridge (its own Python-only
  // folder so Render auto-detects Python cleanly) and the repo root has a
  // render.yaml Blueprint. The "Deploy to Render" button reads that Blueprint and
  // provisions the service in one click. Render only deploys from Git — it cannot
  // upload a local folder — so there is no folder to send anywhere.
  console.log('\nDeploy your own free bridge on Render (no credit card needed).');
  console.log('\n' + bold('Easiest — one click:'));
  console.log('  1. Open this link (I just opened it in your browser):');
  console.log('       ' + bold(RENDER_DEPLOY_URL));
  console.log('  2. Sign in or create a free Render account if asked.');
  console.log('  3. On the Blueprint page, click ' + bold('Apply') + ' (a.k.a. "Create Services") — leave the defaults.');
  console.log('  4. Wait until the service shows ' + bold('"Live"') + ', then copy its URL near the top');
  console.log('       (looks like https://pinplay-tts-bridge.onrender.com).');
  console.log('\n' + dim('Prefer to do it by hand? New -> Web Service -> "Public Git Repository" tab:'));
  console.log(dim('  Repo: ' + REPO_WEB_URL + '   Root Directory: setup/tts-bridge   Instance: Free'));
  console.log(dim('  Start Command: uvicorn edge_tts_bridge:app --host 0.0.0.0 --port $PORT'));
  openInBrowser(RENDER_DEPLOY_URL);
  await pause('\nWhen your bridge says "Live", press ENTER.');

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
  markSecret(state, 'EDGE_TTS_URL');
}

async function step9OptionalSecrets(tomlPath, state, mode = 'first', setNames = new Set()) {
  console.log(head('Step 8 — Optional extras'));
  if (mode === 'continue') {
    const have = OPTIONAL_SECRETS.map(([n]) => n).filter((n) => setNames.has(n));
    console.log(dim('Keeping your optional keys' + (have.length ? ': ' + have.join(', ') : ' (none set)') + '.'));
    return;
  }
  console.log('These add nice-to-have features. You can keep, change, or add any of them.');
  if ((mode === 'first' || mode === 'fresh') &&
      !(await confirm('\nConfigure any optional features now?', false))) {
    console.log(dim('Skipped all optional extras.'));
    return;
  }
  for (const [name, desc] of OPTIONAL_SECRETS) {
    const isSet = setNames.has(name);
    if (isSet) {
      if (!(await confirm(`\n${name} (${desc}) is set. Replace it?`, false))) {
        console.log(dim(`  Keeping ${name}.`));
        continue;
      }
    }
    const prompt = isSet
      ? `  New value for ${name} (leave blank to keep current):`
      : `\n${desc}\n  ${name} (paste key or leave blank to skip):`;
    const val = await ask(prompt);
    if (!val) continue;
    const r = npxStdin(['secret', 'put', name, '--config', tomlPath], val + '\n', { cwd: CF_DIR });
    if (r.code === 0) {
      console.log(ok(`  ✓ ${name} set.`));
      markSecret(state, name);
    } else {
      console.log(warn(`  Could not set ${name}; skipping.`));
    }
  }
}

// Ask (once) whether to enable self-service student accounts. Persisted; in
// "continue" mode the saved choice is reused. Determines whether the build injects
// the student-accounts UI and whether the secrets step runs.
async function stepStudentAccountsPref(state, mode) {
  if (mode === 'continue') return;
  console.log(head('Student accounts (optional)'));
  console.log('Let students self-register (email + username + password), verify their email');
  console.log('with "Sign in with Google", and recover their own login. Assignments key to the');
  console.log('email, so you can rename usernames without losing anyone\'s work. Needs a one-time,');
  console.log('wizard-guided Google sign-in setup. If off, students just type a name to join.');
  const def = state.studentAccounts === true;
  state.studentAccounts = await confirm('Enable self-service student accounts?', def);
  saveState(state);
}

// When student accounts are enabled, wire the worker secrets after the site is live
// (the OAuth client needs the site URL as its authorized origin). Idempotent: skips
// entirely once fully configured, and never re-prompts for an existing Client ID.
async function stepStudentAccountsSecrets(tomlPath, state, apiUrl, siteUrl, setNames) {
  if (!state.studentAccounts) return;
  if (setNames.has('STUDENT_ACCOUNTS') && setNames.has('GOOGLE_CLIENT_ID')) return; // already set up
  console.log(head('Student accounts — one-time Google sign-in setup'));
  console.log('To verify student emails with "Sign in with Google", create a free Google OAuth');
  console.log('Client ID (about 5 minutes, no recurring cost):');
  console.log('  1. Open ' + bold('https://console.cloud.google.com/apis/credentials') + ' (create a project if asked).');
  console.log('  2. Configure the ' + bold('OAuth consent screen') + ': User type ' + bold('External') + ', add an app name +');
  console.log('     your email, keep the default email/profile scopes, then ' + bold('Publish app') + ' (email scope needs no review).');
  console.log('  3. ' + bold('Create Credentials -> OAuth client ID -> Web application') + '.');
  console.log('  4. Under ' + bold('Authorized JavaScript origins') + ' add EXACTLY this (no trailing slash):');
  console.log('       ' + bold(siteUrl));
  console.log('  5. Create, then copy the ' + bold('Client ID') + ' (ends in .apps.googleusercontent.com).');
  openInBrowser('https://console.cloud.google.com/apis/credentials');
  await pause('When you have your Client ID, press ENTER.');

  if (!setNames.has('GOOGLE_CLIENT_ID')) {
    const id = (await ask('Paste your Google Client ID (or leave blank to add later):')).trim();
    if (id) {
      const r = npxStdin(['secret', 'put', 'GOOGLE_CLIENT_ID', '--config', tomlPath], id + '\n', { cwd: CF_DIR });
      if (r.code === 0) markSecret(state, 'GOOGLE_CLIENT_ID');
    } else {
      console.log(warn('No Client ID yet — students can still type+confirm their email; add Google later by re-running.'));
    }
  }
  if (!setNames.has('STUDENT_ROSTER_LOOKUP_SECRET')) {
    const sec = randomHex(16);
    if (npxStdin(['secret', 'put', 'STUDENT_ROSTER_LOOKUP_SECRET', '--config', tomlPath], sec + '\n', { cwd: CF_DIR }).code === 0) {
      markSecret(state, 'STUDENT_ROSTER_LOOKUP_SECRET');
    }
  }
  const lookupUrl = apiUrl.replace(/\/+$/, '') + '/api/students/lookup';
  if (npxStdin(['secret', 'put', 'STUDENT_ROSTER_LOOKUP_URL', '--config', tomlPath], lookupUrl + '\n', { cwd: CF_DIR }).code === 0) {
    markSecret(state, 'STUDENT_ROSTER_LOOKUP_URL');
  }
  if (npxStdin(['secret', 'put', 'STUDENT_ACCOUNTS', '--config', tomlPath], 'self\n', { cwd: CF_DIR }).code === 0) {
    markSecret(state, 'STUDENT_ACCOUNTS');
  }
  console.log(ok('✓ Self-service student accounts enabled (sign-up, login & self-recovery).'));
  saveState(state);
}

// Guest Workspaces (invite others to build quizzes under the teacher's account)
// needs two worker secrets. We auto-provision both so the feature just works, and
// it's harmless if never used:
//   - CREATOR_SIGNING_KEY: the HMAC key that mints/verifies invite tokens. Generated
//     once and kept across runs (regenerating would invalidate existing invites).
//   - BUILDER_BASE_URL: where invite links open. Pointed at the teacher's OWN builder
//     so guests land on her site, not the owner's default GitHub Pages builder.
async function provisionGuestWorkspaces(tomlPath, state, siteUrl, setNames) {
  let changed = false;
  if (!setNames.has('CREATOR_SIGNING_KEY')) {
    const key = [...webcrypto.getRandomValues(new Uint8Array(32))]
      .map((b) => b.toString(16).padStart(2, '0')).join('');
    const r = npxStdin(['secret', 'put', 'CREATOR_SIGNING_KEY', '--config', tomlPath], key + '\n', { cwd: CF_DIR });
    if (r.code === 0) { markSecret(state, 'CREATOR_SIGNING_KEY'); changed = true; }
  }
  if (siteUrl && !setNames.has('BUILDER_BASE_URL')) {
    const builderBase = siteUrl.replace(/\/+$/, '') + '/create/';
    const r = npxStdin(['secret', 'put', 'BUILDER_BASE_URL', '--config', tomlPath], builderBase + '\n', { cwd: CF_DIR });
    if (r.code === 0) { markSecret(state, 'BUILDER_BASE_URL'); changed = true; }
  }
  if (changed) console.log(ok('✓ Guest Workspaces ready (invite links open your own builder).'));
}

async function stepQuestionBankPref(state, mode) {
  // New teachers hide the Question Bank by default (it's a shared import library
  // aimed at the owner). Asked once; the choice persists for future updates. The
  // owner's own build is never affected — this only flags the teacher _site copy.
  if (mode === 'continue') return;
  console.log(head('Question bank (optional)'));
  console.log('The Question Bank imports pre-made questions from a shared library.');
  const def = state.hideQuestionBank !== false; // default: hidden for teachers
  state.hideQuestionBank = await confirm('Hide the Question Bank from the quiz builder?', def);
  saveState(state);
}

async function deployApiPass1(tomlPath, state) {
  console.log(head('Step 9 — Publishing your PinPlay backend (1/2)'));
  console.log(dim('(If this is a brand-new account, wrangler may ask you to pick a free'));
  console.log(dim(' *.workers.dev address — just answer in this window.)'));
  const res = await deployWithRetry('Backend publish', ['deploy', '--config', tomlPath], { cwd: CF_DIR });
  if (res.code !== 0) {
    console.log(err('\nThe backend didn\'t publish. On a brand-new Cloudflare account this can'));
    console.log(err('happen while your free *.workers.dev address is still activating (up to a'));
    console.log(err('minute or two). Wait a moment, then run the wizard again — it keeps all your'));
    console.log(err('settings and will pick up right here.'));
    process.exit(1);
  }
  let apiUrl = parseDeployedUrl(res.stdout);
  if (!apiUrl) {
    console.log(warn('\nPublished, but I couldn\'t read your backend address from the output above.'));
    while (!/^https?:\/\//i.test(apiUrl || '')) {
      apiUrl = (await ask('Copy it from the lines above and paste it here (https://...workers.dev):')).trim();
    }
  }
  console.log(ok(`\n✓ Backend live at: ${apiUrl}`));
  state.apiUrl = apiUrl;
  saveState(state);
  return apiUrl;
}

async function deployApiPass2(tomlPath, workerOriginal, apiUrl) {
  console.log(head('Step 10 — Linking your media to your own backend (2/2)'));
  // Repoint the media host stamped into uploads, on the COPY only (worker.original.js).
  replaceInFile(workerOriginal, OWNER_API_HOST, apiUrl);
  const res = await deployWithRetry('Media linking', ['deploy', '--config', tomlPath], { cwd: CF_DIR });
  if (res.code !== 0) {
    console.log(err('\nThe second backend publish didn\'t go through. Wait a moment and run the'));
    console.log(err('wizard again — it keeps your settings and resumes here.'));
    process.exit(1);
  }
  console.log(ok('✓ Your uploaded images/audio will be served from your own backend.'));
}

async function buildAndDeployFrontend(apiUrl, state, siteHint = '') {
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
  // Repoint owner-specific values on the published COPIES only (never the canonical
  // files). Two substitutions, applied to every .js/.html in _site (recursively, so
  // subfolders like create/ are covered too):
  //   1. OWNER_FRONTEND_BASE (api.pinplay.win) — the DEFAULT_BACKEND_URL + fallbacks —
  //      points at the OWNER's worker and MUST become the teacher's backend.
  //   2. OWNER_STUDENT_ALIAS (the owner's tinyurl alias shown on the live-host join
  //      screen) — becomes the TEACHER's own tinyurl alias, so her students join HER
  //      game, not the owner's. Skipped if the teacher has no tinyurl yet.
  // We deliberately leave the eugenime.workers.dev literal (the source string of the
  // app's runtime media-host rewrite) untouched: a teacher's media is already stamped
  // with their own host by worker pass-2, so that rewrite is a harmless no-op.
  const m = (state.studentShortUrl || '').match(/tinyurl\.com\/([^/?#\s]+)/i);
  const teacherAlias = m ? m[1] : '';
  repointSiteFiles(SITE_DIR, apiUrl, siteHint || '', teacherAlias);
  // Teacher deployments hide the Question Bank by default (owner-oriented import
  // library). Only kept if the teacher explicitly opted in (hideQuestionBank===false).
  if (state.hideQuestionBank !== false) hideQuestionBankInSite(SITE_DIR);
  // Self-service student accounts: publish + load the enhancement UI when enabled.
  if (state.studentAccounts) injectStudentAccountsUi(SITE_DIR, apiUrl);
  const res = await deployWithRetry('Website publish', ['deploy'], { cwd: REPO_ROOT });
  if (res.code !== 0) {
    console.log(err('\nThe website didn\'t publish. Wait a moment and run the wizard again — it'));
    console.log(err('keeps your settings and resumes here.'));
    process.exit(1);
  }
  let siteUrl = parseDeployedUrl(res.stdout);
  if (!siteUrl) {
    siteUrl = (await ask('Published! Paste your website address from above (https://...workers.dev):')).trim();
  }
  console.log(ok(`\n✓ Website live${siteUrl ? ` at: ${siteUrl}` : ''}.`));
  state.siteUrl = siteUrl;
  state.completed = true;
  saveState(state);
  return siteUrl;
}

async function stepStudentLink(state, mode, siteUrl) {
  if (!siteUrl) return;
  console.log(head('Step 12 — A short join link for your students (optional)'));
  const target = siteUrl.replace(/\/+$/, '') + '/';

  // Already have one (resume): keep it unless the teacher chose to review/redo.
  if (state.studentShortUrl) {
    if (mode !== 'review' && mode !== 'fresh') {
      console.log(ok(`✓ Student join link: ${state.studentShortUrl}`));
      console.log(dim(`   → redirects to ${target}`));
      return;
    }
    if (!(await confirm(`Your student link is ${state.studentShortUrl}. Replace it?`, false))) {
      console.log(dim('Keeping your current student link.'));
      return;
    }
  }

  console.log('Students join your live games at your website address:');
  console.log('   ' + dim(target));
  console.log('That\'s long to type. A tinyurl.com link is far easier on phones and tablets.');
  if (!(await confirm('\nCreate a short student link now?', true))) {
    console.log(dim('Skipped — you can make one anytime at https://tinyurl.com.'));
    return;
  }

  let short = await makeTinyUrl(target);
  if (short) {
    console.log(ok(`\n✓ Created: ${bold(short)}  ->  ${target}`));
  } else {
    console.log(warn('\nCouldn\'t create it automatically — let\'s make it on the website:'));
    console.log('  1. tinyurl.com will open. Paste this as the long URL:');
    console.log('       ' + bold(target));
    console.log('  2. Create the link (you can give it a memorable name).');
    console.log('  3. Copy the tinyurl it gives you and paste it below.');
    openInBrowser('https://tinyurl.com/app');
    const pasted = (await ask('Paste your tinyurl (or leave blank to skip):')).trim();
    if (/^https?:\/\//i.test(pasted)) short = pasted;
  }

  if (short) {
    // The auto link uses a random code; offer a memorable custom name.
    console.log(dim('\nWant it easier to remember (e.g. tinyurl.com/ms-emilie)? You can rename it'));
    console.log(dim('free at tinyurl.com (a quick sign-up is needed for a custom name).'));
    if (await confirm('Set a custom name now?', false)) {
      openInBrowser('https://tinyurl.com/app');
      console.log('Point your custom link to: ' + bold(target));
      const custom = (await ask('Paste your custom tinyurl (or leave blank to keep the one above):')).trim();
      if (/^https?:\/\//i.test(custom)) short = custom;
    }
    state.studentShortUrl = short;
    saveState(state);
    console.log(ok(`✓ Student join link saved: ${short}`));
  }
}

function summary(state) {
  const site = state.siteUrl || '(your website URL — see the deploy output above)';
  const lines = [
    '',
    bold(paint(C.green, '🎉 PinPlay is set up!')),
    '',
    `${bold('Teacher (create & host):')} ${site}/create/`,
    `${bold('Students join at:')}       ${site}/`,
    ...(state.studentShortUrl
      ? [`${bold('Easy student link:')}      ${state.studentShortUrl}  ${dim('(share this — redirects to the line above)')}`]
      : []),
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
    await fetchLatestCode(); // self-fetch newest code; falls back to local on any failure
    const { tomlPath, workerOriginal } = generateTeacherConfig();
    const apiUrl = await deployApiPass1(tomlPath, state);
    await deployApiPass2(tomlPath, workerOriginal, apiUrl);
    let siteUrl = state.siteUrl || await buildAndDeployFrontend(apiUrl, state, '');
    await stepStudentLink(state, 'continue', siteUrl);
    siteUrl = await buildAndDeployFrontend(apiUrl, state, siteUrl);
    const liveNames = liveSecretNames(tomlPath, state);
    await stepStudentAccountsSecrets(tomlPath, state, apiUrl, siteUrl, liveNames);
    await provisionGuestWorkspaces(tomlPath, state, siteUrl, liveNames);
    summary(state);
    getRl().close();
    return;
  }

  await step1Prereqs();

  // Returning teacher? Offer to resume instead of redoing everything.
  const prior = hasPriorProgress(state);
  let mode = 'first';
  let setNames = new Set();
  let cfg = null;
  if (prior) {
    await ensureLogin(state);              // wrangler session persists between runs
    cfg = generateTeacherConfig();         // local-only; needed to list existing secrets
    setNames = liveSecretNames(cfg.tomlPath, state);
    mode = await chooseResumeMode(state, setNames);
    if (mode === 'fresh') setNames = new Set();   // reconfigure everything from scratch
  } else {
    await step2Account();
    await step3Login(state);
  }

  // R2: only walk a returning teacher through enabling it if the bucket isn't ready.
  if (mode === 'fresh' || !state.bucketCreated) {
    await step4EnableR2();
  }
  step5Bucket(state);
  if (!cfg) cfg = generateTeacherConfig();

  const { tomlPath, workerOriginal } = cfg;
  await step7Password(tomlPath, state, mode, setNames);
  await step8TtsBridge(tomlPath, state, mode, setNames);
  await step9OptionalSecrets(tomlPath, state, mode, setNames);
  await stepQuestionBankPref(state, mode);
  await stepStudentAccountsPref(state, mode);
  const apiUrl = await deployApiPass1(tomlPath, state);
  await deployApiPass2(tomlPath, workerOriginal, apiUrl);
  // Frontend publishes in two passes: pass 1 discovers the site URL (skipped if we
  // already know it from a previous run); then we create the student link; then the
  // final publish repoints the site's OWN join/QR/assignment links + tinyurl to the
  // teacher (these reference the owner's host until the site URL is known).
  let siteUrl = state.siteUrl || await buildAndDeployFrontend(apiUrl, state, '');
  await stepStudentLink(state, mode, siteUrl);
  siteUrl = await buildAndDeployFrontend(apiUrl, state, siteUrl);
  await stepStudentAccountsSecrets(tomlPath, state, apiUrl, siteUrl, setNames);
  await provisionGuestWorkspaces(tomlPath, state, siteUrl, setNames);
  summary(state);
  getRl().close();
}

main().catch((e) => {
  console.error(err(`\nSomething went wrong: ${e?.message || e}`));
  console.error(dim('You can safely run the wizard again — it picks up where it can.'));
  try { getRl().close(); } catch { /* */ }
  process.exit(1);
});
