# Aktive Architektur

## Produktentscheidung

Black sheep ist das LaTeX-Programm; Synapse bezeichnet die lokale Themenansicht und die freiwillige Verknüpfung zu Forschungsmetadaten. Die jüngere Entwicklerübergabe und die ausdrückliche Auswahl des Nutzers ersetzen den vorherigen C-/LaTeX- und VS-Code-Entwurf. Das alte Quellarchiv wurde dieser lokalen Sitzung nicht mitgeliefert; diese Implementierung wurde aus den übergebenen Anforderungen aufgebaut. Frühere Testzahlen werden nicht als eigene Tests ausgegeben.

## ADR-001: Lokale Kernfunktionen

Akzeptiert, 2026-10-17. React/TypeScript und ein lokaler Monaco-ESM-Build bilden dieselbe Anwendung in Browser und Tauri ab. Pure Domain-Funktionen besitzen keine Datei-, Netzwerk- oder Datenbankrechte. Dokumentinhalt lebt im Arbeitsspeicher und wird nur auf Benutzerbefehl geöffnet/exportiert. Ein vereinfachter Editor ermöglicht eine unabhängige Einzel-HTML und zugängliche Bearbeitung.

## ADR-002: Metadaten statt vorgetäuschtem Graph

Akzeptiert, 2026-10-17; Strukturparser ergänzt 2026-10-19. `inspectLatex` delegiert an `latexParser.ts:parseDocument`. Die Limits und Dokumenttypen haben dort genau einen Besitzer. Der Scanner maskiert Kommentare und die Kernel-Literalformen `verb`, `verb*`, `verbatim`, `verbatim*`, ohne UTF-16-Offsets oder Zeilenumbrüche zu verschieben. Eine Klammerpaarung und die außerhalb geschweifter Gruppen stehenden Kontrollsequenzen liefern literale Titel, Abschnittsebenen und gepaarte Displayformeln. Optionale Kurzformen respektieren durch Gruppen geschützte `]`; ihre inneren Befehle erzeugen keine eigenen Themen. Ganze Argumentbereiche werden nur einmal verarbeitet. Themen erhalten `{start,end,line}` mit exklusivem Ende. Doppelte Titel bleiben anhand verschiedener Quellbereiche unterscheidbar; ihre IDs sind weiterhin positionsabhängig, nicht dauerhaft stabil.

Vor der Literalmaske werden `newcommand`/`renewcommand`/`providecommand`/`DeclareRobustCommand`, `def`/`gdef`/`edef`/`xdef`, `newenvironment`/`renewenvironment` und die `New`/`Renew`/`Provide`/`DeclareDocumentCommand`-/`DocumentEnvironment`-Familien einschließlich Expandable-Commandvarianten als gespeicherte Tokenbereiche gelesen. Ihre Definitionen werden weder expandiert noch durch darin stehende Literalbefehle aktiviert. LF, CRLF und CR beenden Kommentare und zählen als jeweils ein ursprünglicher Zeilenumbruch. Nur für die abgeleitete Absatzanzeige werden Zeilenenden vereinheitlicht; Originalquelle und Quellbereiche bleiben unverändert.

Unvollständige Gruppen/Formeln/Literalbereiche erzeugen höchstens acht unterschiedliche Hinweise mit Zeile. Erhalten bleiben 200.000 Eingabezeichen, 30 Themen, acht Formeln à 1.200 Zeichen und acht Textsegmente à 1.600 Zeichen; angezeigte Titel sind auf 240 und Themen auf 180 Zeichen begrenzt. Der Parser expandiert keine Makros, wertet keine TeX-Bedingungen/Catcodes aus und lädt keine Dateien oder Pakete. Spezielle Paketumgebungen wie `minted` und `lstlisting` sind noch nicht als literal hinterlegt. Er erkennt literale Struktur im ganzen Puffer, keine tatsächlich ausgeführte TeX-Struktur. Die Einfügetransformation bleibt ein separater, begrenzter Dokumentgrenzen-/Pakethelfer. Keine Graphdatenbank oder LLM-Inferenz wird behauptet. Forschungsmetadaten bleiben ungeprüfte Hinweise.

Die Gliederungsnavigation verwendet den Beginn des erkannten Quellbereichs. Für Textarea wird nur der vorangehende Text auf LF abgebildet, weil die DOM-Value CRLF und CR normalisiert. Monaco erhält ursprüngliche Zeile und UTF-16-Spalte. Ein Live-CRLF-Import reproduzierte vor der Reparatur Cursor 151 statt 144; danach bestätigten zwölf HTTP-Browserprüfungen LF/CRLF/CR, wiederholte Aktivierung, Unicode-/Kommentarverschiebung, Einrückung und die tatsächliche Monaco-Einfügeposition. Unveränderte Browserexporte der CR-/CRLF-Fixtures blieben bytegleich. Diese HTTP-App-Prüfung ist kein Nachweis eines direkten `file://`-Starts oder nativer Dateidialoge.

Die Syntaxgrenze wurde gegen die offiziellen LaTeX-Kernelquellen [ltsect.dtx](https://github.com/latex3/latex2e/blob/develop/base/ltsect.dtx) (2026-06-26 v1.1h), [ltmiscen.dtx](https://github.com/latex3/latex2e/blob/develop/base/ltmiscen.dtx) und [ltdefns.dtx](https://github.com/latex3/latex2e/blob/develop/base/ltdefns.dtx) geprüft (19.10.2026). Der Scanner ist eigenständig implementiert; er übernimmt keinen TeX-Kernelcode und ersetzt keinen Compiler.

## ADR-003: Explizite Recherchegrenze

Akzeptiert, 2026-10-17. Keine Netzverbindung für den Kernstart. Eine Einwilligung allein sendet noch nichts. Erst der Themenbutton ruft zwei eng gefilterte Crossref-Abfragen auf. Die Domain baut ausschließlich feste HTTPS-API- und DOI-URLs, validiert Metadaten und rendert fremde Texte über React. Der Transport begrenzt Bytes und Zeit, verwirft Weiterleitungen und sendet keine Credentials. Kein selbst erfundener Kontakt für den Crossref polite pool.

## ADR-004: Native Dateien

Akzeptiert, 2026-10-17. Der offizielle Tauri-Dialog-Plugin erweitert den Dateisystemscope zur Laufzeit ausschließlich um gewählte Dateien. Die Capability enthält nur die tatsächlich verwendeten Dialog-/Text-/Stat-Kommandos, keine globale Verzeichnisfreigabe. Speichern öffnet immer einen sichtbaren Speichern-unter-Dialog. Es gibt keine unbeaufsichtigten Schreibvorgänge, keine automatische Projektüberwachung und kein dauerhaft gespeichertes Dateipfadregister.

Der ausgewählte Pfad, der gelesene Inhalt und ein sitzungsbezogener Stand bleiben jetzt im Arbeitsspeicher. Vor dem erneuten Schreiben an diesen Pfad vergleicht die Sitzung nach dem Speicherdialog den aktuellen Inhalt mit der geöffneten beziehungsweise zuletzt gespeicherten Fassung. Beobachtete externe Änderungen verhindern den Schreibaufruf; der Nutzer kann unter einem neuen Namen speichern oder die externe Fassung öffnen. Erst ein erfolgreiches Schreiben ändert den gespeicherten Stand und den angezeigten tatsächlichen Dateinamen. Abbruch und Fehler lösen die Aktionssperre, ohne die letzte erfolgreiche Fassung fortzuschreiben.

Während einer Dateiaktion bleiben Dokument und Werkzeuge gesperrt; auch ein Wechsel zum einfachen Editor hebt diese Sperre nicht auf. Ein neues Dokument verwirft den bisherigen Sitzungspfad. Es gibt kein persistentes Pfadregister und keine stillen Folgezugriffe nach App-Neustart.

Diese Inhaltsprüfung ist optimistisch: keine atomare Compare-and-swap-Operation, keine Garantie gegen Symlink-/Hardlink-Aliase oder einen weiteren Schreibvorgang zwischen Vergleich und Schreiben. Atomare Speicherung mit Dateiidentität und Wiederherstellung bleibt eine eigene nächste Etappe. Ein fehlgeschlagener Betriebssystem-Schreibvorgang kann vor dieser Etappe bereits teilweise Daten geschrieben haben. Browserdownloads werden als angefordert bezeichnet, nicht als garantiert auf Disk gesichert.

`test/native-session.html` ist eine reine Entwicklungsoberfläche mit simulierten Dialogen und speicherinternem Datenträger. Sie verwendet den echten App-/Sitzungscode zur UI-Prüfung; der normale Produktionsbuild enthält sie nicht. Diese Prüfung ersetzt keine Windows-WebView-/Dateidialog-E2E-Abnahme.

## ADR-005: Kein unisolierter Compiler

Akzeptiert, 2026-10-17. Die App führt weder C noch LaTeX aus. Ein künftiger App-PDF-Compiler benötigt eine enge Dateisystem-/Prozessgrenze, Ressourcenlimits und kontrollierte Anzeige. Shell-Escape-Abschaltung allein reicht nicht. Tests dürfen ausschließlich selbst erzeugte Fixtures extern kompilieren; das schaltet keine Kompilierfunktion für Benutzerdateien frei.

## Datenfluss

Bearbeiten → begrenzte lokale Struktur → Dokument-/Themenansicht. Einfügen → reine validierte Transformation → neuer Entwurf. Forschungsklick mit Einwilligung → ausgewählter Titel → Crossref → validierte Artikel-/Dissertationsmetadaten → DOI-Links. Widerruf → Abbruch und Entfernung der Ergebnisse. Keine automatische Übertragung des Entwurfs.

## Reproduzierbarkeit

JavaScript-Abhängigkeiten über pnpm-lock.yaml, Rust-Toolchain über rust-toolchain.toml; Cargo.lock ist erzeugt und mitversioniert. Eine native Buildfreigabe benötigt zusätzlich den tatsächlich bestandenen Zielplattform-Build. Source, Testausgaben und tatsächlich geprüfte Plattformen müssen in jeder Übergabe getrennt dokumentiert werden. Großer lazy Monaco-Chunk ist eine bekannte Buildwarnung, keine ausgelagerte CDN-Abhängigkeit.
