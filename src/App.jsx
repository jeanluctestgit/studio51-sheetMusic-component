import SheetMusic from "./components/SheetMusic.jsx";

const App = () => {
  return (
    <main className="page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Studio51</p>
          <h1>Partition & tablature interactive</h1>
          <p className="subtitle">
            Prototype inspiré Guitar Pro 8 : cliquez sur une note pour obtenir
            l'information et survolez pour mettre en évidence la position.
          </p>
        </div>
        <div className="badge">Vite + React</div>
      </header>
      <section className="card">
        <SheetMusic />
      </section>
    </main>
  );
};

export default App;
