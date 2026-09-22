/*
 * Lift named top-level declarations out of a source file and evaluate them in
 * a sandbox, so tests exercise the REAL shipped functions instead of a copy
 * that silently drifts.
 *
 * Only suitable for pure functions: anything the extracted code calls must
 * either be extracted alongside it or provided in `sandbox`.
 */
const vm = require('node:vm');

// Matches `function name(`, `async function name(` or `const name =`.
function extractDeclaration(source, name) {
  const patterns = [
    new RegExp(`^(?:async )?function ${name}\\s*\\(`, 'm'),
    new RegExp(`^const ${name}\\s*=`, 'm'),
  ];
  for (const re of patterns) {
    const m = re.exec(source);
    if (!m) continue;
    const start = m.index;
    const isFunction = /^(?:async )?function/.test(m[0]);

    // Skip the parameter list before hunting for the body, or a destructured
    // parameter such as `({ entries, meta })` is mistaken for the body brace
    // and the extraction stops at the signature.
    let bodySearchFrom = start;
    if (isFunction) {
      const paren = source.indexOf('(', start);
      let depth = 0;
      for (let i = paren; i < source.length; i++) {
        if (source[i] === '(') depth += 1;
        else if (source[i] === ')') {
          depth -= 1;
          if (depth === 0) { bodySearchFrom = i; break; }
        }
      }
    }

    const open = source.indexOf('{', bodySearchFrom);
    // A single-line `const` (arrow or literal) ends at the `;` with no block.
    if (!isFunction) {
      const semi = source.indexOf(';', start);
      if (open === -1 || (semi !== -1 && semi < open)) return source.slice(start, semi + 1);
    }
    if (open === -1) break;

    let depth = 0;
    for (let i = open; i < source.length; i++) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') {
        depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`Could not extract ${name}`);
}

// Extract `names` from `source` and return them as an object.
function loadDeclarations(source, names, sandbox = {}) {
  const src = names.map((n) => extractDeclaration(source, n)).join('\n\n');
  vm.createContext(sandbox);
  vm.runInContext(`${src}\n;globalThis.__exports = { ${names.join(', ')} };`, sandbox);
  return sandbox.__exports;
}

module.exports = { extractDeclaration, loadDeclarations };
