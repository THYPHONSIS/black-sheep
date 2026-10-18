import {mkdtemp, writeFile, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {applyLatexBlock, buildLatexTable, buildLatexChart} from '../apps/desktop/src/domain/latex.ts';

// Controlled generated fixture only. This is not an app compiler for user documents.
let source = String.raw`\documentclass{article}
\begin{document}
\section{Generated fixture}
This is a deterministic build test.
\end{document}`;
for (const block of [buildLatexTable(2, 3), buildLatexChart('bar', 'Label;Wert\nA;1,5\nB;2'), buildLatexChart('line', 'Label;Wert\nA;1\nB;2.5')]) {
  const result = applyLatexBlock(source, block);
  if (result.error) throw new Error(result.error);
  source = result.source;
}
const dir = await mkdtemp(join(tmpdir(), 'black-sheep-fixture-'));
await writeFile(join(dir, 'fixture.tex'), source);
const result = spawnSync('pdflatex', ['-no-shell-escape', '-halt-on-error', '-interaction=nonstopmode', 'fixture.tex'], {cwd: dir, encoding: 'utf8', timeout: 30_000, maxBuffer: 2_000_000});
if (result.error || result.status !== 0) {
  process.stderr.write(result.stdout || '');
  throw result.error || new Error(`Controlled fixture failed: ${result.status}`);
}
const pdf = await readFile(join(dir, 'fixture.pdf'));
if (!pdf.subarray(0, 5).equals(Buffer.from('%PDF-')) || pdf.length < 1000) throw new Error('No valid fixture PDF produced.');
console.log(`Controlled table/bar/line TeX fixture compiled: ${pdf.length} PDF bytes. No user document was executed.`);
