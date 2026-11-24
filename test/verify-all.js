import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

console.log('--- Starting Aether Comprehensive Integration Verification ---');

// 1. Verify Manifest files
console.log('1. Checking extension manifests...');
const chromeManifest = JSON.parse(fs.readFileSync('extensions/chrome/manifest.json', 'utf-8'));
if (chromeManifest.manifest_version !== 3) throw new Error('Chrome manifest version is not 3');
console.log('   ✓ Chrome Manifest V3 valid.');

const firefoxManifest = JSON.parse(fs.readFileSync('extensions/firefox/manifest.json', 'utf-8'));
if (firefoxManifest.manifest_version !== 2) throw new Error('Firefox manifest version is not 2');
console.log('   ✓ Firefox WebExtension Manifest valid.');

// 2. Start server
console.log('2. Starting Node.js Express server...');
const serverProcess = spawn('node', ['server/server.js'], { stdio: 'pipe' });

serverProcess.stdout.on('data', (d) => {
  // console.log('[server]:', d.toString());
});
serverProcess.stderr.on('data', (d) => {
  console.error('[server error]:', d.toString());
});

// Wait 1.5 seconds for server to bind
setTimeout(async () => {
  try {
    // 3. Test static website
    console.log('3. Testing static website serving...');
    const indexHtml = await httpGet('http://localhost:3000/');
    if (!indexHtml.includes('Aether AI')) throw new Error('Failed to load website index.html');
    console.log('   ✓ Website HTML serves correctly.');

    // 4. Test shared CSS
    console.log('4. Testing shared CSS asset delivery...');
    const cssContent = await httpGet('http://localhost:3000/shared/css/variables.css');
    if (!cssContent.includes('--color-bg: #0A0A0A;')) throw new Error('Failed to load shared CSS variables');
    console.log('   ✓ Shared design tokens served cleanly.');

    // 5. Test Models API
    console.log('5. Testing GET /api/models endpoint...');
    const modelsJson = await httpGet('http://localhost:3000/api/models');
    const parsedModels = JSON.parse(modelsJson);
    if (!parsedModels.models || parsedModels.models.length === 0) throw new Error('Models endpoint failed');
    console.log(`   ✓ Models endpoint returns ${parsedModels.models.length} active models.`);

    // 6. Test Chat SSE Streaming endpoint
    console.log('6. Testing POST /api/chat SSE streaming...');
    const streamRes = await httpPost('http://localhost:3000/api/chat', {
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'gpt-4o'
    });
    if (!streamRes.includes('data: ')) throw new Error('Chat streaming did not emit SSE events');
    console.log('   ✓ Chat SSE streaming endpoint functional.');

    console.log('\n======================================================');
    console.log('  ALL INTEGRATION VERIFICATIONS PASSED SUCCESSFULLY!  ');
    console.log('======================================================\n');
  } catch (err) {
    console.error('VERIFICATION FAILED:', err);
    process.exitCode = 1;
  } finally {
    serverProcess.kill('SIGTERM');
  }
}, 1500);

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function httpPost(url, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}
