import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const client = join(root, 'dist', 'client');
const pages = join(root, 'github-pages');
const nestedAssets = join(client, 'tabi-kotoba', '_next');

rmSync(pages, { recursive: true, force: true });
mkdirSync(pages, { recursive: true });
cpSync(client, pages, { recursive: true });

// assetPrefix points browser requests at /tabi-kotoba/_next while GitHub
// Pages serves the uploaded artifact itself at that prefix.
rmSync(join(pages, 'tabi-kotoba'), { recursive: true, force: true });
rmSync(join(pages, '404.html'), { force: true });
cpSync(nestedAssets, join(pages, '_next'), { recursive: true });
cpSync(join(pages, 'index.html'), join(pages, '404.html'));
writeFileSync(join(pages, '.nojekyll'), '', 'utf8');

const manifestPath = join(pages, 'manifest.webmanifest');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.start_url = '/tabi-kotoba/';
manifest.scope = '/tabi-kotoba/';
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: `/tabi-kotoba/${icon.src.replace(/^\.\//, '')}`,
}));
writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`, 'utf8');

console.log(`Prepared GitHub Pages artifact in ${pages}`);
