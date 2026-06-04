# PinPlay — French translation & bilingual (EN / FR) system

<!-- Keywords: French translation, i18n, internationalization, localization,
     translate, language toggle, EN/FR. This is THE doc for the bilingual system. -->

How the English/French interface translation works, and how to keep it working
when you add features. Read this before touching UI strings.

> **TL;DR for adding a feature:** wrap every user-visible string in `t('English text')`
> (JS) or mark it `data-i18n` (static HTML), then add a French entry in
> [`i18n-fr.js`](i18n-fr.js). The pre-commit hook blocks commits that add
> unwrapped UI strings.

---

## 1. Architecture: "the English string IS the key"

This is a gettext-style layer. There are no abstract keys like `submit_button`.
The English source string is itself the lookup key:

```js
t('Submit')                      // → 'Envoyer' in FR, 'Submit' in EN
t('Score: {n}', { n: 42 })       // → 'Score : 42' / 'Score: 42'   ({name} interpolation)
```

If a string has no French entry, `t()` returns the English unchanged — so a
missing translation **never breaks the app**; it just shows English until you add
a dictionary entry. This is why untranslated new features degrade gracefully.

### Files

| File | Role |
| --- | --- |
| [`i18n.js`](i18n.js) | The engine: `t()`, locale resolution + persistence, static-HTML translation, the EN/FR toggle, the `onLocaleChange` hook. |
| [`i18n-fr.js`](i18n-fr.js) | The French dictionary: a plain object `window.PINPLAY_FR_DICT = { "<english>": "<french>", … }`. Formal **«vous»** throughout. |
| [`scripts/i18n-check.mjs`](scripts/i18n-check.mjs) | The enforcement checker (run by the pre-commit hook). |
| [`scripts/i18n-baseline.json`](scripts/i18n-baseline.json) | Allowlist of pre-existing unwrapped strings (currently empty — no backlog). |
| [`.githooks/pre-commit`](.githooks/pre-commit) | Runs the checker on commit. |

### Load order (in both [`index.html`](index.html) and [`create/index.html`](create/index.html))

```html
<script src="i18n-fr.js"></script>  <!-- sets window.PINPLAY_FR_DICT first -->
<script src="i18n.js"></script>     <!-- reads the dict, defines window.t, boots -->
<script src="play.js"></script>     <!-- (student)  — or app.js (teacher) -->
```

`i18n.js` exposes a global `window.t` (used as bare `t(...)` everywhere) and
`window.I18N` (`{ t, getLocale, setLocale, applyStatic, mountToggle, dict }`).

- **Student page:** [`index.html`](index.html) → [`play.js`](play.js)
- **Teacher page:** [`create/index.html`](create/index.html) → [`app.js`](app.js) + [`question-bank-ui.js`](question-bank-ui.js)

---

## 2. Locale resolution & the toggle

- Stored in `localStorage` under **`pinplay.locale.v1`** (`'en'` | `'fr'`).
- **A cached preference always wins.** On the very first visit (nothing cached)
  the app starts in **English**.
- The EN/FR toggle is injected into the page header (`.topbar`) by `mountToggle()`.
- **Switching is in-place — there is NO `location.reload()`.** A reload would wipe
  the in-memory session (player token, live-game state, the teacher's unlocked
  session, builder state). Instead `setLocale()`:
  1. updates the locale + persists it + sets `<html lang>`,
  2. re-runs `applyStatic()` to re-translate static chrome,
  3. refreshes the toggle's pressed state,
  4. calls `window.onLocaleChange(loc)` so the app re-renders dynamic content.

### `onLocaleChange`

[`play.js`](play.js) and [`app.js`](app.js) each define `window.onLocaleChange` to
re-render the current view from cached state (`renderPlayerState` /
`renderHostState`). If you add a major screen whose dynamic text should flip
instantly on toggle, re-render it from there. (Anything not re-rendered simply
updates on its next natural render — e.g. the next poll tick.)

---

## 3. Translating dynamic strings (JS)

Wrap the literal in `t()`. Use `{name}` placeholders for interpolation:

```js
el.textContent = t('Saved.');
el.textContent = t('Graded Q{n} for {name}.', { n: idx + 1, name: studentName });
setJoinStatusHud(t('Answer saved ✅'), 'ok');
alert(t('Delete {label}? This cannot be undone.', { label }));
```

Then add the French to [`i18n-fr.js`](i18n-fr.js):

```js
'Saved.': 'Enregistré.',
'Graded Q{n} for {name}.': 'Q{n} corrigée pour {name}.',
```

Notes:

- Placeholder **names must match** between the key and the FR value. Missing
  placeholders in the FR string are simply left out (handy: e.g. dropping an
  English ordinal suffix that French doesn't use).
- Emoji are part of the key — keep them: `'🎙️ Record'` → `'🎙️ Enregistrer'`.
- Some auto-wrapped strings use generic placeholders `{p1}`, `{p2}`, … (these were
  produced by tooling that turned `${expr}` into positional placeholders). That's
  fine — translate them like any other key.

---

## 4. Translating static HTML

Mark the element; the engine swaps the text using the element's **own English text
as the key**. No value needed on the attribute.

| Marker | Translates |
| --- | --- |
| `data-i18n` | `textContent` (leaf elements only) |
| `data-i18n-ph` | `placeholder` attribute |
| `data-i18n-title` | `title` attribute |
| `data-i18n-aria` | `aria-label` attribute |
| `data-i18n-html` | `innerHTML` (use sparingly) |
| `data-i18n-ignore` | **skip this element** (brand names, symbols, etc.) |

```html
<button data-i18n>Save</button>
<input placeholder="Username" data-i18n-ph />
<button title="Mute music" data-i18n-title aria-label="Mute music" data-i18n-aria>🎵</button>
```

Add the matching FR entry (`'Save': 'Enregistrer'`, etc.).

**Mixed-content elements** (text + child elements, e.g. a heading with a chevron
span) must NOT get a bare `data-i18n` — it would clobber the children. Wrap just
the text in a span:

```html
<h2><span data-i18n>📝 Questions</span> <span class="collapse-chevron">▸</span></h2>
```

**Reversibility:** `applyStatic()` captures each element's original English once (in
a `data-i18nOrig*` slot) and always renders `t(original)`. Since `t(original)` is
the original in English, switching FR→EN restores the source — that's how the
toggle works both ways without a reload.

---

## 5. What is intentionally NOT translated

Do **not** wrap these (mark with `// i18n-ignore` on the JS line or
`data-i18n-ignore` on the HTML element if the checker flags them):

- **AI creation/grading prompts and JSON schema text** — these are instructions to
  an AI model, not UI. They must stay English (see the prompt-builder regions in
  [`app.js`](app.js)).
- **Imported/authored quiz content** — e.g. default answer text like `'True'`/
  `'False'`, `'Complete the sentence:'` set on a generated question. That becomes
  quiz data, not interface text.
- **Brand / proper nouns / language names** — `🎯 PinPlay`, `PIN`, `English`,
  `Català`, `Français`.
- **Pure data/format strings** — `` `Q${i+1}` ``, `` `${pct}%` ``, timers,
  leaderboard score lines. (`pts` is the same in French anyway.)

### Don't compare displayed text to English

A translated UI breaks logic like `if (btn.textContent.startsWith('Continue'))`.
Use a stable signal instead. Example already in the code: the student submit button
carries `data-mode` (`'save'|'continue'|'finish'|'submit'`) and the logic checks
that, not the visible label. Do the same for any new state-from-text check.

---

## 6. Enforcement: the checker + pre-commit hook

[`scripts/i18n-check.mjs`](scripts/i18n-check.mjs) scans [`play.js`](play.js),
[`app.js`](app.js), [`question-bank-ui.js`](question-bank-ui.js) for user-visible
literals that aren't wrapped in `t()`, plus duplicate dictionary keys.

```sh
node scripts/i18n-check.mjs            # fails (exit 1) on NEW unwrapped strings or dup keys
node scripts/i18n-check.mjs --update   # regenerate the baseline after intentionally clearing/adding backlog
```

- **Fails** on: unwrapped `.textContent`/`.innerHTML`/`.placeholder`/`.title`
  assignments and `alert`/`confirm`/`flashOk`/`setStatus`/`setBackendStatus`
  arguments that contain a real word; and duplicate FR keys.
- **Warns** (non-fatal) on: wrapped keys with no FR translation yet (English
  fallback), and static HTML text missing a `data-i18n` marker.
- **Ignores** pure data/format (requires a ≥2-letter word after stripping tags and
  `${…}`), and anything on a line with `// i18n-ignore` or an element with
  `data-i18n-ignore`.
- **Baseline** ([`scripts/i18n-baseline.json`](scripts/i18n-baseline.json)) records
  pre-existing exceptions so the gate only fails on *new* strings. It is currently
  **empty** — the whole app is wrapped, so any new unwrapped string fails the gate.

### Hook activation (once per clone)

The hook is version-controlled in [`.githooks/`](.githooks/), but Git won't enable
it automatically on clone. Run once:

```sh
git config core.hooksPath .githooks
```

Bypass a single commit (rarely needed) with `git commit --no-verify`.

---

## 7. Adding a new translatable string — checklist

1. Wrap it: `t('My new label')` (JS) or `data-i18n` (HTML). Use `{name}` for values.
2. Add the FR entry to [`i18n-fr.js`](i18n-fr.js), keeping placeholder names identical.
3. `node scripts/i18n-check.mjs` → green.
4. If it's a big new screen, re-render it from `window.onLocaleChange` so it flips
   instantly on toggle.

## 8. Adding a third language later

The engine is locale-generic; FR is just the one dictionary that's wired up. To add
e.g. Spanish:

- Add `'es'` to `SUPPORTED` in [`i18n.js`](i18n.js).
- Create `i18n-es.js` setting `window.PINPLAY_ES_DICT`, load it before `i18n.js`,
  and have the engine pick the dict by locale (today `t()` hardcodes the FR dict for
  `LOCALE === 'fr'` — generalize that to a `{ fr: FR, es: ES }` map).
- Add an `'es'` button in `mountToggle()`.

## 9. Conventions

- **Register:** formal **«vous»** everywhere.
- **Encoding:** UTF-8, **no BOM**. Accented characters go in directly (`é`, `à`, `ç`).
- **Line endings:** the JS files are CRLF — keep them CRLF.
- French typography: thin-space-then-colon is rendered as a normal space before
  `:`, `?`, `!`, `;` (e.g. `Score : 42`), and guillemets `« … »` for quotes.
