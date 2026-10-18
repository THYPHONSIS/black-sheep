import { MAX_DOCUMENT_LENGTH } from './latex';

export function isDesktop(): boolean { return '__TAURI_INTERNALS__' in window; }

export async function openNativeTex(): Promise<{source: string; name: string} | null> {
  const {open} = await import('@tauri-apps/plugin-dialog');
  const {readTextFile, stat} = await import('@tauri-apps/plugin-fs');
  const path = await open({multiple: false, directory: false, filters: [{name: 'LaTeX-Dokument', extensions: ['tex']}]});
  if (!path) return null;
  if (!/\.tex$/i.test(path)) throw new Error('Bitte eine .tex-Datei auswählen.');
  if ((await stat(path)).size > MAX_DOCUMENT_LENGTH * 4) throw new Error('Die Datei ist zu groß.');
  const source = await readTextFile(path);
  if (source.length > MAX_DOCUMENT_LENGTH) throw new Error('Das Dokument überschreitet 200.000 Zeichen.');
  return {source, name: path.split(/[\\/]/).pop() || 'dokument.tex'};
}

// Always a visible Save-As dialog: no remembered path and no silent file writes.
export async function saveNativeTex(source: string, name: string): Promise<boolean> {
  if (source.length > MAX_DOCUMENT_LENGTH) throw new Error('Das Dokument ist zu groß.');
  const {save} = await import('@tauri-apps/plugin-dialog');
  const {writeTextFile} = await import('@tauri-apps/plugin-fs');
  const path = await save({defaultPath: name, filters: [{name: 'LaTeX-Dokument', extensions: ['tex']}]});
  if (!path) return false;
  if (!/\.tex$/i.test(path)) throw new Error('Der Dateiname muss auf .tex enden.');
  await writeTextFile(path, source);
  return true;
}
