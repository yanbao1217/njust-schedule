import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(projectRoot, 'dist', 'njust');
const targetDir = path.join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.opencli', 'clis', 'njust');

if (!fs.existsSync(sourceDir)) {
  console.error(`Build output not found: ${sourceDir}`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

for (const file of fs.readdirSync(sourceDir)) {
  const from = path.join(sourceDir, file);
  const to = path.join(targetDir, file);
  fs.copyFileSync(from, to);
  console.log(`Copied ${file}`);
}

console.log(`Synced files to ${targetDir}`);

