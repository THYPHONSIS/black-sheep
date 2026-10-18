import {useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../src/App';
import {NativeDocumentSession} from '../src/domain/nativeSession';
import type {NativeFileService} from '../src/domain/nativeFiles';
import '../src/styles/app.css';

// Development-only UI harness. Production builds use index.html and real Tauri ports.
const originalPath = 'C:\\Tests\\Versuch.tex';
const originalSource = String.raw`\documentclass{article}
\title{Native Dateiprüfung}
\begin{document}
\section{Dateischutz}
Ein kontrollierter lokaler Test.
\end{document}`;

function Harness() {
  const [pending, setPending] = useState<'open'|'save'|null>(null);
  const resolveDialog = useRef<((path: string|null) => void)|null>(null);
  const [savePath, setSavePath] = useState('C:\\Tests\\Umbenannt.tex');
  const [writes, setWrites] = useState(0);
  const [failWrite, setFailWrite] = useState(false);
  const fail = useRef(false);
  fail.current = failWrite;
  const disk = useRef(new Map([[originalPath, originalSource]]));
  const service = useMemo<NativeFileService>(() => {
    function choose(kind: 'open'|'save'): Promise<string|null> {
      setPending(kind);
      return new Promise(resolve => {resolveDialog.current = resolve;});
    }
    const session = new NativeDocumentSession({
      pickOpen: () => choose('open'),
      pickSave: () => choose('save'),
      stat: async path => ({size: new TextEncoder().encode(disk.current.get(path) || '').length, isFile: disk.current.has(path)}),
      readText: async path => {const source = disk.current.get(path); if (source === undefined) throw Error('Testdatei fehlt.'); return source;},
      writeText: async (path, source) => {if (fail.current) throw Error('Simulierter Schreibfehler.'); disk.current.set(path, source); setWrites(value => value + 1);},
    });
    return {isDesktop: () => true, openNativeTex: () => session.open(), saveNativeTex: (source, name) => session.saveAs(source, name), clearNativeDocument: () => session.clear()};
  }, []);

  function finish(path: string|null) {
    const done = resolveDialog.current;
    resolveDialog.current = null;
    setPending(null);
    done?.(path);
  }
  return <>
    <aside aria-label="Teststeuerung" style={{padding: 16, background: '#dae6df', color: '#111', position: 'sticky', top: 0, zIndex: 1000}}>
      <strong>Integrationsprüfung · simulierte Dateidialoge und Datenträger</strong>
      <p role="status">{pending ? `${pending === 'open' ? 'Öffnen' : 'Speichern'}-Dialog wartet` : 'Kein Dialog offen'}</p>
      <label>Speicherziel <input aria-label="Speicherziel" value={savePath} onChange={event => setSavePath(event.target.value)} /></label>
      <label><input type="checkbox" checked={failWrite} onChange={event => setFailWrite(event.target.checked)} /> Schreibfehler simulieren</label>
      <button disabled={!pending} onClick={() => finish(pending === 'open' ? originalPath : savePath)}>Dateidialog bestätigen</button>
      <button disabled={!pending} onClick={() => finish(null)}>Dateidialog abbrechen</button>
      <button onClick={() => disk.current.set(savePath, 'Extern veränderte Datei')}>Externe Datei ändern</button>
      <output aria-label="Schreibvorgänge">{writes} Schreibvorgänge</output>
    </aside>
    <App files={service} />
  </>;
}

const root = document.getElementById('test-root');
if (!root) throw Error('Harness root missing');
createRoot(root).render(<Harness />);
