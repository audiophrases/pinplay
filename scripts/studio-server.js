import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PORT = 3005;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESIGN_DIR = 'C:\\Users\\Admin\\PinPlayCupMediaDesign';

const json = (res, data, code = 200) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
};

function rebuild() {
  return new Promise((resolve) => {
    exec(`node scripts/build-cup-assets.mjs "${DESIGN_DIR}" --write-worker`, { cwd: ROOT }, (err) => {
      resolve(!err);
    });
  });
}

function findSetDirectories(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (['base', 'previews', 'parts', 'game', 'animations', 'sounds', 'vendor', 'photo-avatar-test'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const hasSvgs = fs.readdirSync(fullPath).some((f) => f.endsWith('.svg'));
      if (hasSvgs) results.push(fullPath);
      results.push(...findSetDirectories(fullPath));
    }
  }
  return results;
}

function getCatalog() {
  const PACK = path.join(DESIGN_DIR, 'PinPlay-Cup-Asset-Pack');
  const SETS = Array.from(new Set([
    path.join(PACK, 'avatars'),
    ...findSetDirectories(DESIGN_DIR),
  ]));

  const catalog = { hair: [], eyes: [], mouth: [], glasses: [{ id: 'none', name: 'None' }], hat: [{ id: 'none', name: 'None' }], shirt: [] };

  for (const dir of SETS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.svg') && !f.startsWith('base-')).sort();
    for (const f of files) {
      const filePath = path.join(dir, f);
      const m = f.match(/^(hair|eyes|mouth|glasses|hat|shirt)-(.+)\.svg$/);
      if (!m) continue;
      const [, cat, rest] = m;
      const svgContent = fs.readFileSync(filePath, 'utf8')
        .replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();

      if (cat === 'hair') {
        const pair = rest.match(/^(.+)-(back|front)$/);
        const id = pair ? pair[1] : rest;
        let entry = catalog.hair.find((h) => h.id === id);
        if (!entry) {
          entry = { id, name: id.replace(/-/g, ' '), filePath };
          catalog.hair.push(entry);
        }
        entry[pair ? pair[2] : 'front'] = svgContent;
      } else {
        catalog[cat].push({
          id: rest,
          name: rest.replace(/-/g, ' '),
          filePath,
          svg: svgContent,
        });
      }
    }
  }
  return catalog;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/catalog' && req.method === 'GET') {
    return json(res, getCatalog());
  }

  if (url.pathname === '/api/save-part' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', async () => {
      try {
        const { filePath, content } = JSON.parse(body);
        if (!filePath || !filePath.startsWith(DESIGN_DIR)) {
          return json(res, { error: 'Invalid file path' }, 400);
        }
        const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 100 104" width="500" height="520">${content}</svg>`;
        fs.writeFileSync(filePath, fullSvg, 'utf8');
        await rebuild();
        return json(res, { success: true });
      } catch (err) {
        return json(res, { error: err.message }, 500);
      }
    });
    return;
  }

  if (url.pathname === '/api/delete-part' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', async () => {
      try {
        const { filePath } = JSON.parse(body);
        if (!filePath || !filePath.startsWith(DESIGN_DIR)) {
          return json(res, { error: 'Invalid file path' }, 400);
        }
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        await rebuild();
        return json(res, { success: true });
      } catch (err) {
        return json(res, { error: err.message }, 500);
      }
    });
    return;
  }

  if (url.pathname === '/api/create-part' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', async () => {
      try {
        const { category, itemId, content } = JSON.parse(body);
        const fileName = `${category}-${itemId}.svg`;
        const destDir = path.join(DESIGN_DIR, 'PinPlay-Cup-Avatars-Expansion', 'custom');
        fs.mkdirSync(destDir, { recursive: true });
        const filePath = path.join(destDir, fileName);
        const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 100 104" width="500" height="520">${content || ''}</svg>`;
        fs.writeFileSync(filePath, fullSvg, 'utf8');
        await rebuild();
        return json(res, { success: true, filePath });
      } catch (err) {
        return json(res, { error: err.message }, 500);
      }
    });
    return;
  }

  json(res, { error: 'Not found' }, 404);
});

server.listen(PORT, () => {
  console.log(`⚡ PinPlay Cup Local Studio Server running on http://localhost:${PORT}`);
});
