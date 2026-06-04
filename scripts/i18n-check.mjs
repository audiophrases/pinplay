#!/usr/bin/env node
/*
 * i18n-check — guards the EN/FR translation layer.
 *
 * Run:  node scripts/i18n-check.mjs
 *
 * FAILS (exit 1) when it finds:
 *   1. User-visible string literals NOT wrapped in t() in the app JS files
 *      (.textContent / .innerHTML / .placeholder / .title assignments and
 *       alert / confirm / setStatus / setBackendStatus / flashOk arguments).
 *   2. Duplicate keys in the French dictionary.
 *
 * WARNS (does not fail) about:
 *   - t() keys with no French translation yet (they fall back to English).
 *   - Static-HTML text in common elements that lacks a data-i18n marker.
 *
 * Escape hatches:
 *   - Append a `// i18n-ignore` comment on a JS line to skip it intentionally
 *     (use for pure data/format strings, single-char hints, etc.).
 *   - Add a `data-i18n-ignore` attribute to an HTML element to skip it.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const ROOT = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const JS_FILES = ['play.js', 'app.js', 'question-bank-ui.js'];
const HTML_FILES = ['index.html', 'create/index.html'];
const DICT_FILE = 'i18n-fr.js';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const hasLetter = (s) => /[A-Za-zÀ-ÿ]/.test(s);
const stripTags = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');

let errors = 0;
const warn = [];

// ---- 1. Unwrapped display literals in JS -----------------------------------
// A leading quote/backtick directly after the sink means it is NOT wrapped
// (a wrapped call reads `= t(` / `, t(` — no quote there).
const SINK_ASSIGN = /\.(textContent|innerHTML|placeholder|title)\s*=\s*(['"`])/;
const SINK_CALL_1 = /\b(?:window\.)?(?:alert|confirm|flashOk|setBackendStatus|setCreateAuthStatus)\(\s*(['"`])/;
const SINK_CALL_2 = /\bsetStatus\([^,]*,\s*(['"`])/;

// Best-effort extraction of the literal text starting at `quoteIdx` on a line.
function literalAt(line, quoteIdx) {
  const q = line[quoteIdx];
  let out = '';
  for (let i = quoteIdx + 1; i < line.length; i++) {
    const c = line[i];
    if (c === '\\') { out += line[i + 1] || ''; i++; continue; }
    if (c === q) break;
    out += c;
  }
  return out;
}

for (const file of JS_FILES) {
  const lines = read(file).split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes('i18n-ignore')) return;
    for (const re of [SINK_ASSIGN, SINK_CALL_1, SINK_CALL_2]) {
      const m = line.match(re);
      if (!m) continue;
      const isInnerHtml = m[1] === 'innerHTML' || /innerHTML/.test(m[0]);
      const quoteIdx = m.index + m[0].length - 1;
      const lit = literalAt(line, quoteIdx);
      const text = isInnerHtml ? stripTags(lit) : lit;
      if (!hasLetter(text)) continue;
      errors++;
      console.log(`✗ ${file}:${i + 1}  unwrapped string → wrap in t():`);
      console.log(`    ${line.trim().slice(0, 120)}`);
    }
  });
}

// ---- 2. French dictionary: collect keys, detect duplicates -----------------
const dictSrc = read(DICT_FILE);
const KEY_RE = /^\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*:/gm;
const unq = (s) => s.slice(1, -1).replace(/\\(['"\\])/g, '$1');
const dictKeys = new Set();
const dups = [];
let dm;
while ((dm = KEY_RE.exec(dictSrc))) { const k = unq(dm[1]); if (dictKeys.has(k)) dups.push(k); dictKeys.add(k); }
for (const d of dups) { errors++; console.log(`✗ duplicate dictionary key: ${JSON.stringify(d)}`); }

// ---- 3. Wrapped t() keys missing a French translation (warning) ------------
const CALL_KEY_RE = /\bt\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g;
const seenKeys = new Set();
for (const file of JS_FILES) {
  const src = read(file);
  let cm;
  while ((cm = CALL_KEY_RE.exec(src))) {
    const k = unq(cm[1]);
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    if (!dictKeys.has(k)) warn.push(`untranslated (falls back to English): ${file}  ${JSON.stringify(k)}`);
  }
}

// ---- 4. Static HTML text without a data-i18n marker (warning) --------------
const LEAF = /<(button|label|option|h1|h2|h3|h4|th|td|strong|summary|legend)\b([^>]*)>([^<]*)<\/\1>/gi;
for (const file of HTML_FILES) {
  const html = read(file);
  let hm;
  while ((hm = LEAF.exec(html))) {
    const attrs = hm[2];
    const text = hm[3].trim();
    if (!hasLetter(text)) continue;
    if (/\bdata-i18n(\b|-)/.test(attrs)) continue; // marked (text or attribute)
    if (/data-i18n-ignore/.test(attrs)) continue;
    warn.push(`unmarked HTML text (add data-i18n or data-i18n-ignore): ${file}  ${JSON.stringify(text.slice(0, 60))}`);
  }
}

// ---- report ----------------------------------------------------------------
if (warn.length) {
  console.log(`\n⚠ ${warn.length} warning(s):`);
  for (const w of warn) console.log('  - ' + w);
}

if (errors) {
  console.log(`\n❌ i18n-check failed: ${errors} error(s). Wrap the strings in t() (or add // i18n-ignore for non-UI data), then re-run.`);
  process.exit(1);
}
console.log(`\n✓ i18n-check passed — ${dictKeys.size} FR keys, ${seenKeys.size} wrapped keys in use${warn.length ? `, ${warn.length} warning(s)` : ''}.`);
