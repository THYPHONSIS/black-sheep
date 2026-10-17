export default function App() {
  return (
    <main className="workspace">
      <header className="topbar">
        <a className="brand" href="#start" aria-label="Neues Projekt – Start">
          <span className="brand-mark" aria-hidden="true">N.</span>
          <span>Neues Projekt</span>
        </a>
        <span className="tag">Version 0.1</span>
      </header>

      <section className="intro" id="start" aria-labelledby="title">
        <p className="eyebrow">Ein neuer Anfang</p>
        <h1 id="title">Platz für deine<br /><span>nächste Idee.</span></h1>
        <p className="description">
          Die Grundlage steht. Ab hier entwickeln wir deine neue Anwendung
          Schritt für Schritt.
        </p>
        <a className="primary-link" href="#projekt">
          Das Projekt kennenlernen <span aria-hidden="true">↘</span>
        </a>
      </section>

      <section className="details" id="projekt" aria-label="Projektgrundlage">
        <article>
          <span className="number" aria-hidden="true">01</span>
          <h2>Dein Code</h2>
          <p>Die Startansicht liegt in <code>src/App.tsx</code>. Hier beginnt die Entwicklung.</p>
        </article>
        <article>
          <span className="number" aria-hidden="true">02</span>
          <h2>Direkt ausprobieren</h2>
          <p>Mit <code>npm run dev</code> starten. Gespeicherte Änderungen erscheinen direkt im Browser.</p>
        </article>
        <article>
          <span className="number" aria-hidden="true">03</span>
          <h2>Offen für deine Idee</h2>
          <p>Name und Funktionen legen wir gemeinsam fest. React und TypeScript sind vorbereitet.</p>
        </article>
      </section>

      <footer className="footer">
        <span>Neues Projekt</span>
        <span>Bereit zum Weiterbauen.</span>
      </footer>
    </main>
  );
}
