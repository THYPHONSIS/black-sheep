export const MAX_DOCUMENT_LENGTH = 200_000;
export type SourceRange = {start: number; end: number; line: number};
export type Topic = SourceRange & {id: string; label: string; level: number};
export type DocumentView = {title: string; topics: Topic[]; formulas: string[]; paragraphs: string[]; warnings: string[]};

type Command = {name: string; start: number; end: number};
type Group = {value: string; end: number};
type Argument = {group?: Group; end: number};

function controlAt(source: string, start: number): Command {
  let end = start + 1;
  if (/[a-zA-Z]/.test(source[end] ?? '')) {
    while (end < source.length && /[a-zA-Z]/.test(source[end]!)) end++;
  } else if (end < source.length) end++;
  return {name: source.slice(start + 1, end), start, end};
}

function whitespaceEnd(source: string, start: number): number {
  while (start < source.length && /\s/.test(source[start]!)) start++;
  return start;
}

function lineEnd(source: string, start: number): number {
  while (start < source.length && source[start] !== '\n' && source[start] !== '\r') start++;
  return start;
}

function triviaEnd(source: string, start: number): number {
  while (start < source.length) {
    const next = whitespaceEnd(source, start);
    if (source[next] !== '%') return next;
    start = lineEnd(source, next);
  }
  return start;
}

// Read stored tokens without giving verb/verbatim (or any other command) meaning.
function rawGroupEnd(source: string, opening: number, close = '}'): number | undefined {
  if (source[opening] !== (close === '}' ? '{' : '[')) return;
  let depth = close === '}' ? 1 : 0;
  for (let cursor = opening + 1; cursor < source.length;) {
    const char = source[cursor];
    if (char === '\\') {cursor = controlAt(source, cursor).end; continue;}
    if (char === '%') {cursor = lineEnd(source, cursor); continue;}
    if (char === '{') depth++;
    else if (char === '}') {
      depth--;
      if (close === '}' && depth === 0) return cursor + 1;
      if (depth < 0) return;
    } else if (char === ']' && close === ']' && depth === 0) return cursor + 1;
    cursor++;
  }
}

function definitionEnd(source: string, command: Command): {end: number; complete: boolean} | undefined {
  const primitive = /^(?:def|gdef|edef|xdef)$/.test(command.name);
  const classicCommand = /^(?:newcommand|renewcommand|providecommand|DeclareRobustCommand)$/.test(command.name);
  const classicEnvironment = /^(?:newenvironment|renewenvironment)$/.test(command.name);
  const documentCommand = /^(?:New|Renew|Provide|Declare)(?:Expandable)?DocumentCommand$/.test(command.name);
  const documentEnvironment = /^(?:New|Renew|Provide|Declare)DocumentEnvironment$/.test(command.name);
  if (!primitive && !classicCommand && !classicEnvironment && !documentCommand && !documentEnvironment) return;
  const incomplete = {end: source.length, complete: false};
  let cursor = triviaEnd(source, command.end);
  if (!primitive && source[cursor] === '*') cursor = triviaEnd(source, cursor + 1);
  if (source[cursor] === '{' && !primitive) {
    const end = rawGroupEnd(source, cursor);
    if (end === undefined) return incomplete;
    cursor = end;
  } else if (source[cursor] === '\\' && !classicEnvironment && !documentEnvironment) cursor = controlAt(source, cursor).end;
  else return incomplete;
  if (primitive) {
    // Parameter text ends at the first unescaped opening brace.
    while (cursor < source.length && source[cursor] !== '{') {
      if (source[cursor] === '\\') cursor = controlAt(source, cursor).end;
      else if (source[cursor] === '%') cursor = lineEnd(source, cursor);
      else cursor++;
    }
  } else if (classicCommand || classicEnvironment) {
    for (let count = 0; count < 2; count++) {
      cursor = triviaEnd(source, cursor);
      if (source[cursor] !== '[') break;
      const end = rawGroupEnd(source, cursor, ']');
      if (end === undefined) return incomplete;
      cursor = end;
    }
  }
  const groups = (classicEnvironment || documentEnvironment ? 2 : 1) + (documentCommand || documentEnvironment ? 1 : 0);
  for (let count = 0; count < groups; count++) {
    cursor = triviaEnd(source, cursor);
    let end = rawGroupEnd(source, cursor);
    if (end === undefined && !primitive && source[cursor] !== '{' && source[cursor] !== '}' && cursor < source.length) {
      end = source[cursor] === '\\' ? controlAt(source, cursor).end : cursor + (source.codePointAt(cursor)! > 0xffff ? 2 : 1);
    }
    if (end === undefined) return incomplete;
    cursor = end;
  }
  return {end: cursor, complete: true};
}

function hide(chars: string[], start: number, end: number): void {
  for (let index = start; index < end; index++) {
    if (chars[index] !== '\n' && chars[index] !== '\r') chars[index] = ' ';
  }
}

function plainText(value: string): string {
  const chars: string[] = [];
  for (let index = 0; index < value.length;) {
    const char = value[index]!;
    if (char === '\\') {
      const command = controlAt(value, index);
      if (/^[%&#_$\{\}]$/.test(command.name)) chars.push(command.name);
      index = command.end;
    } else {
      if (char !== '{' && char !== '}') chars.push(char);
      index++;
    }
  }
  return chars.join('').replace(/\s+/g, ' ').trim();
}

/** Literal structure only: no TeX execution, macro expansion or custom catcodes. */
export function parseDocument(source: string): DocumentView {
  if (source.length > MAX_DOCUMENT_LENGTH) throw new Error('Das Dokument darf höchstens 200.000 Zeichen enthalten.');
  const warnings: string[] = [];
  const lines = [0];
  for (let index = 0; index < source.length; index++) {
    if (source[index] === '\r') {
      if (source[index + 1] === '\n') index++;
      lines.push(index + 1);
    } else if (source[index] === '\n') lines.push(index + 1);
  }
  function lineAt(offset: number): number {
    let low = 0, high = lines.length;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (lines[middle]! <= offset) low = middle; else high = middle;
    }
    return low + 1;
  }
  function warn(message: string, offset: number) {
    const warning = `Zeile ${lineAt(offset)}: ${message}`;
    if (warnings.length < 8 && !warnings.includes(warning)) warnings.push(warning);
  }

  // Mask ignored characters with spaces, retaining original UTF-16 offsets and newlines.
  const chars = source.split('');
  for (let index = 0; index < source.length;) {
    const char = source[index]!;
    if (char === '%') {
      const next = lineEnd(source, index);
      hide(chars, index, next); index = next; continue;
    }
    if (char !== '\\') {index++; continue;}
    const command = controlAt(source, index);
    const definition = definitionEnd(source, command);
    if (definition) {
      if (!definition.complete) warn(`Unvollständige \\${command.name}-Definition; Rest des Dokuments wird ausgelassen.`, index);
      hide(chars, index, definition.end); index = definition.end; continue;
    }
    if (command.name === 'verb') {
      let start = command.end;
      while (source[start] === ' ' || source[start] === '\t') start++;
      if (source[start] === '*') start++;
      while (source[start] === ' ' || source[start] === '\t') start++;
      const delimiter = source[start];
      let end = source[start] === '\n' || source[start] === '\r' ? start : start + 1;
      while (end < source.length && source[end] !== '\n' && source[end] !== '\r' && source[end] !== delimiter) end++;
      const complete = delimiter !== undefined && delimiter !== '\n' && delimiter !== '\r' && source[end] === delimiter;
      if (!complete) warn('Unvollständiger \\verb-Bereich; Rest dieser Zeile wird ausgelassen.', index);
      const next = complete ? end + 1 : Math.min(end, source.length);
      hide(chars, index, next); index = next; continue;
    }
    if (command.name === 'begin') {
      const opening = triviaEnd(source, command.end);
      const literal = /^\{(verbatim\*?)\}/.exec(source.slice(opening, opening + 12));
      if (literal) {
        const marker = `\\end{${literal[1]}}`;
        const ending = source.indexOf(marker, opening + literal[0].length);
        if (ending < 0) warn(`Unvollständiger ${literal[1]}-Bereich; Rest des Dokuments wird ausgelassen.`, index);
        const next = ending < 0 ? source.length : ending + marker.length;
        hide(chars, index, next); index = next; continue;
      }
    }
    index = command.end;
  }
  const clean = chars.join('');

  // One pass pairs braces and collects commands outside argument/definition groups.
  const pairs = new Map<number, number>();
  const stack: number[] = [];
  const commands: Command[] = [];
  for (let index = 0; index < clean.length;) {
    const char = clean[index];
    if (char === '\\') {
      const command = controlAt(clean, index);
      if (stack.length === 0) commands.push(command);
      index = command.end; continue;
    }
    if (char === '{') stack.push(index);
    else if (char === '}') {
      const opening = stack.pop();
      if (opening === undefined) warn('Schließende Klammer ohne öffnende Klammer.', index);
      else pairs.set(opening, index);
    } else if (char === '$' && clean[index + 1] === '$' && stack.length === 0) {
      commands.push({name: '$$', start: index, end: index + 2}); index += 2; continue;
    }
    index++;
  }
  for (const opening of stack.slice(0, 8)) warn('Unvollständige Gruppe.', opening);
  function groupAt(opening: number): Group | undefined {
    if (clean[opening] !== '{') return;
    const closing = pairs.get(opening);
    if (closing !== undefined) return {value: clean.slice(opening + 1, closing), end: closing + 1};
  }
  function argument(command: Command, heading = false): Argument {
    let opening = whitespaceEnd(clean, command.end);
    if (heading && clean[opening] === '*') opening = whitespaceEnd(clean, opening + 1);
    if (heading && clean[opening] === '[') {
      opening++;
      while (opening < clean.length && clean[opening] !== ']') {
        if (clean[opening] === '\\') opening = controlAt(clean, opening).end;
        else if (clean[opening] === '{') {
          const group = groupAt(opening);
          if (!group) return {end: clean.length};
          opening = group.end;
        } else opening++;
      }
      if (opening === clean.length) return {end: clean.length};
      opening = whitespaceEnd(clean, opening + 1);
    }
    const group = groupAt(opening);
    return {group, end: group?.end ?? (clean[opening] === '{' ? clean.length : opening)};
  }

  const topics: Topic[] = [];
  const formulas: string[] = [];
  const mathRanges: Array<{start: number; end: number}> = [];
  let title = '';
  let begin = -1, end = -1;
  let math: {kind: string; start: number; content: number} | undefined;
  let consumedUntil = 0;
  for (const command of commands) {
    if (command.start < consumedUntil) continue;
    const group = command.name === 'begin' || command.name === 'end' ? argument(command).group : undefined;
    const environment = group?.value.trim();
    const mathEnd = command.name === ']' ? '[' : command.name === '$$' ? '$$' : command.name === 'end' ? environment : undefined;
    if (math) {
      if (mathEnd === math.kind) {
        if (formulas.length < 8) formulas.push(clean.slice(math.content, command.start).trim().slice(0, 1200));
        mathRanges.push({start: math.start, end: group?.end ?? command.end}); math = undefined;
      }
      continue;
    }
    if (command.name === '[' || command.name === '$$' || command.name === 'begin' && /^equation\*?$/.test(environment ?? '')) {
      math = {kind: environment ?? command.name, start: command.start, content: group?.end ?? command.end}; continue;
    }
    if (command.name === 'begin' && environment === 'document' && begin < 0) begin = group!.end;
    if (command.name === 'end' && environment === 'document' && end < 0) end = command.start;
    const level = ['section', 'subsection', 'subsubsection'].indexOf(command.name) + 1;
    if (command.name !== 'title' && level === 0) continue;
    const parsed = argument(command, level > 0);
    consumedUntil = parsed.end;
    const heading = parsed.group;
    if (!heading) {warn(`Unvollständiges Argument für \\${command.name}.`, command.start); continue;}
    const label = plainText(heading.value);
    if (command.name === 'title') {if (!title) title = label.slice(0, 240);}
    else if (label && topics.length < 30) topics.push({id: `topic-${command.start}`, label: label.slice(0, 180), level, line: lineAt(command.start), start: command.start, end: heading.end});
  }
  if (math) {warn('Unvollständiger Formelbereich.', math.start); mathRanges.push({start: math.start, end: clean.length});}
  for (const range of mathRanges) hide(chars, range.start, range.end);
  const visible = chars.join('');
  const body = begin >= 0 ? visible.slice(begin, end >= begin ? end : undefined) : visible;
  const paragraphs = body.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(plainText).filter(Boolean).slice(0, 8).map(value => value.slice(0, 1600));
  if (begin < 0 || end < begin) warn('Für Einfügungen werden \\begin{document} und \\end{document} benötigt.', 0);
  return {title: title || 'Unbenanntes Dokument', topics, formulas, paragraphs, warnings};
}
