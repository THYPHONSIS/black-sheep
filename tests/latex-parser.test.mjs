import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectLatex} from '../apps/desktop/src/domain/latex.ts';

// Defect: literal examples and escaped control sequences become real topics/formulas.
test('literal environments, inline verb and escaped commands do not create structure', () => {
  const source = String.raw`\title{Sichtbar}
\begin{document}
\begin{verbatim}
\title{Falsch}\section{Falsch}\[fake\]
\end{verbatim}
\begin{verbatim*}
\subsection{Auch falsch}$$fake$$
\end{verbatim*}
\verb|\section{Inline}| \verb* !\section{Stern}!
\\section{Nur Text} \\[kein Display\\]
\section{Echt}
\[a+b\]
\end{document}`;
  const view = inspectLatex(source);
  assert.equal(view.title, 'Sichtbar');
  assert.deepEqual(view.topics.map(topic => topic.label), ['Echt']);
  assert.deepEqual(view.formulas, ['a+b']);
  assert.ok(!view.paragraphs.join(' ').includes('Falsch'));
});

// Defect: a ] protected by braces closes an optional argument too early.
test('nested heading groups and optional short titles retain exact Unicode source ranges', () => {
  const source = String.raw`% Präfix 🐑
\title{Licht \textbf{und {Wellen}}}
\begin{document}
\section [Kurz {x]y}]
 {Licht \emph{und {Materie}} \{A\} 100\%}
\subsection*{Zweiter Abschnitt}
\end{document}`;
  const view = inspectLatex(source);
  assert.equal(view.title, 'Licht und Wellen');
  assert.deepEqual(view.topics.map(topic => [topic.label, topic.level, topic.line]), [
    ['Licht und Materie {A} 100%', 1, 4], ['Zweiter Abschnitt', 2, 6],
  ]);
  const topic = view.topics[0];
  assert.equal(source.slice(topic.start, topic.end), String.raw`\section [Kurz {x]y}]
 {Licht \emph{und {Materie}} \{A\} 100\%}`);
  assert.equal(topic.start, source.indexOf('\\section'));
});

// Defect: a commented separator prevents recognition; macro bodies leak topics.
test('comments between arguments are trivia and macro definitions remain opaque', () => {
  const source = String.raw`\newcommand{\sample}{\section{Makro-Inhalt}}
\def\example{\title{Makro-Titel}\section{Nicht ausgeführt}}
\title% Titelkommentar
 {Richtig}
\begin{document}
\section% Abschnittskommentar
 [kurz]% Zweiter Kommentar
 {Eins \% sichtbar}% \section{Kommentar}
\section{Eins \% sichtbar}
\end{document}`;
  const view = inspectLatex(source);
  assert.equal(view.title, 'Richtig');
  assert.deepEqual(view.topics.map(topic => topic.label), ['Eins % sichtbar', 'Eins % sichtbar']);
  assert.equal(view.topics[0].line, 6);
  assert.notEqual(view.topics[0].id, view.topics[1].id);
});

// Defect: an unfinished group is silently dropped with no useful feedback.
test('incomplete groups preserve complete prefix topics and report the source line', () => {
  const source = '\\begin{document}\n\\section{Fertig}\n\\section{Unvollständig {innen}\n';
  const view = inspectLatex(source);
  assert.deepEqual(view.topics.map(topic => topic.label), ['Fertig']);
  assert.ok(view.warnings.some(warning => /Zeile 3/.test(warning) && /unvollständig/i.test(warning)));
});

// Defect: unclosed literal input exposes following example commands as structure.
test('unterminated literal blocks are opaque and an incomplete inline verb stops at its line', () => {
  const block = inspectLatex(String.raw`\section{Davor}
\begin{verbatim}
\section{Kein Thema}`);
  assert.deepEqual(block.topics.map(topic => topic.label), ['Davor']);
  assert.ok(block.warnings.some(warning => /verbatim/.test(warning)));
  const inline = inspectLatex('\\verb|\\section{Kein Thema}\n\\section{Danach}');
  assert.deepEqual(inline.topics.map(topic => topic.label), ['Danach']);
  assert.ok(inline.warnings.some(warning => /verb/.test(warning)));
});

// Defect: short-title arguments leak nested structure.
test('optional arguments remain opaque, including an unfinished short title', () => {
  const view = inspectLatex(String.raw`\section[Kurz \section{Kein eigenes Thema}]{Echtes Thema}
\section[Unvollständig \section{Auch kein Thema}`);
  assert.deepEqual(view.topics.map(topic => topic.label), ['Echtes Thema']);
  assert.ok(view.warnings.length > 0);
});

// Defect: a malformed verb eats the following line instead of stopping at the newline.
test('a missing verb delimiter preserves the next source line', () => {
  const inline = inspectLatex('\\verb\n\\section{Danach}');
  assert.deepEqual(inline.topics.map(topic => topic.label), ['Danach']);
});

// Defect: repeated malformed groups generate identical React warning keys.
test('diagnostics are bounded and do not repeat the same source-line warning', () => {
  const view = inspectLatex('\\section{{{{{{{{{{{{{{{{');
  assert.equal(new Set(view.warnings).size, view.warnings.length);
  assert.ok(view.warnings.length <= 8);
});

// Existing extraction limits and exact math pairing must survive the parser replacement.
test('display math stays separate from headings and respects the existing extraction bounds', () => {
  const source = String.raw`\begin{document}
\begin{equation*}
\section{Kein Thema} x=2
\end{equation*}
\[a+b\]
$$c+d$$
\section{Danach}
` + Array.from({length: 10}, (_, index) => `\\[x_${index}\\]`).join('\n') + '\n\\end{document}';
  const view = inspectLatex(source);
  assert.deepEqual(view.topics.map(topic => topic.label), ['Danach']);
  assert.deepEqual(view.formulas.slice(0, 3), [String.raw`\section{Kein Thema} x=2`, 'a+b', 'c+d']);
  assert.equal(view.formulas.length, 8);
  assert.ok(view.paragraphs.length <= 8);
});

// Defect: literal braces inside an ordinary group corrupt later brace pairing.
test('literal content is masked inside ordinary groups without hiding following headings', () => {
  const inline = inspectLatex(String.raw`\begin{document}{\verb|{|}\section{Real}\end{document}`);
  assert.deepEqual(inline.topics.map(topic => topic.label), ['Real']);
  assert.deepEqual(inline.warnings, []);
  const block = inspectLatex(String.raw`\begin{document}
{\begin{verbatim}
{
\section{Kein Thema}
\end{verbatim}}
\section{Nach dem Beispiel}
\end{document}`);
  assert.deepEqual(block.topics.map(topic => topic.label), ['Nach dem Beispiel']);
  assert.deepEqual(block.warnings, []);
});

// Defect: preprocessing executes stored verb/verbatim tokens in macro definitions.
test('stored literal tokens in standard definitions do not consume the real document', () => {
  for (const definition of [
    String.raw`\newcommand{\myverb}{\verb}`,
    String.raw`\def\myverb{\verb}`,
    String.raw`\renewcommand*\myverb[1][\section{Default}]{\verb}`,
    String.raw`\newcommand{\myenv}{\begin{verbatim}}`,
    String.raw`\newenvironment{myenv}{\begin{verbatim}}{\end{verbatim}}`,
    String.raw`\NewDocumentCommand{\myenv}{m}{\begin{verbatim}}`,
  ]) {
    const view = inspectLatex(definition + String.raw`\begin{document}\section{Real}\end{document}`);
    assert.deepEqual(view.topics.map(topic => topic.label), ['Real'], definition);
    assert.deepEqual(view.warnings, [], definition);
  }
});

// Defect: a bare CR never ends comments and is omitted from source line counting.
test('CR and CRLF source lines retain comment boundaries and original positions', () => {
  for (const newline of ['\r', '\r\n']) {
    const source = ['\\begin{document}', '% \\section{Kommentar}', '\\section{Real}', '\\end{document}'].join(newline);
    const view = inspectLatex(source);
    assert.deepEqual(view.topics.map(topic => [topic.label, topic.line]), [['Real', 3]]);
    assert.equal(source.slice(view.topics[0].start, view.topics[0].end), '\\section{Real}');
    assert.deepEqual(view.warnings, []);
  }
});

// Defect: one CRLF is split into two blank-line delimiters by regex backtracking.
test('paragraph boundaries are identical for LF, CR and CRLF', () => {
  for (const newline of ['\n', '\r', '\r\n']) {
    const source = ['\\begin{document}', 'Erster Absatz', 'läuft weiter.', '', 'Zweiter Absatz.', '\\end{document}'].join(newline);
    assert.deepEqual(inspectLatex(source).paragraphs, ['Erster Absatz läuft weiter.', 'Zweiter Absatz.'], JSON.stringify(newline));
  }
});

// Defect: horizontal space before verb's star makes the star the delimiter.
test('horizontal space before the verb star keeps its actual delimiter', () => {
  const view = inspectLatex(String.raw`\begin{document}\verb *|{|\section{Real}\end{document}`);
  assert.deepEqual(view.topics.map(topic => topic.label), ['Real']);
  assert.deepEqual(view.warnings, []);
});

// Defect: a legal single-token definition body hides the following real document.
test('command and environment definitions may store a single unbraced body token', () => {
  for (const definition of [
    String.raw`\newcommand\noop\relax`, String.raw`\newcommand{\noop}x`,
    String.raw`\renewcommand\noop\verb`, String.raw`\newenvironment{noop}\relax\relax`,
    String.raw`\NewDocumentCommand\noop{m}\relax`,
  ]) {
    const view = inspectLatex(definition + String.raw`\begin{document}\section{Real}\end{document}`);
    assert.deepEqual(view.topics.map(topic => topic.label), ['Real'], definition);
    assert.deepEqual(view.warnings, [], definition);
  }
});
