import {MAX_DOCUMENT_LENGTH, parseDocument} from './latexParser.ts';
import type {DocumentView} from './latexParser.ts';
export {MAX_DOCUMENT_LENGTH};
export type {Topic, SourceRange, DocumentView} from './latexParser.ts';
export type Transformation = { source: string; error?: string };
export type LatexBlock = { body: string; packages?: string[]; preamble?: string[] };

function checkLength(source: string) {
  if (source.length > MAX_DOCUMENT_LENGTH) throw new Error('Das Dokument darf höchstens 200.000 Zeichen enthalten.');
}

// Keep offsets and line numbers intact. Escaped percent signs are document text.
function withoutComments(source: string): string {
  return source.split('\n').map(line => {
    for (let i = 0; i < line.length; i++) {
      if (line[i] !== '%') continue;
      let slashes = 0;
      for (let j = i - 1; j >= 0 && line[j] === '\\'; j--) slashes++;
      if (slashes % 2 === 0) return line.slice(0, i) + ' '.repeat(line.length - i);
    }
    return line;
  }).join('\n');
}

export function inspectLatex(source: string): DocumentView {
  return parseDocument(source);
}

export function applyLatexBlock(source: string, block: LatexBlock): Transformation {
  try { checkLength(source); } catch (error) { return { source, error: String(error) }; }
  const clean = withoutComments(source);
  const begins = [...clean.matchAll(/\\begin\{document\}/g)];
  const ends = [...clean.matchAll(/\\end\{document\}/g)];
  if (begins.length !== 1 || ends.length !== 1 || begins[0]!.index >= ends[0]!.index) {
    return { source, error: 'Bitte genau einen vollständigen Dokumentbereich mit \\begin{document} und \\end{document} verwenden.' };
  }
  const packages = new Set([...clean.matchAll(/\\usepackage\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g)].flatMap(m => m[1]!.split(',').map(p => p.trim())));
  const missing: string[] = [];
  for (const name of block.packages ?? []) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) return { source, error: 'Ungültiger Paketname.' };
    if (!packages.has(name)) { missing.push(`\\usepackage{${name}}\n`); packages.add(name); }
  }
  const beginIndex = begins[0]!.index;
  const endIndex = ends[0]!.index;
  const preamble = (block.preamble ?? []).filter(line => !clean.slice(0, beginIndex).includes(line)).map(line => `${line}\n`).join('');
  const result = source.slice(0, beginIndex) + missing.join('') + preamble + source.slice(beginIndex, endIndex) + '\n' + block.body + '\n\n' + source.slice(endIndex);
  if (result.length > MAX_DOCUMENT_LENGTH) return { source, error: 'Die Einfügung würde das Dokumentlimit überschreiten.' };
  return { source: result };
}

export function buildLatexTable(rows: number, columns: number): LatexBlock {
  if (![rows, columns].every(n => Number.isInteger(n) && n >= 1 && n <= 8)) throw new Error('Tabellen benötigen 1 bis 8 Zeilen und Spalten.');
  const cells = Array.from({length: rows}, (_, r) => Array.from({length: columns}, (_, c) => `Zelle ${r + 1}.${c + 1}`).join(' & ') + ' \\\\').join('\n');
  return { body: `\\begin{table}[ht]\n\\centering\n\\begin{tabular}{${'l'.repeat(columns)}}\n\\hline\n${cells}\n\\hline\n\\end{tabular}\n\\caption{Meine Tabelle}\n\\end{table}` };
}

export function buildLatexChart(kind: 'bar' | 'line', data: string): LatexBlock {
  if (kind !== 'bar' && kind !== 'line') throw new Error('Unbekannter Diagrammtyp.');
  if (data.length > 10_000) throw new Error('Die Datentabelle ist zu groß.');
  const lines = data.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.shift() !== 'Label;Wert' || lines.length < 1 || lines.length > 12) throw new Error('Header Label;Wert und 1 bis 12 Datenzeilen verwenden.');
  const rows = lines.map(line => {
    const cells = line.split(';');
    const label = cells[0]?.trim() ?? '';
    const input = cells[1]?.trim() ?? '';
    if (cells.length !== 2 || !/^[\p{L}\p{N} .,:()\-]{1,50}$/u.test(label) || !/^[+-]?\d+(?:[.,]\d+)?$/.test(input)) throw new Error('Labels dürfen keine TeX-Steuerzeichen enthalten; Werte müssen Zahlen sein.');
    const value = Number(input.replace(',', '.'));
    if (!Number.isFinite(value) || Math.abs(value) > 1_000_000_000) throw new Error('Diagrammwerte müssen zwischen -1 und +1 Milliarde liegen.');
    return {label, value};
  });
  const coordinates = rows.map((row, i) => `(${i + 1},${row.value})`).join(' ');
  const labels = rows.map(row => `{${row.label}}`).join(',');
  return { packages: ['pgfplots'], body: `\\begin{figure}[ht]\n\\centering\n\\pgfplotsset{compat=1.18}\n\\begin{tikzpicture}\n\\begin{axis}[${kind === 'bar' ? 'ybar,' : ''}width=0.85\\linewidth,xtick={${rows.map((_, i) => i + 1).join(',')}},xticklabels={${labels}},ylabel={Wert},grid=major]\n\\addplot coordinates {${coordinates}};\n\\end{axis}\n\\end{tikzpicture}\n\\caption{Mein Diagramm}\n\\end{figure}` };
}
