import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeDocumentSession} from '../apps/desktop/src/domain/nativeSession.ts';

function fixture() {
  const path = 'C:\\Dokumente\\Versuch.tex';
  const files = new Map([[path, 'Ursprünglicher Entwurf – Größe']]);
  const writes = [];
  const ports = {
    pickOpen: async () => path,
    pickSave: async () => path,
    stat: async selected => ({size: Buffer.byteLength(files.get(selected) || ''), isFile: true}),
    readText: async selected => {if (!files.has(selected)) throw Error('Datei fehlt'); return files.get(selected);},
    writeText: async (selected, text) => {writes.push({path: selected, text}); files.set(selected, text);},
  };
  return {path, files, writes, ports, session: new NativeDocumentSession(ports)};
}

test('native save refuses external changes made while the save dialog is open', async () => {
  const f = fixture();
  await f.session.open();
  f.ports.pickSave = async () => {f.files.set(f.path, 'Andere Anwendung hat gespeichert'); return f.path;};
  await assert.rejects(f.session.saveAs('Mein neuer Entwurf', 'Versuch.tex'), /außerhalb|geändert/);
  assert.equal(f.writes.length, 0);
  assert.equal(f.files.get(f.path), 'Andere Anwendung hat gespeichert');
});

test('native session increments only successful writes and returns the actual chosen filename', async () => {
  const f = fixture();
  assert.equal((await f.session.open()).revision, 1);
  f.ports.writeText = async () => {throw Error('Datenträger voll');};
  await assert.rejects(f.session.saveAs('Neu', 'Versuch.tex'), /voll/);
  f.ports.writeText = async (path, source) => f.files.set(path, source);
  assert.deepEqual(await f.session.saveAs('Neu', 'Versuch.tex'), {name: 'Versuch.tex', revision: 2});
  f.ports.pickSave = async () => 'C:\\Dokumente\\Andere Datei.tex';
  assert.deepEqual(await f.session.saveAs('Kopie', 'Versuch.tex'), {name: 'Andere Datei.tex', revision: 1});
});

test('cancelled dialogs never write and a failed open preserves the current revision', async () => {
  const f = fixture();
  await f.session.open();
  f.ports.pickOpen = async () => 'falsch.txt';
  await assert.rejects(f.session.open(), /tex/);
  f.ports.pickSave = async () => null;
  assert.equal(await f.session.saveAs('Neu', 'Versuch.tex'), null);
  assert.equal(f.writes.length, 0);
  f.ports.pickSave = async () => f.path;
  assert.equal((await f.session.saveAs('Neu', 'Versuch.tex')).revision, 2);
});

test('native open rejects non-files and both byte and document limits', async () => {
  const f = fixture();
  f.ports.stat = async () => ({size: 1, isFile: false});
  await assert.rejects(f.session.open(), /reguläre|Datei/);
  f.ports.stat = async () => ({size: 800_001, isFile: true});
  await assert.rejects(f.session.open(), /groß/);
  f.ports.stat = async () => ({size: 1, isFile: true});
  f.ports.readText = async () => 'x'.repeat(200_001);
  await assert.rejects(f.session.open(), /200.000/);
});

test('another file action cannot interleave with a pending native dialog', async () => {
  const f = fixture();
  let finish;
  f.ports.pickSave = () => new Promise(resolve => {finish = resolve;});
  const first = f.session.saveAs('Neu', 'Versuch.tex');
  await assert.rejects(f.session.open(), /bereits|läuft/);
  finish(null);
  assert.equal(await first, null);
  assert.equal(f.writes.length, 0);
});

test('clearing a document resets its session version', async () => {
  const f = fixture();
  await f.session.open();
  f.session.clear();
  assert.equal((await f.session.saveAs('Neu', 'Versuch.tex')).revision, 1);
});
