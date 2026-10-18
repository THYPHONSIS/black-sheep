import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const html = await readFile(new URL('../testversion-build/index.html', import.meta.url), 'utf8');
if (/<script\b[^>]*\bsrc\s*=|<link\b[^>]*rel=["']stylesheet/i.test(html)) throw new Error('Standalone build contains external script/style references.');
const hashes = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
if (hashes.length === 0) throw new Error('Standalone app has no executable script.');
const csp = `default-src 'none'; script-src ${hashes.join(' ')}; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; worker-src blob:; connect-src https://api.crossref.org; base-uri 'none'; form-action 'none'; object-src 'none'`;
const notices = await readFile(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8');
const escapedNotices = notices.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
if (!/<\/body>\s*<\/html>\s*$/i.test(html)) throw new Error('Standalone document has no final body/html boundary.');
const sealed = html
  .replace('<head>', () => `<head>\n<meta http-equiv="Content-Security-Policy" content="${csp}">`)
  .replace(/<\/body>(\s*<\/html>\s*)$/i, (_, tail) => `<template id="third-party-notices"><pre>${escapedNotices}</pre></template></body>${tail}`);
const finalCsp = /http-equiv="Content-Security-Policy" content="([^"]+)"/i.exec(sealed)?.[1];
for (const match of sealed.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  const hash = createHash('sha256').update(match[1]).digest('base64');
  if (!finalCsp?.includes(`'sha256-${hash}'`)) throw new Error('Final script bytes do not match the standalone CSP.');
}
await mkdir(new URL('../testversion/', import.meta.url), {recursive: true});
await writeFile(new URL('../testversion/Black-sheep-Testversion.html', import.meta.url), sealed);
console.log(`Standalone HTML sealed: ${Buffer.byteLength(sealed)} bytes, ${hashes.length} script hash(es), no CDN.`);
