# Studio51 Sheet Music Component

MVP React + Vite pour un éditeur de partitions et tablatures type Guitar Pro 8.

## Démarrer

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test
```

## Architecture

```
src/
  music/            modèle musical, instruments, mapping pitch ↔ tab
  editor/           layout multi-systèmes, outils, hit tests
  svg/              rendu SVG (portée, tablature, overlays)
  components/       UI (Toolbar, Inspector, Viewport)
  playback/         audio engine Web Audio
  state/            store Zustand + commandes undoables
  utils/            utilitaires (id, etc.)
```

### Choix du styling

Le MVP utilise **CSS Modules** pour isoler les styles des composants (Toolbar, Inspector, layout),
avec un fichier global minimal pour les styles SVG partagés.

## Modèle musical

Le coeur est un `MusicalEvent` (dans `src/music/types.ts`) :

- `pitches[]` : source de vérité musicale (MIDI)
- `durationTicks`, `startTick`
- `articulations`, `ornaments`, `effects`
- `performanceHints` (string, fret, position, fingering)

La tablature est une **vue dérivée** : si des `performanceHints` sont présents, ils sont utilisés,
sinon un mapping automatique choisit la corde + fret la plus ergonomique.

## Ajouter un nouvel outil

1. Déclarer l’outil dans `src/music/types.ts` (`ToolId`).
2. Ajouter le bouton correspondant dans `src/components/Toolbar.tsx`.
3. Implémenter l’action dans `src/editor/tools.ts` :
   - gérer `onPointerDown` / `onPointerMove` / `onPointerUp`
   - appeler les actions du store (`addNoteAt`, `updateEvent`, etc.)
4. (Optionnel) Ajouter un raccourci clavier dans `src/components/EditorView.tsx`.

## Ajouter un instrument (mapping tablature)

1. Ouvrir `src/music/instruments.ts`.
2. Ajouter une entrée `InstrumentDefinition` avec :
   - `id` unique
   - `name`
   - `category` (ex: `guitar`, `bass`, `ukulele`)
   - `clef`
   - `strings`: liste des MIDI des cordes (grave → aigu)
3. Le mapping utilise `mapEventsToTabPositions` (`src/music/mapping.ts`) qui choisit
   la corde avec le plus petit fret possible (0–24), sauf si `performanceHints` est présent.

## Limites du MVP

- Pas de rendu de ligatures complexes (beams avancés, tuplets graphiques détaillés).
- Chords symboliques seulement (pas de diagrammes).
- Le playback utilise un oscillateur simple (pas de soundfonts).
- Le layout multi-systèmes est un auto-break basique (pas de justification horizontale complète).

## Build

```bash
npm run build
npm run preview
```
