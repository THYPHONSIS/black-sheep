import { MAX_DOCUMENT_LENGTH } from './latex.ts';

export type NativeFilePorts = {
  pickOpen: () => Promise<string | null>;
  pickSave: (name: string) => Promise<string | null>;
  stat: (path: string) => Promise<{size: number; isFile: boolean}>;
  readText: (path: string) => Promise<string>;
  writeText: (path: string, source: string) => Promise<void>;
};
export type NativeDocument = {source: string; name: string; revision: number};
export type NativeSave = {name: string; revision: number};

function pathKey(path: string): string {
  return /^[a-z]:[\\/]|^\\\\/i.test(path) ? path.replaceAll('\\', '/').toLowerCase() : path;
}

export class NativeDocumentSession {
  private readonly ports: NativeFilePorts;
  private current: {path: string; source: string; revision: number} | undefined;
  private running = false;
  constructor(ports: NativeFilePorts) {this.ports = ports;}

  clear(): void {
    if (this.running) throw new Error('Eine Dateiaktion läuft bereits. Bitte zuerst abschließen.');
    this.current = undefined;
  }

  private async exclusive<T>(action: () => Promise<T>): Promise<T> {
    if (this.running) throw new Error('Eine Dateiaktion läuft bereits. Bitte zuerst abschließen.');
    this.running = true;
    try {return await action();} finally {this.running = false;}
  }

  private async read(path: string): Promise<string> {
    const info = await this.ports.stat(path);
    if (!info.isFile) throw new Error('Bitte eine reguläre LaTeX-Datei auswählen.');
    if (info.size > MAX_DOCUMENT_LENGTH * 4) throw new Error('Die Datei ist zu groß.');
    const text = await this.ports.readText(path);
    if (text.length > MAX_DOCUMENT_LENGTH) throw new Error('Das Dokument überschreitet 200.000 Zeichen.');
    return text;
  }

  async open(): Promise<NativeDocument | null> {
    return this.exclusive(async () => {
      const path = await this.ports.pickOpen();
      if (!path) return null;
      if (!/\.tex$/i.test(path)) throw new Error('Bitte eine .tex-Datei auswählen.');
      const source = await this.read(path);
      this.current = {path, source, revision: 1};
      return {source, name: path.split(/[\\/]/).pop()!, revision: 1};
    });
  }

  async saveAs(source: string, name: string): Promise<NativeSave | null> {
    return this.exclusive(async () => {
      if (source.length > MAX_DOCUMENT_LENGTH) throw new Error('Das Dokument ist zu groß.');
      const path = await this.ports.pickSave(name);
      if (!path) return null;
      if (!/\.tex$/i.test(path)) throw new Error('Der Dateiname muss auf .tex enden.');
      const previous = this.current;
      const sameFile = previous && pathKey(previous.path) === pathKey(path);
      // Optimistic comparison after the dialog. Atomic native commit is a separate milestone.
      if (sameFile && await this.read(path) !== previous.source) {
        throw new Error('Die Datei wurde außerhalb von Black sheep geändert. Bitte unter einem neuen Namen speichern oder die externe Fassung erneut öffnen.');
      }
      await this.ports.writeText(path, source);
      const revision = sameFile ? previous.revision + 1 : 1;
      this.current = {path, source, revision};
      return {name: path.split(/[\\/]/).pop()!, revision};
    });
  }
}
