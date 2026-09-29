const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadDeclarations } = require('./helpers/extract-declaration');

// Reading text formatting: **bold**, *italic*, __underline__ as plain-text
// marks, shown as formatting on the student page (play.js), the projector and
// the PDF (app.js). The two copies must agree, and nothing else becomes HTML.
let P;
let A;
before(() => {
  P = loadDeclarations(fs.readFileSync(path.join(__dirname, '..', 'play.js'), 'utf8'), ['escapeHtml', 'formatReadingTextHtml']);
  A = loadDeclarations(fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8'), ['escapeHtml', 'formatReadingTextHtml']);
});

const cases = [
  ['Use the **Past Simple** for finished time.', 'Use the <strong>Past Simple</strong> for finished time.'],
  ['Signals: *yesterday*, *last year*.', 'Signals: <em>yesterday</em>, <em>last year</em>.'],
  ['The __auxiliary__ is have/has.', 'The <u>auxiliary</u> is have/has.'],
  ['**Rule:** use *already* with __have__.', '<strong>Rule:</strong> use <em>already</em> with <u>have</u>.'],
  ['Line one\n**Line two**', 'Line one\n<strong>Line two</strong>'],
];

describe('reading text formatting', () => {
  it('shows bold, italic and underline', () => {
    for (const [input, html] of cases) assert.equal(P.formatReadingTextHtml(input), html, input);
  });

  it('student page and teacher page format the same way', () => {
    for (const [input] of cases) assert.equal(A.formatReadingTextHtml(input), P.formatReadingTextHtml(input), input);
  });

  it('never turns typed text into HTML', () => {
    const out = P.formatReadingTextHtml('<script>alert(1)</script> **<b>x</b>**');
    assert.ok(!out.includes('<script>') && !out.includes('<b>'), out);
    assert.match(out, /<strong>&lt;b&gt;x&lt;\/b&gt;<\/strong>/);
  });

  it('leaves lone or spaced marks alone', () => {
    for (const plain of ['5 * 3 = 15', 'a * b * c', 'snake_case_name', '** not bold **', 'price: 10*']) {
      assert.equal(P.formatReadingTextHtml(plain), P.escapeHtml(plain), plain);
    }
  });
});
