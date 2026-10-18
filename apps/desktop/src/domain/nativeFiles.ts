import { NativeDocumentSession } from './nativeSession';

export function isDesktop(): boolean { return '__TAURI_INTERNALS__' in window; }

const session = new NativeDocumentSession({
  pickOpen: async () => (await import('@tauri-apps/plugin-dialog')).open({multiple: false, directory: false, filters: [{name: 'LaTeX-Dokument', extensions: ['tex']}]}),
  pickSave: async name => (await import('@tauri-apps/plugin-dialog')).save({defaultPath: name, filters: [{name: 'LaTeX-Dokument', extensions: ['tex']}]}),
  stat: async path => (await import('@tauri-apps/plugin-fs')).stat(path),
  readText: async path => (await import('@tauri-apps/plugin-fs')).readTextFile(path),
  writeText: async (path, source) => (await import('@tauri-apps/plugin-fs')).writeTextFile(path, source),
});

export const openNativeTex = () => session.open();
export const clearNativeDocument = () => session.clear();

// Always a visible Save-As dialog. The selected path is kept only in this session.
export const saveNativeTex = (source: string, name: string) => session.saveAs(source, name);

export type NativeFileService = {
  isDesktop: typeof isDesktop;
  openNativeTex: typeof openNativeTex;
  saveNativeTex: typeof saveNativeTex;
  clearNativeDocument: typeof clearNativeDocument;
};
