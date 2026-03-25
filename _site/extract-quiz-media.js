#!/usr/bin/env node
/**
 * PinPlay Quiz Media Extractor
 * Extracts base64 audio/image data from quiz JSON into separate files.
 * Output: clean JSON with file paths instead of base64 strings.
 *
 * Usage: node extract-quiz-media.js <input.json> [output-dir]
 */

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputDir = process.argv[3] || null;

if (!inputPath) {
  console.error('Usage: node extract-quiz-media.js <input.json> [output-dir]');
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf-8');
const quiz = JSON.parse(raw);

// Derive output dir from input filename if not specified
const baseName = path.basename(inputPath, '.json').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
const outDir = outputDir || path.join(path.dirname(inputPath), baseName);
const audioDir = path.join(outDir, 'audio');
const imagesDir = path.join(outDir, 'images');

fs.mkdirSync(audioDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });

const questions = quiz.questions || [];
let audioCount = 0;
let imageCount = 0;
let savedBytes = 0;

questions.forEach((q, idx) => {
  const qId = q.id || `q-${idx + 1}`;

  // Extract audio data
  if (q.audioData && q.audioData.startsWith('data:')) {
    const { mimeType, buffer } = parseDataUrl(q.audioData);
    const ext = mimeToExt(mimeType);
    const fileName = `${qId}${ext}`;
    fs.writeFileSync(path.join(audioDir, fileName), buffer);
    q.audioData = `audio/${fileName}`;
    q.audioMode = 'file';
    audioCount++;
    savedBytes += buffer.length;
  }

  // Extract image data
  if (q.imageData && q.imageData.startsWith('data:')) {
    const { mimeType, buffer } = parseDataUrl(q.imageData);
    const ext = mimeToExt(mimeType);
    const fileName = `${qId}${ext}`;
    fs.writeFileSync(path.join(imagesDir, fileName), buffer);
    q.imageData = `images/${fileName}`;
    imageCount++;
    savedBytes += buffer.length;
  }

  // Also check answers for images
  if (q.answers) {
    q.answers.forEach((a, i) => {
      if (a.imageData && a.imageData.startsWith('data:')) {
        const { mimeType, buffer } = parseDataUrl(a.imageData);
        const ext = mimeToExt(mimeType);
        const fileName = `${qId}-a${i}${ext}`;
        fs.writeFileSync(path.join(imagesDir, fileName), buffer);
        a.imageData = `images/${fileName}`;
        imageCount++;
        savedBytes += buffer.length;
      }
    });
  }
});

// Write clean JSON with Worker API URLs
const workerBase = 'https://pinplay-api.eugenime.workers.dev/api/media';
const cleanJson = JSON.stringify(quiz, null, 2);
const cleanPath = path.join(outDir, baseName + '.json');
fs.writeFileSync(cleanPath, cleanJson, 'utf-8');

// Also write a version with full URLs for direct use
const quizWithUrls = JSON.parse(JSON.stringify(quiz));
quizWithUrls.questions.forEach(q => {
  if (q.audioData && !q.audioData.startsWith('http') && !q.audioData.startsWith('data:')) {
    q.audioData = `${workerBase}/${baseName}/${q.audioData}`;
  }
  if (q.imageData && !q.imageData.startsWith('http') && !q.imageData.startsWith('data:')) {
    q.imageData = `${workerBase}/${baseName}/${q.imageData}`;
  }
});
const fullUrlPath = path.join(outDir, baseName + '-fullurl.json');
fs.writeFileSync(fullUrlPath, JSON.stringify(quizWithUrls, null, 2), 'utf-8');

console.log(`✅ Extracted media from ${path.basename(inputPath)}`);
console.log(`   Audio files: ${audioCount}`);
console.log(`   Image files: ${imageCount}`);
console.log(`   Saved: ${(savedBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`   Clean JSON: ${(Buffer.byteLength(cleanJson, 'utf-8') / 1024).toFixed(0)} KB`);
console.log(`   Full-URL JSON: ${(Buffer.byteLength(JSON.stringify(quizWithUrls), 'utf-8') / 1024).toFixed(0)} KB`);
console.log(`   Output: ${outDir}`);

// Helper: parse data URL
function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL');
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

// Helper: mime type to file extension
function mimeToExt(mime) {
  const map = {
    'audio/mpeg': '.mp3',
    'audio/mp3': '.mp3',
    'audio/ogg': '.ogg',
    'audio/wav': '.wav',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  return map[mime] || '.bin';
}
