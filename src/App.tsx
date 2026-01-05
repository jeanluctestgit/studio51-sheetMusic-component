import { EditorView } from "./components/EditorView";

const App = () => {
  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">Studio51</p>
          <h1>Éditeur de partitions staff-first</h1>
          <p className="app__subtitle">
            Source de vérité = partition. La tablature est dérivée via un mapping d&apos;instrument.
            Cliquez pour placer des notes, glissez pour ajuster le pitch et utilisez la barre
            d&apos;outils pour les durées, articulations et effets.
          </p>
        </div>
        <div className="app__badge">Vite + React + SVG</div>
      </header>
      <EditorView />
    </div>
  );
};

export default App;
