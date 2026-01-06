import { EditorView } from "./components/EditorView";
import styles from "./styles/App.module.css";

const App = () => {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Studio51</p>
          <h1>Éditeur de partitions staff-first</h1>
          <p className={styles.subtitle}>
            Source de vérité = modèle musical. La tablature et la portée sont synchronisées en temps réel.
            Cliquez pour placer des notes, glissez pour ajuster le pitch et utilisez la barre d&apos;outils
            pour les durées, articulations, effets et playback.
          </p>
        </div>
        <div className={styles.badge}>Vite + React + SVG</div>
      </header>
      <EditorView />
    </div>
  );
};

export default App;
