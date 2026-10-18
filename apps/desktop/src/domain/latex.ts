export const MAX_DOCUMENT_LENGTH = 200_000;
export type Topic = { id: string; label: string; level: number; line: number };
export type DocumentView = { title: string; topics: Topic[]; formulas: string[]; paragraphs: string[]; warnings: string[] };
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

function groupAt(source: string, opening: number): string {
  let depth = 1;
  for (let i = opening + 1; i < source.length; i++) {
    if (source[i] === '\\') { i++; continue; }
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(opening + 1, i);
    }
  }
  return '';
}

function plainText(value: string): string {
  return value.replace(/\\([%&#_$])/g, '$1')
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, '')
    .replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

export function inspectLatex(source: string): DocumentView {
  checkLength(source);
  const clean = withoutComments(source);
  const titleMatch = /\\title\s*\{/g.exec(clean);
  const topics: Topic[] = [];
  const section = /\\(section|subsection|subsubsection)\*?\s*(?:\[[^\]\n]*\])?\s*\{/g;
  for (const match of clean.matchAll(section)) {
    if (topics.length === 30) break;
    const label = plainText(groupAt(clean, match.index + match[0].length - 1)).slice(0, 180);
    if (!label) continue;
    topics.push({ id: `topic-${match.index}`, label, level: ['section', 'subsection', 'subsubsection'].indexOf(match[1]!) + 1, line: clean.slice(0, match.index).split('\n').length });
  }
  const formulas = [...clean.matchAll(/\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g)]
    .slice(0, 8).map(m => (m[1] ?? m[2] ?? m[3] ?? '').trim().slice(0, 1200));
  const begin = clean.indexOf('\\begin{document}');
  const end = clean.indexOf('\\end{document}', begin + 1);
  const body = begin >= 0 ? clean.slice(begin + 16, end >= 0 ? end : undefined) : clean;
  const paragraphs = body.replace(/\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$/g, '')
    .split(/\n\s*\n/).map(plainText).filter(Boolean).slice(0, 8).map(p => p.slice(0, 1600));
  return {
    title: titleMatch ? plainText(groupAt(clean, titleMatch.index + titleMatch[0].length - 1)) || 'Unbenanntes Dokument' : 'Unbenanntes Dokument',
    topics, formulas, paragraphs,
    warnings: begin < 0 || end < begin ? ['Für Einfügungen werden \\begin{document} und \\end{document} benötigt.'] : [],
  };
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
