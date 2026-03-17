#!/usr/bin/env node
/**
 * PinPlay Quiz Media Deploy
 * 1. Creates R2 bucket (via wrangler)
 * 2. Deploys Worker with R2 binding
 * 3. Uploads media files
 * 4. Outputs ready-to-import quiz JSON
 *
 * Usage: node deploy-quiz-media.js <quiz-folder>
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const quizDir = process.argv[2];
if (!quizDir) { console.error('Usage: node deploy-quiz-media.js <quiz-folder>'); process.exit(1); }

const baseName = path.basename(quizDir);
const workerUrl = 'https://pinplay-api.eugenime.workers.dev';
const cloudflareDir = path.join(__dirname, 'cloudflare');

console.log(`\n🚀 Deploying quiz media: ${baseName}\n`);

// Step 1: Create R2 bucket (skip if exists)
console.log('1️⃣ Creating R2 bucket...');
try {
  execSync('wrangler r2 bucket create pinplay-quiz-media', { cwd: cloudflareDir, stdio: 'pipe' });
  console.log('   ✅ Bucket created');
} catch (e) {
  console.log('   ℹ️ Bucket already exists');
}

// Step 2: Deploy Worker
console.log('2️⃣ Deploying Worker with R2 binding...');
try {
  execSync('wrangler deploy', { cwd: cloudflareDir, stdio: 'inherit' });
  console.log('   ✅ Worker deployed');
} catch (e) {
  console.log('   ❌ Worker deploy failed:', e.message);
  process.exit(1);
}

// Step 3: Upload media files
console.log('3️⃣ Uploading media files...');
const audioDir = path.join(quizDir, 'audio');
const imagesDir = path.join(quizDir, 'images');

function uploadDir(dir, prefix) {
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter(f => !f.startsWith('.'));
  let count = 0;
  for (const file of files) {
    const filePath = path.join(dir, file);
    const remoteKey = `${baseName}/${prefix}/${file}`;
    const stat = fs.statSync(filePath);
    const ext = path.extname(file).toLowerCase();
    const mimeTypes = { '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    try {
      // Upload via Worker API
      const FormData = global.FormData || require('form-data');
      const form = new FormData();
      const fileData = fs.readFileSync(filePath);
      form.append('file', fileData, { filename: file, contentType });
      form.append('path', remoteKey);
      
      execSync(`curl -s -X POST -F "file=@${filePath}" -F "path=${remoteKey}" ${workerUrl}/api/media/upload`, { stdio: 'pipe' });
      console.log(`   ✅ ${remoteKey} (${(stat.size / 1024).toFixed(0)} KB)`);
      count++;
    } catch (e) {
      console.log(`   ❌ ${remoteKey}: ${e.message}`);
    }
  }
  return count;
}

const audioCount = uploadDir(audioDir, 'audio');
const imageCount = uploadDir(imagesDir, 'images');
console.log(`\n   Total uploaded: ${audioCount + imageCount} files`);

// Step 4: Output ready-to-use JSON
console.log('\n4️⃣ Ready-to-use quiz JSON:');
const jsonFiles = fs.readdirSync(quizDir).filter(f => f.endsWith('.json'));
jsonFiles.forEach(f => {
  const p = path.join(quizDir, f);
  console.log(`   📄 ${f} (${(fs.statSync(p).size / 1024).toFixed(0)} KB)`);
});

console.log(`\n✅ Done! Import the *-fullurl.json file into PinPlay.`);
console.log(`   Base URL: ${workerUrl}/api/media/${baseName}/`);
