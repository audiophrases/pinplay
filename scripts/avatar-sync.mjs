// Avatar Studio's "Sync to Cloud", limited to avatar files (owner's decision,
// 2026-10-17). It used to run `git add -A && git commit -am … && git push` in
// the PinPlay app and then deploy the API from whatever was on disk, so any
// unfinished work in the project went live with the avatars.
//
// - The design repo (PinPlayCupMediaDesign) holds only avatar artwork: all of
//   it is committed and pushed, as before.
// - In the PinPlay app, only what the avatar build writes is committed: the
//   cup/ folder and the ARENA_AVATAR_PARTS line of cloudflare/worker.js. The
//   commit is made through a temporary index, so nothing else (changed,
//   staged or new) goes in. Other commits not on GitHub yet stop the push.
// - The API is deployed only when the avatar line changed and worker.js has no
//   other changes on this computer (the deploy reads the file on disk).
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const AVATAR_DIR = 'cup';
export const WORKER_FILE = 'cloudflare/worker.js';
const AVATAR_LINE = /^const ARENA_AVATAR_PARTS = \{[^\r\n]*\};/m;
export const COMMIT_MESSAGE = 'Avatar Studio: avatar files';

export function git(args, cwd, { env, input, raw = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile('git', args, {
      cwd,
      env: env ? { ...process.env, ...env } : process.env,
      maxBuffer: 64 * 1024 * 1024,
    }, (err, out, errOut) => {
      if (err) reject(new Error(String(errOut || out || err.message).trim()));
      else resolve(raw ? String(out) : String(out).trim());
    });
    if (input != null) child.stdin.end(input);
  });
}

const lf = (s) => String(s).replace(/\r\n/g, '\n');
export const avatarLine = (text) => (String(text).match(AVATAR_LINE) || [''])[0];

// True when two versions of worker.js differ in nothing but the avatar line.
export function onlyAvatarLineDiffers(a, b) {
  const lineA = avatarLine(a);
  const lineB = avatarLine(b);
  if (!lineA || !lineB) return lf(a) === lf(b);
  return lf(a).replace(lineA, '') === lf(b).replace(lineB, '');
}

async function headFile(root, file, rev = 'HEAD') {
  try { return await git(['show', `${rev}:${file}`], root, { raw: true }); } catch { return null; }
}

// What the avatar build changed in the app, compared with the last commit.
export async function appAvatarChanges(root) {
  const cupChanged = (await git(['status', '--porcelain', '--', AVATAR_DIR], root)) !== '';
  const head = await headFile(root, WORKER_FILE);
  let working = null;
  try { working = fs.readFileSync(path.join(root, WORKER_FILE), 'utf8'); } catch { /* no worker */ }
  const headLine = head == null ? '' : avatarLine(head);
  const workLine = working == null ? '' : avatarLine(working);
  const workerLineChanged = !!headLine && !!workLine && headLine !== workLine;
  const workerOtherChanges = head != null && working != null && !onlyAvatarLineDiffers(head, working);
  return { cupChanged, workerLineChanged, workerOtherChanges, head, headLine, workLine };
}

async function aheadBehind(root) {
  await git(['fetch', 'origin'], root).catch(() => {});
  const [ahead, behind] = await Promise.all([
    git(['rev-list', '--count', 'origin/main..HEAD'], root),
    git(['rev-list', '--count', 'HEAD..origin/main'], root),
  ]);
  return { ahead: Number(ahead), behind: Number(behind) };
}

// Commits on this computer that GitHub doesn't have, beyond avatar files.
async function otherUnpushedChanges(root) {
  const paths = (await git(['diff', '--name-only', 'origin/main', 'HEAD'], root)).split('\n').filter(Boolean);
  const others = paths.filter((p) => !p.startsWith(`${AVATAR_DIR}/`) && p !== WORKER_FILE);
  if (paths.includes(WORKER_FILE)) {
    const [before, after] = await Promise.all([headFile(root, WORKER_FILE, 'origin/main'), headFile(root, WORKER_FILE)]);
    if (before != null && after != null && !onlyAvatarLineDiffers(before, after)) others.push(WORKER_FILE);
  }
  return others;
}

// For the Studio's sync check: dirty means avatar files only.
export async function appAvatarStatus(root) {
  const { ahead, behind } = await aheadBehind(root);
  const [local, remote, changes] = await Promise.all([
    git(['log', '-1', '--format=%ct', 'HEAD'], root),
    git(['log', '-1', '--format=%ct', 'origin/main'], root),
    appAvatarChanges(root),
  ]);
  return { local: Number(local), remote: Number(remote), ahead, behind, dirty: changes.cupChanged || changes.workerLineChanged };
}

// Commits the app's avatar files (and nothing else), pushes main, and deploys
// the API when the avatar line changed and worker.js is otherwise unchanged.
export async function pushAppAvatarFiles(root, { deploy = null } = {}) {
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'], root);
  if (branch !== 'main') throw new Error(`The PinPlay app is on the branch "${branch}", not main. Avatar sync only works on main.`);
  const { ahead, behind } = await aheadBehind(root);
  if (behind > 0) throw new Error('GitHub has newer PinPlay changes. Pull them first (Sync offers to), then sync the avatars.');
  if (ahead > 0) {
    const others = await otherUnpushedChanges(root);
    if (others.length) {
      throw new Error(`This computer has ${ahead} PinPlay commit(s) that are not on GitHub yet and change more than avatar files (${others.slice(0, 3).join(', ')}${others.length > 3 ? '…' : ''}). Avatar sync only sends avatar files, so it stopped.`);
    }
  }

  const changes = await appAvatarChanges(root);
  const notes = [];
  let committed = false;
  if (changes.cupChanged || changes.workerLineChanged) {
    const indexFile = path.join(os.tmpdir(), `pinplay-avatar-index-${process.pid}-${Date.now()}`);
    const env = { GIT_INDEX_FILE: indexFile };
    try {
      await git(['read-tree', 'HEAD'], root, { env });
      if (changes.cupChanged) await git(['add', '-A', '--', AVATAR_DIR], root, { env });
      if (changes.workerLineChanged) {
        const next = changes.head.replace(changes.headLine, changes.workLine);
        const blob = await git(['hash-object', '-w', '--no-filters', '--stdin'], root, { input: next });
        await git(['update-index', '--cacheinfo', `100644,${blob},${WORKER_FILE}`], root, { env });
      }
      const tree = await git(['write-tree'], root, { env });
      const headTree = await git(['rev-parse', 'HEAD^{tree}'], root);
      if (tree !== headTree) {
        const parent = await git(['rev-parse', 'HEAD'], root);
        const commit = await git(['commit-tree', tree, '-p', parent, '-m', COMMIT_MESSAGE], root);
        await git(['update-ref', '-m', 'avatar studio sync', 'refs/heads/main', commit, parent], root);
        // The real index follows the new commit for these paths only.
        await git(['reset', '-q', '--', AVATAR_DIR, WORKER_FILE], root);
        committed = true;
      }
    } finally {
      try { fs.unlinkSync(indexFile); } catch { /* never written */ }
    }
  }

  let pushed = false;
  if (committed || ahead > 0) {
    await git(['push', 'origin', 'main'], root);
    pushed = true;
  }

  let deployed = false;
  if (changes.workerLineChanged) {
    if (changes.workerOtherChanges) {
      notes.push('The API was not redeployed: cloudflare/worker.js has other changes on this computer. Deploy it once those are ready.');
    } else if (deploy) {
      await deploy();
      deployed = true;
    }
  }
  if (!committed && !pushed) notes.push('No avatar files changed in PinPlay.');
  const others = (await git(['status', '--porcelain'], root)).split('\n').filter(Boolean)
    .filter((l) => !l.slice(3).startsWith(`${AVATAR_DIR}/`));
  if (others.length) notes.push(`${others.length} other change(s) in PinPlay stay on this computer, not synced.`);
  return { committed, pushed, deployed, notes };
}

// The design repo holds only avatar artwork: everything in it syncs.
export async function pushDesignRepo(dir) {
  await git(['add', '-A'], dir);
  const staged = await git(['diff', '--cached', '--quiet'], dir).then(() => false, () => true);
  if (staged) await git(['commit', '-m', 'Avatar Studio Auto Sync'], dir);
  await git(['push'], dir);
  return { committed: staged };
}
