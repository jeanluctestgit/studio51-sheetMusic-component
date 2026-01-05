# Studio51 Sheet Music Component

Prototype React + Vite pour un éditeur de partitions “staff-first” inspiré de Guitar Pro 8.

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
  components/        UI (Toolbar, Inspector, layout)
  editor/            state Zustand + layout helpers
  music/             modèle, mapping d'instruments, ticks, pitch
  svg/               rendu SVG interactif
```

## Ajouter un instrument (mapping tablature)

1. Ouvrir `src/music/instruments.ts`.
2. Ajouter une entrée `InstrumentDefinition` avec :
   - `id` unique
   - `name`
   - `category` (ex: `guitar`, `bass`, `ukulele`)
   - `clef`
   - `strings`: liste des MIDI des cordes (grave → aigu)
3. Le mapping tablature utilise `mapPitchToTab` (`src/music/mapping.ts`) qui choisit la corde
   avec le plus petit fret possible (0–24).
4. Les pistes instrumentées peuvent activer la tablature depuis l’inspecteur.

## Ajouter un nouvel outil

1. Déclarer l’outil dans `src/music/types.ts` (`ToolId`).
2. Ajouter le bouton correspondant dans `src/components/Toolbar.tsx`.
3. Implémenter l’action dans `src/svg/StaffView.tsx` :
   - gérer le `activeTool` dans `handlePointerDown`
   - implémenter l’action souhaitée (insertion, suppression, etc.)
4. (Optionnel) Ajouter un raccourci clavier dans `src/components/EditorView.tsx`.

## Build

```bash
npm run build
npm run preview
```
