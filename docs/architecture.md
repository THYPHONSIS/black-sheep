# Aktive Architektur

## Produktentscheidung

Black sheep ist das LaTeX-Programm; Synapse bezeichnet die lokale Themenansicht und die freiwillige Verknüpfung zu Forschungsmetadaten. Die jüngere Entwicklerübergabe und die ausdrückliche Auswahl des Nutzers ersetzen den vorherigen C-/LaTeX- und VS-Code-Entwurf. Das alte Quellarchiv wurde dieser lokalen Sitzung nicht mitgeliefert; diese Implementierung wurde aus den übergebenen Anforderungen aufgebaut. Frühere Testzahlen werden nicht als eigene Tests ausgegeben.

## ADR-001: Lokale Kernfunktionen

Akzeptiert, 2026-10-17. React/TypeScript und ein lokaler Monaco-ESM-Build bilden dieselbe Anwendung in Browser und Tauri ab. Pure Domain-Funktionen besitzen keine Datei-, Netzwerk- oder Datenbankrechte. Dokumentinhalt lebt im Arbeitsspeicher und wird nur auf Benutzerbefehl geöffnet/exportiert. Ein vereinfachter Editor ermöglicht eine unabhängige Einzel-HTML und zugängliche Bearbeitung.

## ADR-002: Metadaten statt vorgetäuschtem Graph

Akzeptiert, 2026-10-17. `inspectLatex` ist eine begrenzte Texterkennung mit festen Eingabe-/Ausgabelimits. Themen sind deterministisch erkannte Abschnittstitel. Keine Parser-/Graphdatenbank oder LLM-Inferenz wird behauptet. Forschungsmetadaten bleiben als ungeprüfte Hinweise von lokalen Dokumentfakten unterscheidbar.

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
