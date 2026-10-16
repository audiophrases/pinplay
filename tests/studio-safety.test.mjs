// Avatar Studio's "Sync to Cloud" sends avatar files only (scripts/avatar-sync.mjs).
// Real git repositories in a temp folder, with a bare repository standing in
// for GitHub: the sync must commit cup/ and the ARENA_AVATAR_PARTS line of
// cloudflare/worker.js and nothing else, never push other unpushed commits,
// and deploy only when the avatar line changed and worker.js is otherwise clean.
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { git, pushAppAvatarFiles, appAvatarStatus, COMMIT_MESSAGE } from '../scripts/avatar-sync.mjs';

const WORKER = 'const A = 1;\nconst ARENA_AVATAR_PARTS = { hat: 3 };\nconst B = 2;\n';

let dir;
let app;
let origin;
const write = (rel, text) => {
  const file = path.join(app, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
const read = (rel) => fs.readFileSync(path.join(app, rel), 'utf8');
const g = (...args) => git(args, app);

async function setup() {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pinplay-avatar-sync-'));
  origin = path.join(dir, 'origin.git');
  app = path.join(dir, 'app');
  await git(['init', '-q', '--bare', '-b', 'main', origin], dir);
  await git(['init', '-q', '-b', 'main', app], dir);
  for (const [k, v] of [['user.name', 'Test'], ['user.email', 'test@example.com'], ['core.autocrlf', 'false']]) await g('config', k, v);
  write('cup/avatar-parts.js', 'window.CUP_AVATAR = 1;\n');
  write(path.join('cloudflare', 'worker.js'), WORKER);
  write('app.js', 'app v1\n');
  await g('add', '-A');
  await g('commit', '-q', '-m', 'start');
  await g('remote', 'add', 'origin', origin);
  await g('push', '-q', 'origin', 'main');
}

// Files changed by the last commit GitHub has.
async function pushedFiles() {
  return (await git(['diff', '--name-only', 'main~1', 'main'], origin)).split('\n').filter(Boolean).sort();
}

describe('Avatar Studio sync: avatar files only', () => {
  beforeEach(setup);

  it('commits cup/ and the avatar line, leaves every other change uncommitted, and skips the deploy', async () => {
    write('cup/avatar-parts.js', 'window.CUP_AVATAR = 2;\n');
    write('cup/icons/new.svg', '<svg/>\n');
    write('cloudflare/worker.js', WORKER.replace('hat: 3', 'hat: 4').replace('B = 2', 'B = 3'));
    write('app.js', 'app v2, not ready\n');
    await g('add', 'app.js'); // staged by hand: must not go in either
    write('notes.txt', 'mine\n');
    let deploys = 0;

    const out = await pushAppAvatarFiles(app, { deploy: async () => { deploys += 1; } });

    assert.equal(out.committed, true);
    assert.equal(out.pushed, true);
    assert.equal(deploys, 0);
    assert.match(out.notes.join(' '), /API was not redeployed/);
    assert.deepEqual(await pushedFiles(), ['cloudflare/worker.js', 'cup/avatar-parts.js', 'cup/icons/new.svg']);
    assert.equal(await git(['log', '-1', '--format=%s', 'main'], origin), COMMIT_MESSAGE);
    // GitHub's worker.js has the new avatar line and still the old B.
    assert.equal(await git(['show', 'main:cloudflare/worker.js'], origin, { raw: true }), WORKER.replace('hat: 3', 'hat: 4'));
    // On this computer, the other work is untouched: still changed, still staged.
    assert.equal(read('cloudflare/worker.js'), WORKER.replace('hat: 3', 'hat: 4').replace('B = 2', 'B = 3'));
    const status = (await g('status', '--porcelain')).split('\n').sort();
    assert.deepEqual(status, [' M cloudflare/worker.js', '?? notes.txt', 'M  app.js'].sort());
  });

  it('deploys when the avatar line changed and worker.js has nothing else', async () => {
    write('cloudflare/worker.js', WORKER.replace('hat: 3', 'hat: 5'));
    let deploys = 0;
    const out = await pushAppAvatarFiles(app, { deploy: async () => { deploys += 1; } });
    assert.equal(deploys, 1);
    assert.equal(out.deployed, true);
    assert.deepEqual(await pushedFiles(), ['cloudflare/worker.js']);
    assert.equal(await g('status', '--porcelain'), '');
  });

  it('does nothing when only non-avatar files changed', async () => {
    write('app.js', 'app v2\n');
    const before = await git(['rev-parse', 'main'], origin);
    let deploys = 0;
    const out = await pushAppAvatarFiles(app, { deploy: async () => { deploys += 1; } });
    assert.equal(out.committed, false);
    assert.equal(out.pushed, false);
    assert.equal(deploys, 0);
    assert.equal(await git(['rev-parse', 'main'], origin), before);
    assert.equal(read('app.js'), 'app v2\n');
  });

  it('refuses to push other commits that are not on GitHub yet', async () => {
    write('app.js', 'app v2\n');
    await g('commit', '-q', '-am', 'unfinished work');
    write('cup/avatar-parts.js', 'window.CUP_AVATAR = 3;\n');
    const before = await git(['rev-parse', 'main'], origin);
    await assert.rejects(pushAppAvatarFiles(app), /not on GitHub yet and change more than avatar files \(app\.js\)/);
    assert.equal(await git(['rev-parse', 'main'], origin), before);
  });

  it('refuses when GitHub is ahead, and reports only avatar changes as dirty', async () => {
    const other = path.join(dir, 'other');
    await git(['clone', '-q', origin, other], dir);
    for (const [k, v] of [['user.name', 'Test'], ['user.email', 'test@example.com']]) await git(['config', k, v], other);
    fs.writeFileSync(path.join(other, 'app.js'), 'from another computer\n');
    await git(['commit', '-q', '-am', 'elsewhere'], other);
    await git(['push', '-q', 'origin', 'main'], other);

    write('app.js', 'local, not avatar\n');
    let status = await appAvatarStatus(app);
    assert.equal(status.behind, 1);
    assert.equal(status.dirty, false);
    write('cup/avatar-parts.js', 'window.CUP_AVATAR = 4;\n');
    status = await appAvatarStatus(app);
    assert.equal(status.dirty, true);
    await assert.rejects(pushAppAvatarFiles(app), /GitHub has newer PinPlay changes/);
  });
});
