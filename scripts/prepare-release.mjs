import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;
const releaseRoot = path.join(projectRoot, 'release');
const bundleName = `opencli-njust-v${version}`;
const bundleDir = path.join(releaseRoot, bundleName);
const distDir = path.join(projectRoot, 'dist');

if (!fs.existsSync(distDir)) {
  console.error(`Build output not found: ${distDir}`);
  console.error('Run `npm run build` before preparing a release.');
  process.exit(1);
}

fs.rmSync(bundleDir, { recursive: true, force: true });
fs.mkdirSync(bundleDir, { recursive: true });

copyRecursive(distDir, path.join(bundleDir, 'dist'));
copyFile('README.md');
copyFile('CHANGELOG.md');
copyFile('LICENSE');

const manifest = {
  name: packageJson.name,
  version,
  createdAt: new Date().toISOString(),
  files: [
    'dist/',
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
  ],
};

fs.writeFileSync(
  path.join(bundleDir, 'release-manifest.json'),
  JSON.stringify(manifest, null, 2),
  'utf8',
);

console.log(`Prepared release directory: ${bundleDir}`);

function copyFile(relativePath) {
  const from = path.join(projectRoot, relativePath);
  const to = path.join(bundleDir, relativePath);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyRecursive(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) {
      if (entry.includes('.test.')) {
        continue;
      }
      copyRecursive(path.join(from, entry), path.join(to, entry));
    }
    return;
  }
  if (path.basename(from).includes('.test.')) {
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}
