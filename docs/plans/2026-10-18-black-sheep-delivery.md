# Black sheep Delivery Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den bestätigten LaTeX-/Synapse-Stand der PDF zu einer überprüften lokalen Anwendung weiterentwickeln, mit etwa zehn Etappen als Planungsziel.

**Architecture:** Der bestehende React-/Tauri-Kern bleibt erhalten. Dateizugriff, lokale Dokumentstruktur, Forschungsmetadaten und ein isolierter Compiler erhalten getrennte Verträge. Ein bestandener Test oder Build ersetzt keinen noch nicht ausgeführten Plattformablauf.

**Tech Stack:** React 19, TypeScript, Vite 8, Tauri 2, Rust 1.99.1, pnpm 11.25.0; zusätzliche Parser-/WASM-Komponenten erst nach Quell-, Lizenz- und Isolationstest.

## Global Constraints

- „Der aktive Editor unterstützt ausschließlich LaTeX.“
- „Ein stilles Autosave existiert nicht“; keine unbeaufsichtigte Übertragung des Entwurfs.
- Recherche nur nach Freigabe und zusätzlichem Klick; nur Abschnittstitel an Crossref, journal-article/dissertation, maximal zehn validierte Treffer.
- Die Strukturansicht bleibt als solche bezeichnet, bis ein echter TeX-Lauf und eine PDF-Anzeige nachgewiesen sind.
- „Für einen echten App-PDF-Compiler braucht es einen isolierten Prozess mit enger Dateisystemgrenze, Speicher-/CPU-/Zeitlimit, temporärem Workspace, deaktivierter Shell-Ausführung und einer kontrollierten PDF-Anzeige.“
- Keine autonome Lernfunktion ohne den in der Übergabe verlangten transparenten Datenschutz und gesondert festgelegten Produktumfang. Sie gehört nicht heimlich zum Startvorgang.
- Öffentliches GitHub-Repository, überprüfbare Quellen und Lizenzen; lokale und veröffentlichte Git-Versionen müssen übereinstimmen.

Die zehn Etappen sind eine Schätzung. Eine nicht bestandene Grenze bleibt offen; die Zahl der Automationsläufe ist kein Ersatz für die Abnahme. Alle neu genannten Dateien sind **vorgeschlagen**, soweit sie nicht bereits im Repository existieren.

---

### Task 1: Reproduzierbare Ausgangsausgabe liefern

**Files:** bestehend `.github/workflows/quality.yml`, `scripts/seal-standalone.mjs`, `tests/standalone.test.mjs`, `README.md`.
**Interfaces:** `pnpm quality`, `pnpm testversion:build`, `pnpm desktop:build` erzeugen testbare Web-/Windows-Artefakte aus demselben Commit.

- [x] Regressionstest: Ein `</body>`-Literal im JavaScript und `$&` in einer Lizenz dürfen die Skriptbytes nicht verändern.
- [x] Relevanten Fehler vor der Reparatur nachweisen: falsche Skriptbytes und CSP-Hash.
- [x] Nur die finale HTML-Grenze verwenden und finale Skripthashes prüfen.
- [x] `node --test tests/standalone.test.mjs`: erfolgreich.
- [x] Öffentlicher Workflow `39088139134` für `90668a6`: Web, kontrolliertes pdflatex, Rust-Prüfung und Windows-Installer erfolgreich; HTML-Artefakt bytegleich mit lokalem Ergebnis.
- [x] Änderungen separat committed und veröffentlicht. Ein nativer Build ist noch keine Dialog-/Datei-E2E-Abnahme.

### Task 2: Geöffnete Dateistände und beobachtete Konflikte schützen

**Files:** neu `apps/desktop/src/domain/nativeSession.ts`, `tests/native-session.test.mjs`; bestehend `nativeFiles.ts`, `App.tsx`, `components/MonacoEditor.tsx`.
**Interfaces:** `NativeDocumentSession.open(): Promise<NativeDocument|null>`, `saveAs(source,name): Promise<NativeSave|null>`, `clear(): void`; Ports für gewählte Pfade, Metadaten, Lesen und Schreiben. `NativeSave` enthält tatsächlichen Namen und sitzungsbezogenen Stand.

- [x] Tests für externe Änderung während Speicherdialog, fehlgeschlagenen Schreibvorgang, Dialogabbruch, Nicht-Dateien, Grenzen und konkurrierende Dateiaktionen ergänzen.
- [x] Relevanten roten Lauf nachweisen: fünf fehlende Verhaltensweisen, ein bestehender Fall erfolgreich.
- [x] Nach dem Dialog mit dem geöffneten Inhalt vergleichen; beobachtete Änderungen verweigern. Zähler erst nach erfolgreichem Schreiben ändern; tatsächlichen Namen anzeigen. Während einer Dateiaktion Bearbeitung und weitere Dateiaktionen sperren.
- [x] `node --experimental-strip-types --test tests/native-session.test.mjs`: sechs Tests bestanden; `pnpm quality`: 19 Tests und Build bestanden.
- [x] Browserintegration mit echter App/Sitzung und simulierten Dateiports: zwölf Prüfungen bestanden; normaler Browserimport und tatsächlicher Export bytegleich. Unabhängige Quell-/Artefaktprüfung ohne blockierende Findings. Keine native Datei-E2E oder rennfreie atomare Speicherung daraus ableiten.
- [x] Dateivertrag und Grenzen im Architekturdokument aktualisieren.
- [ ] Geprüften Task veröffentlichen und aktuelle Web-/Windows-CI ausführen. Lokale Prüfung ersetzt diesen Nachweis nicht.

### Task 3: Native Speichertransaktion mit Wiederherstellung

**Files:** vorgeschlagen `apps/desktop/src-tauri/src/documents/{mod.rs,storage.rs}`, `permissions/documents.toml`, `tests/native-storage.rs`; Integration in `src/lib.rs`, `domain/nativeFiles.ts` und `capabilities/main.json`.
**Interfaces:** `open_document()->{token,source,name,revision}`, `save_document(token,expectedRevision,source)->SaveOutcome`; `SaveOutcome` unterscheidet gespeichert, Konflikt und Abbruch. Pfade verbleiben im Rust-Kern; der Renderer erhält keine freie Schreibfunktion.

- [ ] Echte temporäre Dateien testen: externer Editor ändert Inhalt, Ziel verschwindet, Symlink/Hardlink-Alias, Datenträgerfehler, fehlgeschlagener Commit und gleichzeitige Aufrufe. Original oder verifizierte Wiederherstellungsfassung muss erhalten bleiben.
- [ ] Tests zunächst gegen den vorhandenen nicht-atomaren Schreibpfad rot ausführen.
- [ ] Dialoggewählte Dateien als Sitzungstoken registrieren; Inhalt und Dateiidentität als Revision festhalten. Im selben Verzeichnis vorbereiten, synchronisieren und mit plattformspezifischer geprüfter Commit-/Backup-Operation veröffentlichen. Revision bei Konflikt nicht fortschreiben; Wiederherstellung explizit anbieten. Keinen unbewiesenen Read-then-Rename-Vergleich als CAS ausgeben.
- [ ] Rust-Tests für die jeweilige Plattform sowie einen Fehler-Injektionslauf ausführen; Originalbytes prüfen.
- [ ] Windows und Linux prüfen, Capability auf die verwendeten Kommandos reduzieren; native Schreibrechte im Renderer entfernen.
- [ ] Atomare Dateifunktion mit dokumentierten Betriebssystem-/Dateisystemgrenzen separat committen und pushen.

### Task 4: Belastbare begrenzte LaTeX-Struktur

**Files:** vorgeschlagen `apps/desktop/src/domain/latexParser.ts`, `tests/latex-parser.test.mjs`; bestehend `domain/latex.ts` und `App.tsx`.
**Interfaces:** `parseDocument(source): DocumentView`; bestehende Felder plus Quellbereiche `{start,end,line}`. Bestehende 200.000-/30-/8-Grenzen bleiben.

- [x] Verschachtelte Titel, optionale Kurzformen, Kommentare, escaped percent, Kernel-Verbatim, unvollständige Gruppen und doppelte Überschriften als Fixtures ergänzen.
- [x] Nachweis vor Implementierung: fünf Verhaltensprüfungen gegen bisherige Regex-Erkennung fehlgeschlagen. Weitere Randfälle für Kurzform-Befehle, leeren `verb`-Delimiter und doppelte Hinweise ebenfalls vor jeweiliger Reparatur rot.
- [x] Quellbereiche mit einem begrenzten Token-/Gruppenparser erkennen. Unvollständige Eingaben liefern Warnung und brauchbare Teilstruktur, keine erfundenen Abschnitte aus Kernel-Verbatim. Keine Makroexpansion oder Paketumgebungs-Semantik behaupten.
- [x] `node --experimental-strip-types --test tests/latex-parser.test.mjs`: 15 Tests für Titel, Bereiche, Randfälle, gespeicherte Definitionen und Zeilenenden erfolgreich. Reviewer-Funde wurden vor jeweiliger Reparatur zusätzlich rot reproduziert.
- [x] Unabhängige Prüfung bestätigt Parser-Subset und Grenzen: `pnpm quality` 34/34, elf große Eingaben und weitere Definitions-/Unicode-/Literalproben, finale CSP-/Modul-/Artefaktprüfung erfolgreich.
- [ ] Live-Gliederungssprung nach Unicode-/Kommentaränderungen sowie CR-/Textarea-Normalisierung prüfen (Browserbedienung derzeit blockiert). Native Task 3 bleibt offen.
- [ ] Parseränderung und dokumentierte unterstützte Teilmenge separat veröffentlichen; aktuelle Web-/Windows-CI prüfen. Task 4 wurde wegen unabhängiger Dateigrenzen vor der weiter offenen nativen Task 3 bearbeitet.

### Task 5: Lokale Themenidentität und nachvollziehbare Verbindungen

**Files:** vorgeschlagen `domain/topics.ts`, `domain/topicStorage.ts`, `components/TopicRelations.tsx`, `tests/topics.test.mjs`.
**Interfaces:** `reconcileTopics(previous,document): TopicGraph`; Knoten mit stabiler ID und Quellbereich, Kanten mit Quelle/Grund. `loadGraph(documentId)` und explizites `saveGraph(documentId,graph)` speichern nur lokal.

- [ ] Einfügen vor einem Thema, Umbenennen, gleiche Titel, gelöschte Stellen und beschädigte gespeicherte Daten testen.
- [ ] Aktuellen positionsabhängigen Identitätswechsel reproduzieren.
- [ ] Quellanker und Titel gemeinsam zuordnen; unsichere Zuordnung sichtbar machen. Benutzerverbindungen mit einem klaren Grund speichern; keine semantische Übereinstimmung erfinden. Speicherung im nativen App-Datenverzeichnis bzw. lokaler Browserdatenbank, ohne Dokument-Autosave.
- [ ] Stabile IDs bei Verschiebungen und nachvollziehbare Kanten nach erneutem Laden prüfen.
- [ ] Offline-Neustart und zwei verschiedene Dokumente auf isolierte Daten prüfen.
- [ ] Lokale Persistenz samt Export-/Löschaktion veröffentlichen.

### Task 6: Forschungsnachweise an konkrete Dokumentstellen binden

**Files:** vorgeschlagen `domain/researchEvidence.ts`, `domain/researchCache.ts`, `tests/research-evidence.test.mjs`; bestehend `researchClient.ts`, `research.ts`, `App.tsx`.
**Interfaces:** `ResearchEvidence={topicId,sourceRange,query,queriedAt,doi,metadata}`; `queryTopic(topic,consent,signal)` erhält die bestehende Transportgrenze.

- [ ] Thema nach Suche ändern, Widerruf während Suche, doppelte DOI, Cache-Abgleich und veraltete Quellenbereiche testen.
- [ ] Fehlende Herkunftsbindung in aktuellen Ergebnisobjekten nachweisen.
- [ ] Zeitpunkt, Query und Quellbereich lokal mit Metadaten ablegen. Veraltete Zuordnung kennzeichnen; Cache erzeugt keine neuen Hintergrundanfragen. Nur bewusster Klick startet Netz; Widerruf bricht laufende Requests ab.
- [ ] Unit-/Transporttests mit unverändertem 9s-/300kB-/Typ-/DOI-Vertrag ausführen.
- [ ] Echte Crossref-Abfrage und Widerruf auf Windows-WebView prüfen; enge Loopback-Lösung nur bei nachgewiesenem CORS-Problem entwickeln.
- [ ] Herkunftsanzeige und Datenlöschaktion mit Datenschutzbeschreibung veröffentlichen.

### Task 7: Isolierten TeX-Lauf nachweisen

**Files:** vorgeschlagen `domain/compiler.ts`, `workers/latexCompiler.ts`, `scripts/prepare-tex-runtime.mjs`, `tests/compiler-boundaries.test.mjs`, `docs/compiler-runtime.md`.
**Interfaces:** `compile({source,assets},signal): Promise<{pdf,diagnostics,sourceRevision}>`; alle Assets haben relative Projektpfade. Kein Zugriff auf Hostpfade, Prozessstart oder Netz aus dem Compile-Job.

- [ ] Bösartige Fixtures für absolute/relative Dateiausbrüche, `\\input`, Shell-Ausführung, Endlosschleife, Speicherüberschreitung und Netzversuch definieren. Erfolgsfixture enthält Tabelle, amsmath und pgfplots.
- [ ] Vorhandenen Stand als fehlenden Compiler nachweisen; keinen nativen unisolierten TeX-Aufruf als Ersatz einbauen.
- [ ] Einen lokal gebündelten WASM-Worker mit eigenem virtuellen Dateisystem integrieren. Als Kandidat den veröffentlichten `wasmtex`-Wrapper prüfen; Engine-/Paketbytes und Lizenzen separat pinnen. Job nach festem Zeit-/Speicherbudget terminieren, Ergebnisgröße begrenzen und Worker verwerfen. Unbelegte Grenzen verhindern die Freigabe dieses Tasks.
- [ ] Grenzfixtures müssen ohne Hostlese-/Schreib-/Netzzugriff enden; Erfolgsfixture muss echte PDF-Bytes liefern.
- [ ] Den identischen Job offline im Browser und Tauri-WebView ausführen. Paketbereitstellung ist ein bewusster Download ohne Entwurfsupload; während Kompilierung keine Downloads.
- [ ] Runtime, Prüfsummen, Lizenzen und tatsächlich bestandene Grenzen zusammen veröffentlichen.

### Task 8: PDF-Ansicht und Fehlernavigation

**Files:** vorgeschlagen `components/PdfPreview.tsx`, `components/CompileDiagnostics.tsx`, `tests/compile-state.test.mjs`; bestehend `App.tsx`, `MonacoEditor.tsx`, `styles/app.css`.
**Interfaces:** `CompileState` unterscheidet lokal geändert, laufend, gültiges PDF, fehlgeschlagen und abgebrochen. Ergebnisse sind an `sourceRevision` gebunden; `navigateTo(line)` bleibt Editor-Schnittstelle.

- [ ] Ergebnis nach zwischenzeitlicher Bearbeitung, Abbruch, fehlerhafte PDF-Bytes und veraltete Fehlerzeilen testen.
- [ ] Nachweisen, dass die bestehende Strukturansicht kein gesetztes PDF liefert.
- [ ] PDF nur nach bewusstem Compile-Klick erzeugen und in kontrollierter lokaler Anzeige rendern. Alte Ergebnisse kennzeichnen; Objekt-URLs und Worker beim Ersetzen freigeben. Fehler mit belegter Zeile anklickbar machen.
- [ ] Zustandsübergänge und Revisionstreue prüfen; fehlerhafte PDFs dürfen nicht als aktuelles Ergebnis erscheinen.
- [ ] Erfolgreiches Compile, Fehlermeldung, Abbruch und Sprung zur richtigen Editorzeile live prüfen.
- [ ] PDF-Funktion separat veröffentlichen, Strukturansicht weiter als eigene Ansicht führen.

### Task 9: Zielplattformen und Bedienung absichern

**Files:** vorgeschlagen `tests/e2e/desktop/`, `tests/e2e/browser/`, `docs/platform-verification.md`; bestehend `.github/workflows/quality.yml`, `styles/app.css`, `TablePicker.tsx`.
**Interfaces:** Endnutzerablauf Öffnen → Bearbeiten → Konflikt → Speichern unter → Wiederöffnen; Recherchefreigabe → Ergebnis → DOI; Compile → Fehler/PDF.

- [ ] E2E-Fixtures mit Umlauten, großen zulässigen Dateien, Dialogabbruch und externem Schreibkonflikt ergänzen.
- [ ] Bestehende Lücken separat als unbestätigt erfassen, nicht aus einem grünen Build ableiten.
- [ ] Ablauf unter Windows und Linux automatisieren, soweit Hostzugriff vorhanden ist. Tastaturfolge, Dialogfokus, Raster und schmale Fenster prüfen; konkrete Fehler beheben.
- [ ] Alle automatisierbaren Fälle ohne ausgelassene Pflichtprüfung ausführen; manuelle Nachweise mit Plattform und Version dokumentieren.
- [ ] Offline-Betrieb, echte WebView-Recherche, DOI-Öffnung, Cookie-Widerruf und Installerablauf prüfen.
- [ ] Plattformmatrix mit präziser geprüfter/ungeprüfter Grenze veröffentlichen.

### Task 10: Nachvollziehbare Ausgabe und Übergabe

**Files:** bestehend `README.md`, `THIRD_PARTY_NOTICES.md`, `.github/workflows/quality.yml`; vorgeschlagen `docs/releases/`, `scripts/check-release.mjs`.
**Interfaces:** Ein Commit/Tag pro Ausgabe; Installer, Web-Artefakt, Source-ZIP und Prüfsummen beziehen sich auf denselben Quellstand.

- [ ] Releaseprüfung mit fehlender Lizenz, abweichendem Hash, nicht bestandenem Workflow und fehlendem Pflichtnachweis rot ausführen.
- [ ] Keine Freigabe durch bloße Existenz einer EXE zulassen.
- [ ] Vollständige Lizenzen für tatsächlich verteilte JS-/Rust-/TeX-/PDF-Komponenten aufnehmen; Installation, Grenzen und Wiederherstellung beschreiben. Artefakte aus dem geprüften CI-Lauf übernehmen.
- [ ] `pnpm quality`, Audit, Runtime-Grenztests, Releaseprüfung und Quellcode-/Artefaktabgleich ausführen.
- [ ] Unabhängige Abnahme gegen jede aktuelle PDF-Anforderung; offene zukünftige Lernfunktionen weiterhin ausdrücklich unterscheiden.
- [ ] Geprüfte Ausgabe auf GitHub veröffentlichen, lokale Deliverables aktualisieren und erst dann den Gesamtauftrag abschließen.

## Quellen und Entscheidungen

Tauri-Dialog-/Datei-APIs werden versionsbezogen gegen die installierten offiziellen Pakete und [Dialog-Quelldokumentation](https://docs.rs/tauri-plugin-dialog/latest/tauri_plugin_dialog/struct.FileDialogBuilder.html) geprüft. Die erste Konfliktprüfung ist optimistisch; sie garantiert keine atomare CAS-Operation und löst noch keine Alias-/Schreib-Rennen.

Für den Compiler sind [wasmtex](https://registry.npmjs.org/wasmtex), [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX) und [TeX-Live-WASM](https://github.com/typeward/texlive-wasm) recherchierte Kandidaten, keine bereits freigegebenen Bestandteile. Upstream-Beschreibungen ersetzen keine eigene Isolationsprüfung. Der konkrete Engine-/Paketstand, Ressourcenbudgets und deren plattformübergreifende Durchsetzung werden in Task 7 anhand ausführbarer Proben festgelegt; eine unbelegte Sandbox wird nicht ausgeliefert.

Produktentscheidungen mit anderer Strukturwirkung: autonome Lernagenten und deren Datenfluss bleiben außerhalb des derzeit festgelegten Umfangs. Für Datei-Konflikte bleibt „unter neuem Namen speichern oder externe Fassung öffnen“ der sichtbare Auflösungsweg; kein stilles Zusammenführen oder Überschreiben.
