/*
 * PinPlay i18n — lightweight bilingual (EN / FR) layer.
 *
 * Design: "English source string IS the key" (gettext-style). Calling
 * `t('Submit')` returns the French translation when the active locale is FR,
 * otherwise it returns the English string unchanged. Missing translations fall
 * back to English automatically, so the app never breaks on an untranslated
 * string — it just shows English until a dictionary entry is added.
 *
 * Static HTML is translated via a one-pass DOM walk over [data-i18n] markers
 * (the element's English text is the key). Dynamic JS strings are wrapped in
 * t(). Interpolation uses {name} placeholders: t('Q {n} / {total}', {n, total}).
 *
 * Locale resolution: a cached preference (localStorage) always wins. On the
 * very first visit (no cached value) the app starts in English. Switching
 * language persists the choice and reloads so every dynamic string re-renders.
 *
 * Register: formal «vous» throughout.
 */
(function () {
  'use strict';

  var LOCALE_KEY = 'pinplay.locale.v1';
  var SUPPORTED = ['en', 'fr'];

  function readStoredLocale() {
    try {
      var v = localStorage.getItem(LOCALE_KEY);
      if (v && SUPPORTED.indexOf(v) !== -1) return v;
    } catch (_) { /* storage disabled */ }
    return null;
  }

  // Cached preference wins. First visit (nothing cached) → English.
  var LOCALE = readStoredLocale() || 'en';

  // French dictionary: English source string -> French translation.
  // Placeholders ({name}) must match the call site. Emoji are kept in keys so
  // static-HTML lookups (which use the element's full text) resolve.
  var FR = (window.PINPLAY_FR_DICT && typeof window.PINPLAY_FR_DICT === 'object')
    ? window.PINPLAY_FR_DICT
    : {};

  function interpolate(s, params) {
    if (!params) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) {
      return (params[k] !== undefined && params[k] !== null) ? String(params[k]) : m;
    });
  }

  /**
   * Translate an English source string.
   * @param {string} en   English source (the key).
   * @param {object} [params] Optional {name} interpolation values.
   */
  function t(en, params) {
    if (en === null || en === undefined) return en;
    var key = String(en);
    var out = (LOCALE === 'fr' && Object.prototype.hasOwnProperty.call(FR, key)) ? FR[key] : key;
    return params ? interpolate(out, params) : out;
  }

  function getLocale() { return LOCALE; }

  function setLocale(loc) {
    if (SUPPORTED.indexOf(loc) === -1 || loc === LOCALE) return;
    LOCALE = loc;
    try { localStorage.setItem(LOCALE_KEY, loc); } catch (_) { /* ignore */ }
    try { document.documentElement.setAttribute('lang', loc); } catch (_) {}
    // Switch in place — NO page reload — so the user keeps their session and
    // in-progress quiz/builder state. Re-translate static chrome, refresh the
    // toggle, then let the app re-render its dynamic content via the hook.
    applyStatic(document);
    refreshToggle();
    if (typeof window.onLocaleChange === 'function') {
      try { window.onLocaleChange(loc); } catch (e) { console.error('onLocaleChange failed', e); }
    }
  }

  // --- Static HTML translation -------------------------------------------------
  // Markers (all use the element's existing English content as the key):
  //   data-i18n            -> textContent (leaf elements only)
  //   data-i18n-ph         -> placeholder attribute
  //   data-i18n-title      -> title attribute
  //   data-i18n-aria       -> aria-label attribute
  //   data-i18n-html       -> innerHTML (use sparingly; key is trimmed innerHTML)
  // The English original is captured once (in a data-* slot) the first time we
  // see each element, then we always render t(original). Because t() returns the
  // original unchanged in English, switching FR→EN restores the source text —
  // so toggling works both directions without a reload.
  function applyStatic(root) {
    var scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      if (el.dataset.i18nOrig === undefined) {
        el.dataset.i18nOrig = (el.getAttribute('data-i18n') || el.textContent || '').trim();
      }
      el.textContent = t(el.dataset.i18nOrig);
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      if (el.dataset.i18nOrigHtml === undefined) {
        el.dataset.i18nOrigHtml = (el.getAttribute('data-i18n-html') || el.innerHTML || '').trim();
      }
      el.innerHTML = t(el.dataset.i18nOrigHtml);
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      if (el.dataset.i18nOrigPh === undefined) {
        el.dataset.i18nOrigPh = el.getAttribute('data-i18n-ph') || el.getAttribute('placeholder') || '';
      }
      el.setAttribute('placeholder', t(el.dataset.i18nOrigPh));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      if (el.dataset.i18nOrigTitle === undefined) {
        el.dataset.i18nOrigTitle = el.getAttribute('data-i18n-title') || el.getAttribute('title') || '';
      }
      el.setAttribute('title', t(el.dataset.i18nOrigTitle));
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      if (el.dataset.i18nOrigAria === undefined) {
        el.dataset.i18nOrigAria = el.getAttribute('data-i18n-aria') || el.getAttribute('aria-label') || '';
      }
      el.setAttribute('aria-label', t(el.dataset.i18nOrigAria));
    });
  }

  // --- EN / FR toggle ----------------------------------------------------------
  function injectStyles() {
    if (document.getElementById('i18nToggleStyles')) return;
    var css = '' +
      '.lang-toggle{display:inline-flex;gap:0;margin-left:auto;border:1px solid rgba(255,255,255,0.35);' +
      'border-radius:999px;overflow:hidden;font-size:0.8rem;line-height:1;align-self:center;}' +
      '.lang-toggle button{background:transparent;color:inherit;border:0;padding:0.3rem 0.7rem;' +
      'cursor:pointer;font-weight:600;letter-spacing:0.03em;opacity:0.7;}' +
      '.lang-toggle button[aria-pressed="true"]{background:rgba(255,255,255,0.9);color:#111;opacity:1;}' +
      '.topbar{display:flex;align-items:center;}' +
      '.topbar h1{margin-right:0.5rem;}';
    var style = document.createElement('style');
    style.id = 'i18nToggleStyles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mountToggle() {
    var bar = document.querySelector('.topbar');
    if (!bar || bar.querySelector('.lang-toggle')) return;
    injectStyles();
    var wrap = document.createElement('div');
    wrap.className = 'lang-toggle';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language / Langue');
    [['en', 'EN'], ['fr', 'FR']].forEach(function (pair) {
      var loc = pair[0], label = pair[1];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset.loc = loc;
      btn.setAttribute('aria-pressed', String(loc === LOCALE));
      btn.addEventListener('click', function () { setLocale(loc); });
      wrap.appendChild(btn);
    });
    bar.appendChild(wrap);
  }

  // Reflect the active locale on the toggle buttons (called after an in-place switch).
  function refreshToggle() {
    document.querySelectorAll('.lang-toggle button').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.loc === LOCALE));
    });
  }

  function boot() {
    try { document.documentElement.setAttribute('lang', LOCALE); } catch (_) {}
    applyStatic(document);
    mountToggle();
  }

  // Public API.
  window.I18N = {
    t: t,
    getLocale: getLocale,
    setLocale: setLocale,
    applyStatic: applyStatic,
    mountToggle: mountToggle,
    dict: FR,
  };
  // Convenience global used throughout play.js / app.js.
  window.t = t;

  // i18n.js is loaded just before the app scripts at end of <body>, so the DOM
  // is already parsed. Run immediately if ready, else wait.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
