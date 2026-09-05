import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

const requiredFiles = ['index.html'];
const missing = requiredFiles.filter(file => !fs.existsSync(path.join(distDir, file)));
if (missing.length > 0) {
  console.error('[Build] 缺失关键文件:', missing.join(', '));
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
const versionFile = path.join(distDir, 'version.json');
fs.writeFileSync(versionFile, JSON.stringify({
  version: packageJson.version,
  buildTime: new Date().toISOString(),
  commit: process.env.COMMIT_HASH || 'local',
}, null, 2));

console.log('[Build] 构建验证通过');
console.log(`[Build] 版本: ${packageJson.version} (${new Date().toLocaleString()})`);
