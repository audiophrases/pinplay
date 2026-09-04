const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// These tests run the REAL functions out of cloudflare/worker.js rather than a
// copy, so they cannot drift from what ships. We pull the named declarations we
// need (plus the sanitizers they call) and evaluate just those in a sandbox.
const WORKER_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'cloudflare', 'worker.js'),
  'utf8',
);

// Extract `function name(...) { ... }` or `const name = ...;` by brace matching.
function extractDeclaration(source, name) {
  const patterns = [
    new RegExp(`^(?:async )?function ${name}\\s*\\(`, 'm'),
    new RegExp(`^const ${name}\\s*=`, 'm'),
  ];
  for (const re of patterns) {
    const m = re.exec(source);
    if (!m) continue;
    const start = m.index;
    const open = source.indexOf('{', start);
    const semi = source.indexOf(';', start);
    // Single-line const (e.g. an arrow or literal) has no block before the `;`.
    if (open === -1 || (semi !== -1 && semi < open)) {
      return source.slice(start, semi + 1);
    }
    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`Could not extract ${name} from worker.js`);
}

const NEEDED = [
  'sanitizeEmail',
  'sanitizeClassName',
  'sanitizeAllowedDomains',
  'isEmailAllowed',
  'sanitizeRosterPolicy',
  'makeStudentKeyFromEmail',
  'makeStudentKeyFromUsername',
  'parseRosterCsv',
];

let W;
before(() => {
  const src = NEEDED.map((n) => extractDeclaration(WORKER_SRC, n)).join('\n\n');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${src}\n;globalThis.__exports = { ${NEEDED.join(', ')} };`, sandbox);
  W = sandbox.__exports;
});

describe('student key derivation', () => {
  it('keys attempts by the verified email, stably', () => {
    assert.equal(W.makeStudentKeyFromEmail('Neloru@IEcomaruga.cat'), 'usr_neloru@iecomaruga.cat');
    assert.equal(
      W.makeStudentKeyFromEmail('neloru@iecomaruga.cat'),
      W.makeStudentKeyFromEmail('  NELORU@iecomaruga.cat  '),
    );
  });

  it('gives two students with the same first name different keys', () => {
    assert.notEqual(
      W.makeStudentKeyFromEmail('martina.a@school.cat'),
      W.makeStudentKeyFromEmail('martina.b@school.cat'),
    );
  });

  it('still reproduces the old username-derived key for legacy attempts', () => {
    assert.equal(W.makeStudentKeyFromUsername('Neloru'), 'usr_neloru');
    assert.equal(W.makeStudentKeyFromUsername('nel oru'), 'usr_neloru');
  });

  it('returns empty for an unusable email', () => {
    assert.equal(W.makeStudentKeyFromEmail(''), '');
    assert.equal(W.makeStudentKeyFromEmail(null), '');
  });
});

describe('sign-in policy', () => {
  it('allows any verified account when no domains are configured', () => {
    assert.equal(W.isEmailAllowed('anyone@gmail.com', []), true);
  });

  it('allows a bare domain entry for every address on it', () => {
    const allowed = W.sanitizeAllowedDomains(['iecomaruga.cat']);
    assert.equal(W.isEmailAllowed('neloru@iecomaruga.cat', allowed), true);
    assert.equal(W.isEmailAllowed('someone@gmail.com', allowed), false);
  });

  it('allows a single full address alongside a domain', () => {
    const allowed = W.sanitizeAllowedDomains('iecomaruga.cat, teacher@gmail.com');
    assert.equal(W.isEmailAllowed('pupil@iecomaruga.cat', allowed), true);
    assert.equal(W.isEmailAllowed('teacher@gmail.com', allowed), true);
    assert.equal(W.isEmailAllowed('someone.else@gmail.com', allowed), false);
  });

  it('does not let a domain entry match a lookalike suffix', () => {
    const allowed = W.sanitizeAllowedDomains(['school.cat']);
    assert.equal(W.isEmailAllowed('a@notschool.cat', allowed), false);
    assert.equal(W.isEmailAllowed('a@school.cat.evil.com', allowed), false);
  });

  it('strips a leading @ and drops junk entries', () => {
    assert.equal(W.sanitizeAllowedDomains(['@school.cat', 'nonsense', '']).join('|'), 'school.cat');
  });

  it('defaults the policy to open and only recognises roster', () => {
    assert.equal(W.sanitizeRosterPolicy(undefined), 'open');
    assert.equal(W.sanitizeRosterPolicy('anything'), 'open');
    assert.equal(W.sanitizeRosterPolicy('roster'), 'roster');
  });
});

describe('roster CSV import', () => {
  it('reads a header row in any column order', () => {
    const rows = W.parseRosterCsv('class,email,name\n4B,neloru@iecomaruga.cat,Nel Oru');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, 'neloru@iecomaruga.cat');
    assert.equal(rows[0].displayName, 'Nel Oru');
    assert.equal(rows[0].className, '4B');
  });

  it('reads positional columns when there is no header', () => {
    const rows = W.parseRosterCsv('neloru@iecomaruga.cat,Nel Oru,4B');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].displayName, 'Nel Oru');
    assert.equal(rows[0].className, '4B');
  });

  it('keeps the old username so past attempts stay linked', () => {
    const rows = W.parseRosterCsv('email,name,class,username\na@b.cat,A B,4B,oldhandle');
    assert.equal(rows[0].legacyUsername, 'oldhandle');
  });

  it('accepts semicolon and tab separated exports', () => {
    assert.equal(W.parseRosterCsv('a@b.cat;A B;4B')[0].className, '4B');
    assert.equal(W.parseRosterCsv('a@b.cat\tA B\t4B')[0].className, '4B');
  });

  it('handles quoted fields containing a comma', () => {
    const rows = W.parseRosterCsv('email,name,class\na@b.cat,"Oru, Nel",4B');
    assert.equal(rows[0].displayName, 'Oru, Nel');
    assert.equal(rows[0].className, '4B');
  });

  it('skips lines with no email and tolerates blank lines', () => {
    const rows = W.parseRosterCsv('email,name\n\nnobody,\na@b.cat,A\n');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].email, 'a@b.cat');
  });

  it('finds an email that landed in an unexpected column', () => {
    const rows = W.parseRosterCsv('name,class,email\nNel Oru,4B,neloru@iecomaruga.cat');
    assert.equal(rows[0].email, 'neloru@iecomaruga.cat');
  });

  it('lowercases and trims addresses via sanitizeEmail on the way in', () => {
    assert.equal(W.sanitizeEmail('  NelOru@Iecomaruga.Cat '), 'neloru@iecomaruga.cat');
    assert.equal(W.sanitizeEmail('not-an-email'), '');
  });

  it('keeps class labels short and single-spaced', () => {
    assert.equal(W.sanitizeClassName('  4   B  '), '4 B');
    assert.equal(W.sanitizeClassName('x'.repeat(60)).length, 40);
  });
});
