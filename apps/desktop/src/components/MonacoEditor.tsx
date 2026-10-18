import { useEffect, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker&inline';
import { MAX_DOCUMENT_LENGTH } from '../domain/latex';

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };

type Props = {value: string; onChange: (value: string) => void; onError: (message: string) => void; navigation?: {line: number}; readOnly: boolean};

export default function MonacoEditor({value, onChange, onError, navigation, readOnly}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<editor.IStandaloneCodeEditor | null>(null);
  const handlers = useRef({onChange, onError});
  handlers.current = {onChange, onError};
  const initial = useRef(value);
  initial.current = value;
  const locked = useRef(readOnly);
  locked.current = readOnly;
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let disposed = false;
    let change: {dispose: () => void} | undefined;
    import('monaco-editor/editor/editor.api.js').then(monaco => {
      if (disposed || !container.current) return;
      if (!monaco.languages.getLanguages().some(language => language.id === 'latex')) {
        monaco.languages.register({id: 'latex'});
        monaco.languages.setMonarchTokensProvider('latex', {tokenizer: {root: [[/%.*$/, 'comment'], [/\\[a-zA-Z]+\*?/, 'keyword'], [/[{}\[\]]/, 'delimiter.bracket'], [/\$[^$]*\$/, 'string']]}});
      }
      monaco.editor.defineTheme('black-sheep', {base: 'vs-dark', inherit: true, rules: [{token: 'keyword', foreground: '8dcdbd'}, {token: 'comment', foreground: '6b778b'}], colors: {'editor.background': '#0c1017', 'editorLineNumber.foreground': '#586378', 'editor.selectionBackground': '#31493f'}});
      const view = monaco.editor.create(container.current, {value: initial.current, readOnly: locked.current, language: 'latex', theme: 'black-sheep', automaticLayout: true, minimap: {enabled: false}, fontSize: 13, lineHeight: 23, wordWrap: 'on', scrollBeyondLastLine: false, padding: {top: 18, bottom: 18}, ariaLabel: 'LaTeX-Quelltext', tabSize: 2, insertSpaces: true});
      instance.current = view;
      let lastAccepted = initial.current;
      let restoring = false;
      change = view.onDidChangeModelContent(() => {
        if (restoring) return;
        const next = view.getValue();
        if (next.length > MAX_DOCUMENT_LENGTH) {
          restoring = true;
          view.setValue(lastAccepted);
          restoring = false;
          handlers.current.onError('Das Dokumentlimit von 200.000 Zeichen wurde erreicht.');
          return;
        }
        lastAccepted = next;
        handlers.current.onChange(next);
      });
    }).catch(() => { if (!disposed) setFallback(true); });
    return () => { disposed = true; change?.dispose(); instance.current?.dispose(); instance.current = null; };
  }, []);

  useEffect(() => {
    const view = instance.current;
    if (view && view.getValue() !== value) view.setValue(value);
  }, [value]);

  useEffect(() => {instance.current?.updateOptions({readOnly});}, [readOnly]);

  useEffect(() => {
    if (navigation && instance.current) {
      instance.current.revealLineInCenter(navigation.line);
      instance.current.setPosition({lineNumber: navigation.line, column: 1});
      instance.current.focus();
    }
  }, [navigation]);

  return fallback
    ? <textarea className="fallback-editor" aria-label="LaTeX-Quelltext" value={value} readOnly={readOnly} maxLength={MAX_DOCUMENT_LENGTH} spellCheck={false} onChange={event => onChange(event.target.value)} />
    : <div ref={container} className="monaco-host" />;
}
