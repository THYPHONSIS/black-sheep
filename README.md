# Black sheep

**Ein lokales, quelloffenes LaTeX-Studio mit Synapse-Themen und freiwilliger Forschungssuche.** MIT-Lizenz.

Black sheep hat einen dunklen Arbeitsbereich mit Dokumentstruktur links, LaTeX-Quelltext rechts und den aus der Gliederung abgeleiteten Themen darunter. Es ist eine konkrete Umsetzung des jüngeren LaTeX-only-Produktstands der Entwicklerübergabe. Der ältere C-/VS-Code-Plan gilt für diese Ausgabe nicht.

## Direkt benutzen

- Windows: `Starten.cmd` doppelklicken. Beim ersten Start werden die gepinnten JavaScript-Abhängigkeiten installiert.
- Bereits erzeugte Einzeldatei: `testversion/Black-sheep-Testversion.html` im Browser öffnen. Dafür ist kein Server nötig. Die Einzeldatei wird mit dem unten angegebenen Befehl aus denselben Quellen erstellt.
- Entwicklung: <http://127.0.0.1:5174>. Der feste Port vermeidet eine Kollision mit dem älteren HTL-Projekt auf 5173.

Voraussetzung für die Entwicklung: Node.js **24.13 oder neuer** und pnpm **11.25.0**.

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

Die eigentliche App startet offline. Nur die separat aktivierte Forschungssuche braucht eine Internetverbindung.

## Was funktioniert

1. **LaTeX bearbeiten:** lokal gebündelter Monaco-Editor oder umschaltbarer einfacher Texteditor. Dokumenttitel, Abschnitte und Formeln aktualisieren die Strukturansicht.
2. **Bausteine ergänzen:** Abschnitte, Unterabschnitte, Formeln, Aufzählungen, Seitenumbrüche, Ränder und Seitenköpfe. Benötigte Pakete werden ohne Duplikate ergänzt. Fehlende Dokumentgrenzen liefern einen Fehler und lassen den Entwurf unverändert.
3. **Tabellen:** Raster für 1–8 Zeilen und Spalten, auch mit Pfeiltasten bedienbar.
4. **Diagramme:** `Label;Wert` mit 1–12 Zeilen; Dezimalpunkt und Dezimalkomma. Säulen- und Liniendiagramme werden als editierbarer `pgfplots`-Quelltext eingefügt. Ungültige Zahlen oder TeX-Steuerzeichen in Kategorien werden abgewiesen.
5. **Dateien:** `.tex` bewusst öffnen und exportieren. Im Browser ist der Export ein Download; dessen Speicherung muss im Browser geprüft werden. Die Desktopvariante verwendet sichtbare native Öffnen-/Speichern-unter-Dialoge.
6. **Synapse:** bis zu 30 lokale Abschnittsthemen, Sprung zur Quelltextzeile im Monaco-Editor. Optional je Thema Crossref-Metadaten für Forschungsartikel und Dissertationen suchen.

Es gibt kein stilles Autosave. Vor dem Verlassen eines geänderten Entwurfs warnt der Browser. Ein Browserdownload setzt den Änderungszustand bewusst nicht auf „sicher gespeichert“ zurück. Das Dokumentlimit beträgt 200.000 Zeichen.

## Forschung und Datenschutz

Die Forschungssuche ist standardmäßig aus. Nach Freigabe startet erst ein zusätzlicher Klick auf **Forschung finden** die Anfrage. Nur der gewählte Abschnittstitel wird an `https://api.crossref.org/works` gesendet, niemals der vollständige Entwurf.

- Zwei ausdrücklich gefilterte Abfragen: `journal-article` und `dissertation`, je höchstens sechs Metadatentreffer.
- Höchstens zehn validierte, deduplizierte Ergebnisse; neun Sekunden Zeitgrenze und 300 kB pro Antwort.
- Keine Cookies/Anmeldedaten an Crossref, kein Referrer und keine HTTP-Weiterleitungen.
- DOI-Links ausschließlich aus einer validierten DOI und dem festen Host `https://doi.org`; fremde URL-/HTML-Felder werden nicht übernommen.
- Das abschaltbare Erstanbieter-Cookie `bs_research` merkt die Freigabe für 30 Tage (`SameSite=Strict`, `Path=/`, `Secure` bei HTTPS). Bei `file://` ohne Cookies dient der Sitzungsspeicher als Fallback. Es enthält keine Dokumentdaten.
- Widerruf bricht laufende Recherche ab und entfernt angezeigte Treffer. Netzwerk-/CORS-/Limitfehler sind sichtbar und beeinträchtigen den lokalen Editor nicht.

Metadaten sind Forschungshinweise. Sie beweisen keine fachliche Übereinstimmung, keinen Peer Review und keinen freien Volltextzugang. Es gibt keine Telemetrie, Cloud-AI, Embeddings oder automatischen Agenten.

## Prüfen und bauen

```sh
pnpm quality
pnpm testversion:build
pnpm desktop:bundle-check
```

`quality` führt die Verhaltenstests der Transformationen und Forschungstransporte sowie TypeScript Strict und den Frontend-Build aus. `testversion:build` erzeugt eine eigenständige HTML-Datei mit CSP und gehashtem Inline-Skript. Monaco und dessen Worker werden aus lokalen Paketen gebaut; es gibt keine CDN-Abhängigkeit. Die Einzeldatei startet standardmäßig mit dem einfachen Editor.

Die native Desktopvariante verwendet Tauri 2. Rust ist über `rust-toolchain.toml` gepinnt. Für Windows werden zusätzlich Microsoft C++ Build Tools und das Windows SDK benötigt; für andere Systeme gelten die [offiziellen Tauri-Voraussetzungen](https://v2.tauri.app/start/prerequisites/).

```sh
pnpm desktop:dev
pnpm desktop:build
```

Native Fähigkeiten gelten nur für das Hauptfenster. Öffnen/Speichern erteilen über den offiziellen Dialog-Plugin ausschließlich Zugriff auf ausgewählte Dateien; keine rekursiven Home-/Dokumentordnerrechte und keine Shell-Capability. Vorhandene Dateien werden nur nach bewusstem Speichern-unter-Vorgang ersetzt. Bei der aktuell geöffneten Datei verhindert eine nach dem Dialog beobachtete externe Inhaltsänderung den Schreibaufruf. Der tatsächliche Dateiname und der Stand dieser Sitzung werden nach Erfolg angezeigt. Abbruch oder Fehler bestätigen keinen gespeicherten Stand; parallele Dateiaktionen und Bearbeitung während des Dialogs sind gesperrt.

Das ist eine optimistische Inhaltsprüfung, noch keine atomare oder alias-sichere Speichertransaktion. Native Dialog-, Download- und Plattformverhalten müssen auf dem Zielsystem gesondert geprüft werden. Der [Etappenplan](docs/plans/2026-10-18-black-sheep-delivery.md) beschreibt den weiteren Ausbau.

## Code finden

```text
apps/desktop/src/
├── App.tsx                     # Arbeitsfläche und bewusste Benutzeraktionen
├── components/MonacoEditor.tsx  # lokaler Editor und Fallback
├── components/TablePicker.tsx   # Tabellenraster und Tastaturbedienung
├── domain/latex.ts              # begrenzte Struktur und sichere Bausteine
├── domain/research.ts           # feste Queries und Metadatenvalidierung
├── domain/researchClient.ts     # Abbruch, Größenlimit, Credentials-Regeln
├── domain/consent.ts            # Freigabe-Cookie/Sitzungsfallback
├── domain/nativeFiles.ts        # explizite Dateidialoge
└── styles/app.css
apps/desktop/src-tauri/          # minimaler Tauri-Kern und Capabilities
tests/                          # ausführbare Verhaltenstests
scripts/                        # Einzel-HTML und Bundle-Prüfung
docs/architecture.md            # aktive Architektur und Grenzen
```

## Bewusste Grenzen

Die Dokumentansicht verwendet einen begrenzten, nicht expandierenden LaTeX-Strukturparser und zeigt kein gesetztes PDF. Er erkennt `title`, `section`, `subsection` und `subsubsection`, geschachtelte Gruppen, optionale Kurzformen, Kommentare und literale `verb`-/`verbatim`-/`verbatim*`-Bereiche. Standarddefinitionen (`newcommand`-Familie, `def`-Familie, `newenvironment`/`renewenvironment` und `NewDocumentCommand`-/`NewDocumentEnvironment`-Familien) bleiben als gespeicherte Tokens undurchsichtig; darin stehendes `verb` wird nicht ausgeführt. Befehle in geschweiften Argumentgruppen und in Kurzformen werden nicht als eigene Themen übernommen.

Themen tragen exklusive Quellbereiche in UTF-16-Zeichenpositionen sowie die ursprüngliche Zeilennummer. LF, CRLF und CR bleiben bei dieser Erkennung unterscheidbar; die Quelle wird nicht umgeschrieben. Unvollständige Gruppen liefern begrenzte Hinweise. Das ist keine TeX-Ausführung: Makroexpansion, Bedingungen, eigene Catcodes, Paketumgebungen wie `minted`/`lstlisting` und externe `input`-Dateien werden nicht semantisch aufgelöst. Die Struktur beschreibt literale Befehle im gesamten Puffer, auch außerhalb eines Dokumentbereichs. Diagramme werden erst in einem externen TeX-Lauf gesetzt. Ein Compiler für beliebige Benutzerdokumente ist nicht eingebaut; `-no-shell-escape` allein wäre keine sichere TeX-Sandbox.

Es gibt kein Excel-kompatibles Arbeitsblatt, keine aktive Workspace-Überwachung, keinen semantischen Knowledge Graph, keinen Skill-Tree und keine autonomen Lernagenten. Diese älteren beziehungsweise späteren Ziele werden nicht als vorhandene Funktionen ausgegeben. Die Browser-Testversion und native Desktopfreigabe sind getrennte Nachweise.

## Quellcode auf GitHub

[GitHub: THYPHONSIS/black-sheep](https://github.com/THYPHONSIS/black-sheep) · [Code im Browser bearbeiten](https://github.dev/THYPHONSIS/black-sheep)

Änderungen bleiben in einem normalen Git-Repository auf `main`. Für lokale spätere `git push`-Befehle ist eine eigene GitHub-Anmeldung nötig; alternativ im zum Repository gehörenden Codespace arbeiten. Keine Zugangsdaten gehören in Code, URLs oder Logs.

## Mitentwickeln

Issue mit reproduzierbaren Schritten anlegen, Branch erstellen, passende Verhaltenstests und `pnpm quality` ausführen. Sicherheitsprobleme nicht mit privaten Dokumenten oder Zugangsdaten als öffentliches Issue reproduzieren. Die MIT-Lizenz steht in `LICENSE`.
