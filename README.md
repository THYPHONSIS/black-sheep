# Neues Projekt

Ein eigenständiges neues Codeprojekt als Grundlage für unsere nächste Anwendung. Technische Basis: React, TypeScript und Vite, ähnlich dem früheren Blacksheep-Projekt. Das frühere Projekt wird nicht verändert oder kopiert.

Projektname und Produktfunktionen sind noch offen. Die vorhandene Startseite ist eine lauffähige Grundlage, keine fertige Fachanwendung.

## Starten

Voraussetzung: Node.js 24.13 oder neuer. Unter Windows `Starten.cmd` doppelklicken. Alternativ im Projektordner:

```powershell
npm ci
npm run dev
```

Die lokale App läuft auf <http://127.0.0.1:5174>. Port 5174 ist absichtlich fest, damit sich dieses Projekt nicht mit der bestehenden Lernapp auf Port 5173 überschneidet. Beenden mit Strg+C. Falls der Port belegt ist, den anderen Prozess beenden oder `npm run dev -- --port 5175` verwenden.

## Code bearbeiten

Den gesamten Projektordner in Codex oder einem Codeeditor öffnen. Änderungen speichern; Vite aktualisiert die Browseransicht automatisch.

```text
neues-projekt/
├── src/
│   ├── App.tsx       # Startansicht und spätere Funktionen
│   ├── main.tsx      # Einstiegspunkt
│   └── styles.css    # Gestaltung
├── index.html       # HTML-Grundgerüst
├── vite.config.ts   # Entwicklungs- und Build-Konfiguration
├── tsconfig.json    # TypeScript-Einstellungen
├── package.json     # Abhängigkeiten und Befehle
├── package-lock.json
├── Starten.cmd      # Windows-Schnellstart
└── README.md
```

## Prüfen und bauen

```powershell
npm run check
npm run preview
```

`check` prüft TypeScript und erzeugt den Produktionsbuild in `dist/`. `preview` zeigt diesen Build unter <http://127.0.0.1:4174>. Es gibt bisher keine eigene Geschäftslogik und deshalb noch keine automatisierten Funktionstests.

## Git und GitHub

Dieses Projekt hat ein eigenes Git-Repository auf dem Branch `main`. Die lokale Versionsverwaltung funktioniert unabhängig von einer GitHub-Anmeldung.

```powershell
git status
git log --oneline
```

Das private Online-Repository gehört dem im Browser angemeldeten Konto **THYPHONSIS**:

[GitHub: THYPHONSIS/neues-projekt](https://github.com/THYPHONSIS/neues-projekt)

Der Startcode wird im zum Repository gehörenden Codespace veröffentlicht. Der lokale Ordner und das Online-Repository verwenden dieselbe Git-Historie auf `main`.

[Code direkt im Browser öffnen](https://github.dev/THYPHONSIS/neues-projekt)

Die lokale Git-Kommandozeile benötigt für spätere Online-Zugriffe eine eigene GitHub-Anmeldung, zum Beispiel über GitHub Desktop. Danach Änderungen wie üblich speichern und veröffentlichen:

```powershell
git add src
git commit -m "Add first feature"
git push
```

Neue Änderungen von GitHub mit `git pull` übernehmen. Zugangsdaten gehören weder in den Code noch in diese Anleitung.

Der lokale Ordner kann in GitHub Desktop über **File → Add local repository** oder in Codex als vorhandener Projektordner geöffnet werden. Alternativ das Online-Repository neu klonen; eine solche Kopie enthält bereits die Online-Historie.

## Nächster Entwicklungsschritt

1. Namen und Zweck der neuen Anwendung festlegen.
2. Die erste echte Funktion in `src/App.tsx` umsetzen.
3. Bei Bedarf Backend, Datenbank und passende Tests ergänzen.

## Technische Referenzen

- [Vite: Einstieg und Befehle](https://vite.dev/guide/)
- [React: Dokumentation](https://react.dev/learn)
