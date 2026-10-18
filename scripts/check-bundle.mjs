import {readFile, access} from 'node:fs/promises';
const entry = new URL('../apps/desktop/dist/index.html', import.meta.url);
const html = await readFile(entry, 'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]);
for (const asset of assets) {
  if (/^https?:|^\/\//i.test(asset)) throw new Error(`Unexpected remote startup asset: ${asset}`);
  await access(new URL(asset, entry));
}
if (!assets.some(asset => asset.endsWith('.js'))) throw new Error('No local app entry found.');
console.log(`Desktop frontend: ${assets.length} local entry assets verified.`);
