import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { applyLatexBlock, buildLatexChart, buildLatexTable, inspectLatex, MAX_DOCUMENT_LENGTH } from './domain/latex';
import type { LatexBlock, Topic } from './domain/latex';
import { INITIAL_DOCUMENT } from './domain/document';
import { readResearchConsent, storeResearchConsent } from './domain/consent';
import { fetchResearch } from './domain/researchClient';
import type { ResearchItem } from './domain/research';
import * as nativeFiles from './domain/nativeFiles';
import type { NativeFileService } from './domain/nativeFiles';
import TablePicker from './components/TablePicker';

const MonacoEditor = lazy(() => import('./components/MonacoEditor'));
const tabs = ['Start', 'Einfügen', 'Daten', 'Layout'] as const;
const snippet = {
  section: {body: String.raw`\section{Neuer Abschnitt}
Hier beginnt dein Text.`},
  subsection: {body: String.raw`\subsection{Neuer Unterabschnitt}
Hier beginnt dein Text.`},
  formula: {body: String.raw`\[
  a^2 + b^2 = c^2
\]`, packages: ['amsmath']},
  list: {body: String.raw`\begin{itemize}
  \item Erster Punkt
  \item Zweiter Punkt
\end{itemize}`},
  page: {body: String.raw`\newpage`},
  margins: {body: '', packages: ['geometry'], preamble: [String.raw`\geometry{a4paper,margin=25mm}`]},
  header: {body: '', packages: ['fancyhdr'], preamble: [String.raw`\pagestyle{fancy}`, String.raw`\fancyhead[L]{Mein Dokument}`, String.raw`\fancyhead[R]{\thepage}`]},
} satisfies Record<string, LatexBlock>;

export default function App({files = nativeFiles}: {files?: NativeFileService} = {}) {
  const [source, setSource] = useState(INITIAL_DOCUMENT);
  const [savedSource, setSavedSource] = useState(INITIAL_DOCUMENT);
  const [fileName, setFileName] = useState('licht-und-interferenz.tex');
  const [nativeRevision, setNativeRevision] = useState<number>();
  const [fileBusy, setFileBusy] = useState(false);
  const [tab, setTab] = useState<typeof tabs[number]>('Start');
  const [tableOpen, setTableOpen] = useState(false);
  const [chartData, setChartData] = useState('Label;Wert\nMessung A;1,5\nMessung B;2,8\nMessung C;2,1');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Dein Dokument bleibt lokal.');
  const [navigation, setNavigation] = useState<{line: number}>();
  const [simpleEditor, setSimpleEditor] = useState(import.meta.env.MODE === 'standalone');
  const [consent, setConsent] = useState(readResearchConsent);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [research, setResearch] = useState<Record<string, ResearchItem[]>>({});
  const [researchErrors, setResearchErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState('');
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const plainEditor = useRef<HTMLTextAreaElement>(null);
  const privacyDialog = useRef<HTMLDialogElement>(null);
  const dirty = source !== savedSource;
  const view = useMemo(() => inspectLatex(source), [source]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty) {event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {if (privacyOpen && privacyDialog.current && !privacyDialog.current.open) privacyDialog.current.showModal();}, [privacyOpen]);

  function closePrivacy() {privacyDialog.current?.close(); setPrivacyOpen(false);}

  function navigateTo(line: number) {
    setNavigation({line});
    const editor = plainEditor.current;
    if (editor) {
      const offset = source.split('\n').slice(0, line - 1).reduce((length, text) => length + text.length + 1, 0);
      editor.focus();
      editor.setSelectionRange(offset, offset);
      editor.scrollTop = Math.max(0, (line - 4) * 23);
    }
  }

  function change(next: string) {
    if (next.length > MAX_DOCUMENT_LENGTH) {setError('Das Dokumentlimit von 200.000 Zeichen wurde erreicht.'); return;}
    setSource(next);
    setError('');
  }

  function insert(block: LatexBlock) {
    const result = applyLatexBlock(source, block);
    if (result.error) {setError(result.error); return;}
    change(result.source);
    setMessage('Baustein im Dokument ergänzt.');
    setTableOpen(false);
  }

  function insertChart(kind: 'bar' | 'line') {
    try {insert(buildLatexChart(kind, chartData));} catch (cause) {setError(cause instanceof Error ? cause.message : String(cause));}
  }

  function canReplace() { return !dirty || window.confirm('Dein Entwurf ist geändert. Hast du ihn exportiert? Aktuellen Entwurf ersetzen?'); }

  async function openFile() {
    if (fileBusy) return;
    if (!canReplace()) return;
    if (!files.isDesktop()) {input.current?.click(); return;}
    setError('');
    setFileBusy(true);
    try {
      const document = await files.openNativeTex();
      if (document) loadDocument(document.source, document.name, document.revision);
      else setMessage('Öffnen abgebrochen. Das aktuelle Dokument bleibt geöffnet.');
    } catch (cause) {setError(cause instanceof Error ? cause.message : String(cause));}
    finally {setFileBusy(false);}
  }

  function loadDocument(value: string, name: string, revision?: number) {
    if (value.length > MAX_DOCUMENT_LENGTH) {setError('Die Datei überschreitet 200.000 Zeichen.'); return;}
    if (revision === undefined) files.clearNativeDocument();
    controller.current?.abort();
    setNativeRevision(revision);
    setSource(value); setSavedSource(value); setFileName(name); setResearch({}); setResearchErrors({}); setLoading(''); setError('');
    setMessage('Datei geöffnet. Änderungen werden erst auf deinen Befehl gespeichert.');
  }

  async function exportFile() {
    if (fileBusy) return;
    setError('');
    setFileBusy(true);
    try {
      if (files.isDesktop()) {
        const saved = await files.saveNativeTex(source, fileName);
        if (saved) {setSavedSource(source); setFileName(saved.name); setNativeRevision(saved.revision); setMessage('LaTeX-Datei am ausgewählten Ort gespeichert.');}
        else setMessage('Speichern abgebrochen. Dein Entwurf bleibt geöffnet.');
        return;
      }
      const url = URL.createObjectURL(new Blob([source], {type: 'application/x-tex;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url; link.download = fileName.replace(/[^\p{L}\p{N}._ -]/gu, '_');
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage('Export angefordert. Bitte den Browserdownload prüfen; es gibt kein stilles Autosave.');
    } catch (cause) {setError(cause instanceof Error ? cause.message : String(cause));}
    finally {setFileBusy(false);}
  }

  function updateConsent(enabled: boolean) {
    setConsent(enabled); storeResearchConsent(enabled);
    if (!enabled) {controller.current?.abort(); setLoading(''); setResearch({}); setResearchErrors({});}
  }

  async function findResearch(topic: Topic) {
    if (!consent || loading) return;
    const key = `${topic.id}:${topic.label}`;
    const request = new AbortController();
    controller.current?.abort(); controller.current = request;
    setLoading(key); setResearchErrors(previous => ({...previous, [key]: ''}));
    try {
      const items = await fetchResearch(topic.label, {consent, signal: request.signal});
      if (!request.signal.aborted) setResearch(previous => ({...previous, [key]: items}));
    } catch (cause) {
      if (!request.signal.aborted) setResearchErrors(previous => ({...previous, [key]: cause instanceof Error ? cause.message : 'Recherche fehlgeschlagen. Bitte erneut versuchen.'}));
    } finally {if (controller.current === request) setLoading('');}
  }

  const sourceInput = <textarea ref={plainEditor} aria-label="LaTeX-Quelltext" className="fallback-editor" value={source} readOnly={fileBusy} maxLength={MAX_DOCUMENT_LENGTH} spellCheck={false} onChange={event => change(event.target.value)} />;

  return <div className="app-shell">
    <header className="app-header">
      <div className="local-badge"><span className="signal" /> Lokales LaTeX-Studio</div>
      <div className="title-lockup"><span className="sheep-mark" aria-hidden="true">◒</span><h1>Black sheep</h1><span className="subtitle">Deine Gedanken. In guter Form.</span></div>
      <button className="quiet-button privacy-button" onClick={() => setPrivacyOpen(true)}>Datenschutz <span aria-hidden="true">↗</span></button>
    </header>

    <nav className="ribbon-tabs" aria-label="Werkzeugseiten">{tabs.map(name => <button key={name} className={tab === name ? 'tab active' : 'tab'} aria-pressed={tab === name} onClick={() => {setTab(name); setTableOpen(false);}}>{name}</button>)}<span className="ribbon-hint">LAΤEX · OFFLINE BEREIT</span></nav>
    <section className="ribbon" aria-label={`${tab}-Werkzeuge`} inert={fileBusy} aria-busy={fileBusy}>
      {tab === 'Start' && <><button onClick={() => {if (canReplace()) loadDocument(INITIAL_DOCUMENT, 'licht-und-interferenz.tex');}}>Neues Dokument</button><button onClick={() => void openFile()}>.tex öffnen</button><button className="accent-button" onClick={() => void exportFile()}>.tex exportieren <span aria-hidden="true">↓</span></button><span className="tool-separator" /><button onClick={() => insert(snippet.section)}>Abschnitt</button><button onClick={() => insert(snippet.formula)}>Formel</button></>}
      {tab === 'Einfügen' && <><button onClick={() => insert(snippet.section)}>Abschnitt</button><button onClick={() => insert(snippet.subsection)}>Unterabschnitt</button><button onClick={() => insert(snippet.formula)}>Formel</button><button onClick={() => insert(snippet.list)}>Aufzählung</button><div className="table-anchor"><button aria-expanded={tableOpen} onClick={() => setTableOpen(value => !value)}>Tabelle <span aria-hidden="true">▾</span></button>{tableOpen && <TablePicker onSelect={(rows, columns) => insert(buildLatexTable(rows, columns))} />}</div><button onClick={() => insert(snippet.page)}>Seitenumbruch</button></>}
      {tab === 'Daten' && <><label className="data-label" htmlFor="chart-data">Diagrammdaten <small>Label;Wert · bis zu 12 Zeilen</small></label><textarea id="chart-data" aria-label="Diagrammdaten" className="chart-input" value={chartData} maxLength={10_000} onChange={event => setChartData(event.target.value)} /><button onClick={() => insertChart('bar')}>Säulendiagramm einfügen</button><button onClick={() => insertChart('line')}>Liniendiagramm einfügen</button><small className="tool-note">Erzeugt bearbeitbaren pgfplots-Quelltext.</small></>}
      {tab === 'Layout' && <><button onClick={() => insert(snippet.margins)}>A4 · Ränder 25 mm</button><button onClick={() => insert(snippet.header)}>Kopf- und Fußzeile</button><button onClick={() => insert(snippet.page)}>Neue Seite</button><small className="tool-note">Pakete werden ergänzt. Dein Quelltext bleibt editierbar.</small></>}
    </section>
    <input ref={input} type="file" accept=".tex,text/x-tex,application/x-tex" hidden onChange={async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      if (!/\.tex$/i.test(file.name) || file.size > MAX_DOCUMENT_LENGTH * 4) {setError('Bitte eine .tex-Datei mit höchstens 200.000 Zeichen wählen.'); return;}
      setFileBusy(true);
      try {loadDocument(await file.text(), file.name);} catch {setError('Die Datei konnte nicht gelesen werden.');}
      finally {setFileBusy(false);}
    }} />

    <div className="status-line" role="status"><span className="file-name">{fileName} {nativeRevision !== undefined && <span className="muted"> · Stand {nativeRevision} dieser Sitzung</span>} {dirty && <span className="dirty-dot" aria-label="Ungespeicherte Änderungen">●</span>}</span><span>{error || (fileBusy ? 'Dateiaktion läuft …' : message)}</span><span>{source.length.toLocaleString('de-DE')} Zeichen</span></div>
    {error && <div role="alert" className="error-banner">{error}<button aria-label="Fehlermeldung schließen" onClick={() => setError('')}>×</button></div>}

    <main>
      <div className="studio-grid">
        <section className="panel document-panel" aria-label="Dokumentansicht">
          <div className="panel-heading"><h2>Dokument</h2><span className="small-tag">Strukturansicht</span></div>
          <div className="paper-scroll"><article className="document-paper"><span className="paper-eyebrow">DEIN DOKUMENT</span><h2>{view.title}</h2>{view.topics.length > 0 && <nav aria-label="Dokumentgliederung" className="document-outline">{view.topics.map((topic, index) => <button key={topic.id} className={`outline-level-${topic.level}`} onClick={() => navigateTo(topic.line)}><span>{index + 1 < 10 ? '0' : ''}{index + 1}</span>{topic.label}<span aria-hidden="true">↗</span></button>)}</nav>}{view.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{view.formulas.length > 0 && <div className="formula-section"><span>FORMELN IM DOKUMENT</span>{view.formulas.map((formula, index) => <pre key={index}>{formula}</pre>)}</div>}{view.warnings.map(warning => <p className="document-warning" key={warning}>{warning}</p>)}</article></div>
          <p className="panel-footnote">Lokale Strukturansicht · kein gesetztes PDF. Tabellen und Diagramme erscheinen nach einem TeX-Lauf.</p>
        </section>
        <section className="panel editor-panel" aria-label="Quelltext-Editor">
          <div className="panel-heading"><h2>LaTeX-Quelltext</h2><label className="editor-toggle"><input type="checkbox" checked={simpleEditor} onChange={event => setSimpleEditor(event.target.checked)} /> Einfacher Editor</label></div>
          <div className="editor-body">{simpleEditor ? sourceInput : <Suspense fallback={<div className="editor-loading">Editor wird lokal geladen …</div>}><MonacoEditor value={source} onChange={change} onError={setError} navigation={navigation} readOnly={fileBusy} /></Suspense>}</div>
          <div className="editor-footer"><span>LaTeX · UTF-8</span><span>Keine automatische Ausführung</span></div>
        </section>
      </div>

      <section className="synapse-section" aria-labelledby="synapse-title">
        <div className="synapse-heading"><div><p className="eyebrow">DEIN WISSEN, VERBUNDEN</p><h2 id="synapse-title">Synapse <span>{view.topics.length} Themen</span></h2><p>Die Themen folgen deiner Gliederung. Verbinde sie bei Bedarf mit Forschung.</p></div><label className="consent-toggle"><input type="checkbox" checked={consent} onChange={event => updateConsent(event.target.checked)} /><span className="switch-track" aria-hidden="true" /><span>Forschungssuche {consent ? 'an' : 'aus'}</span></label></div>
        <p className="privacy-note">{consent ? 'Freigegeben: Erst ein Klick auf „Forschung finden“ sendet diesen Abschnittstitel an Crossref. Du kannst die Freigabe jederzeit ausschalten.' : 'Alles bleibt lokal. Aktiviere die Forschungssuche, um ausgewählte Abschnittstitel an Crossref zu senden.'}</p>
        {view.topics.length === 0 ? <div className="empty-state">Ergänze einen Abschnitt mit der Werkzeugleiste. Dein erstes Thema erscheint hier.</div> : <div className="topic-grid">{view.topics.map((topic, index) => {
          const key = `${topic.id}:${topic.label}`;
          const results = research[key];
          return <article className="topic-card" key={key}>
            <div className="topic-card-top"><span className="topic-number">{String(index + 1).padStart(2, '0')}</span><span className="small-tag">{topic.level === 1 ? 'Abschnitt' : 'Unterabschnitt'}</span></div><h3>{topic.label}</h3><span className="source-location">Dein Dokument · Zeile {topic.line}</span>
            <button className="research-button" disabled={!consent || Boolean(loading)} onClick={() => void findResearch(topic)}>{loading === key ? 'Forschung wird gesucht …' : 'Forschung finden'} <span aria-hidden="true">↗</span></button>
            {researchErrors[key] && <p role="alert" className="research-error">{researchErrors[key]}</p>}
            {results && <div className="research-results">{results.length === 0 ? <p>Keine passenden Metadatentreffer gefunden.</p> : results.map(item => <a href={item.url} key={item.doi} target="_blank" rel="noopener noreferrer" onClick={event => {
              if (!files.isDesktop()) return;
              event.preventDefault();
              import('@tauri-apps/plugin-opener').then(({openUrl}) => openUrl(item.url)).catch(() => setMessage('Der DOI-Link konnte nicht geöffnet werden. Bitte die DOI unter dem Treffer kopieren und im Browser öffnen.'));
            }}><span>{item.kind === 'dissertation' ? 'Dissertation' : 'Forschungsartikel'}{item.year ? ` · ${item.year}` : ''}</span><strong>{item.title}</strong><small>{item.doi}</small></a>)}</div>}
          </article>;
        })}</div>}
        <p className="research-disclaimer">Crossref liefert Metadatenhinweise, keine geprüfte inhaltliche Übereinstimmung oder Volltexte. Die lokale Themenansicht ist kein semantischer Knowledge Graph.</p>
      </section>
    </main>
    <footer className="app-footer"><span>Black sheep <span className="muted">/ Open Source</span></span><span>Dein Dokument verlässt das Gerät nicht.</span><button className="text-button" onClick={() => setPrivacyOpen(true)}>Datenschutz & Grenzen</button></footer>

    {privacyOpen && <dialog ref={privacyDialog} className="modal-backdrop" aria-labelledby="privacy-title" onCancel={() => setPrivacyOpen(false)} onClick={event => {if (event.target === event.currentTarget) closePrivacy();}}><section className="privacy-dialog"><button className="dialog-close" aria-label="Datenschutz schließen" onClick={closePrivacy}>×</button><h2 id="privacy-title">Dein Dokument bleibt deins.</h2><p>Black sheep bearbeitet LaTeX lokal. Es gibt keine Telemetrie, kein Cloud-AI und kein stilles Autosave.</p><p>Nur nach deiner Freigabe und einem Klick auf „Forschung finden“ wird der einzelne Abschnittstitel an <strong>api.crossref.org</strong> geschickt. Der vollständige Entwurf wird nicht übertragen. DOI-Links öffnen externe Forschungsnachweise.</p><label className="privacy-check"><input type="checkbox" checked={consent} onChange={event => updateConsent(event.target.checked)} /> Forschungssuche erlauben</label><p className="muted">Die Einstellung wird für 30 Tage im Erstanbieter-Cookie <code>bs_research</code> gespeichert. Ohne Cookie-Unterstützung gilt sie nur für die Sitzung. Ausschalten bricht laufende Anfragen ab.</p><h3>Was die Ansicht zeigt</h3><p>Eine begrenzte LaTeX-Struktur, keinen vollständigen TeX-Satz und keine PDF-Kompilation. Es gibt keine automatischen Agenten und keine Ausführung deines Codes.</p><button className="accent-button" onClick={closePrivacy}>Verstanden</button></section></dialog>}
  </div>;
}
