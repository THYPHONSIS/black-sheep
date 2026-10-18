import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectLatex, applyLatexBlock, buildLatexTable, buildLatexChart } from '../apps/desktop/src/domain/latex.ts';

const document = String.raw`\documentclass{article}
\title{Optik}
\begin{document}
\section{Licht}
Ein sichtbarer Absatz.
\[ E = mc^2 \]
\end{document}`;

test('document topics follow real section commands, not commented commands', () => {
  const view = inspectLatex(document + '\n% \\section{Versteckt}');
  assert.equal(view.title, 'Optik');
  assert.deepEqual(view.topics.map(t => t.label), ['Licht']);
  assert.equal(view.topics[0].line, 4);
  assert.deepEqual(view.formulas, ['E = mc^2']);
  assert.ok(view.paragraphs.some(p => p.includes('sichtbarer Absatz')));
});

test('insertion happens before end of document and packages are added once', () => {
  const block = { body: String.raw`\[x=1\]`, packages: ['amsmath'] };
  const once = applyLatexBlock(document, block);
  assert.equal(once.error, undefined);
  assert.ok(once.source.indexOf(block.body) < once.source.lastIndexOf(String.raw`\end{document}`));
  const twice = applyLatexBlock(once.source, block);
  assert.equal((twice.source.match(/\\usepackage\{amsmath\}/g) || []).length, 1);
});

test('malformed documents remain byte-identical when insertion is rejected', () => {
  const source = '% \\begin{document}\nnot a complete document';
  const result = applyLatexBlock(source, { body: 'TEXT' });
  assert.equal(result.source, source);
  assert.ok(result.error);
});

test('layout configuration belongs in the preamble and is not duplicated', () => {
  const block = {body: '', packages: ['geometry'], preamble: [String.raw`\geometry{a4paper,margin=25mm}`]};
  const once = applyLatexBlock(document, block);
  assert.ok(once.source.indexOf(block.preamble[0]) >= 0);
  assert.ok(once.source.indexOf(block.preamble[0]) < once.source.indexOf(String.raw`\begin{document}`));
  const twice = applyLatexBlock(once.source, block);
  assert.equal(twice.source.split(block.preamble[0]).length, 2);
});

test('table dimensions determine visible cells; invalid dimensions are rejected', () => {
  const table = buildLatexTable(2, 3);
  assert.ok(table.body.includes(String.raw`\begin{tabular}{lll}`));
  assert.equal((table.body.match(/ & /g) || []).length, 4);
  for (const args of [[0, 2], [2, 9], [1.5, 2]]) assert.throws(() => buildLatexTable(...args));
});

test('bar and line charts retain decimal-comma values and reject TeX payloads', () => {
  const bar = buildLatexChart('bar', 'Label;Wert\nJanuar;1,5\nFebruar;2');
  assert.ok(bar.body.includes('ybar'));
  assert.ok(bar.body.includes('(1,1.5)'));
  assert.ok(bar.body.includes('Januar'));
  assert.ok(bar.packages.includes('pgfplots'));
  assert.ok(!buildLatexChart('line', 'Label;Wert\nA;2').body.includes('ybar'));
  for (const data of ['x;y\nA;1', 'Label;Wert\n\\input{secret};1', 'Label;Wert\nA;NaN', 'Label;Wert\nA;1;2']) {
    assert.throws(() => buildLatexChart('bar', data));
  }
});

test('structure limits avoid runaway documents and preserve escaped percent signs', () => {
  const source = document.replace('Licht', String.raw`100\% Licht`) + '\n' + Array.from({length: 35}, (_, i) => String.raw`\section{Thema ${i}}`).join('\n');
  const view = inspectLatex(source);
  assert.equal(view.topics.length, 30);
  assert.equal(view.topics[0].label, '100% Licht');
  assert.throws(() => inspectLatex('x'.repeat(200_001)));
});
