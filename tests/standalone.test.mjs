import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, mkdir, writeFile, readFile, cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('standalone sealing preserves script bytes when JavaScript contains a body closing tag', async () => {
  const root = await mkdtemp(join(tmpdir(), 'black-sheep-sealing-'));
  await mkdir(join(root, 'scripts'));
  await mkdir(join(root, 'testversion-build'));
  await cp(new URL('../scripts/seal-standalone.mjs', import.meta.url), join(root, 'scripts/seal-standalone.mjs'));
  const script = 'const fragment = "<body>text</body></html>"; document.title = "Ready";';
  await writeFile(join(root, 'testversion-build/index.html'), `<!doctype html><html><head></head><body><div id="root"></div><script type="module">${script}</script></body></html>`);
  await writeFile(join(root, 'THIRD_PARTY_NOTICES.md'), 'License <text> & literal $&');
  const run = spawnSync(process.execPath, ['scripts/seal-standalone.mjs'], {cwd: root, encoding: 'utf8'});
  assert.equal(run.status, 0, run.stderr);
  const sealed = await readFile(join(root, 'testversion/Black-sheep-Testversion.html'), 'utf8');
  const scriptMatch = /<script\b[^>]*>([\s\S]*?)<\/script>/i.exec(sealed);
  assert.equal(scriptMatch[1], script, 'license insertion must not change executable bytes');
  const hash = createHash('sha256').update(scriptMatch[1]).digest('base64');
  const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/i.exec(sealed)[1];
  assert.ok(csp.includes(`'sha256-${hash}'`), 'CSP must allow the actual final script bytes');
  assert.ok(sealed.indexOf('<template id="third-party-notices">') > sealed.lastIndexOf('</script>'));
  assert.ok(sealed.includes('License &lt;text&gt; &amp; literal $&amp;'));
});
