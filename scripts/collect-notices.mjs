import {readFile, readdir, realpath, access, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const desktop = join(root, 'apps', 'desktop');
async function locate(name, start) {
  let current = start;
  while (true) {
    const candidate = join(current, 'node_modules', name, 'package.json');
    try {await access(candidate); return dirname(await realpath(candidate));} catch { /* Continue Node's directory lookup. */ }
    const parent = dirname(current);
    if (parent === current) throw new Error(`Cannot locate runtime license for ${name}`);
    current = parent;
  }
}
const app = JSON.parse(await readFile(join(desktop, 'package.json'), 'utf8'));
const queue = await Promise.all(Object.keys(app.dependencies).map(name => locate(name, desktop)));
const seen = new Set();
let output = '# Third-party notices\n\nBlack sheep includes the following unmodified runtime dependencies. Their licenses apply independently of the MIT license for Black sheep.\n';
while (queue.length) {
  const directory = queue.shift();
  const metadata = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
  const identity = `${metadata.name}@${metadata.version}`;
  if (seen.has(identity)) continue;
  seen.add(identity);
  output += `\n## ${identity}\n\nLicense: ${metadata.license || 'See upstream license files'}.\n`;
  const notices = (await readdir(directory)).filter(name => /^(licen[sc]e|notice)/i.test(name)).sort();
  if (!notices.length) throw new Error(`No runtime license file found: ${identity}`);
  for (const file of notices) output += `\n### ${file}\n\n\`\`\`text\n${(await readFile(join(directory, file), 'utf8')).replace(/\r\n/g, '\n')}\n\`\`\`\n`;
  for (const dependency of Object.keys(metadata.dependencies || {})) queue.push(await locate(dependency, directory));
}
await writeFile(join(root, 'THIRD_PARTY_NOTICES.md'), output);
console.log(`Runtime notices collected for ${seen.size} packages.`);
