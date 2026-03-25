#!/usr/bin/env node
/**
 * PinPlay Quiz Media Uploader - uses native FormData (Node 18+)
 * Uploads extracted media files to Cloudflare R2 via Worker API.
 *
 * Usage: node upload-quiz-media.js <quiz-folder> <worker-url>
 */

const fs = require('fs');
const path = require('path');

const quizDir = process.argv[2];
const workerUrl = (process.argv[3] || 'https://pinplay-api.eugenime.workers.dev').replace(/\/$/, '');

if (!quizDir) {
  console.error('Usage: node upload-quiz-media.js <quiz-folder> <worker-url>');
  process.exit(1);
}

const baseName = path.basename(quizDir);
const audioDir = path.join(quizDir, 'audio');
const imagesDir = path.join(quizDir, 'images');

const mimeTypes = {
  '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif'
};

async function uploadFile(filePath, remoteKey) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const fileBuffer = fs.readFileSync(filePath);
  
  // Use native FormData (Node 18+)
  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: contentType });
  form.append('file', blob, path.basename(filePath));
  form.append('path', remoteKey);
  
  const res = await fetch(workerUrl + '/api/media/upload', {
    method: 'POST',
    body: form
  });
  
  return await res.json();
}

async function uploadDir(dir, prefix) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
  const results = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    const remoteKey = `${baseName}/${prefix}/${file}`;
    try {
      const stat = fs.statSync(filePath);
      const result = await uploadFile(filePath, remoteKey);
      results.push({ file, ok: true, size: stat.size });
      console.log(`  ✅ ${remoteKey} (${(stat.size / 1024).toFixed(0)} KB)`);
    } catch (e) {
      results.push({ file, ok: false, error: e.message });
      console.log(`  ❌ ${remoteKey}: ${e.message}`);
    }
  }
  return results;
}

(async () => {
  console.log(`Uploading media from ${baseName} to ${workerUrl}\n`);
  const audioResults = await uploadDir(audioDir, 'audio');
  const imageResults = await uploadDir(imagesDir, 'images');
  const all = [...audioResults, ...imageResults];
  console.log(`\n✅ Uploaded: ${all.filter(r => r.ok).length} files`);
  console.log(`❌ Failed: ${all.filter(r => !r.ok).length} files`);
  console.log(`\nQuiz JSON base URL: ${workerUrl}/api/media/${baseName}/`);
})();
