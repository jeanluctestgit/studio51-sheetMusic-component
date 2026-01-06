# StaffFirst Editor

Minimal Guitar Pro–style **staff-first** SVG editor built with React 18, TypeScript, Vite, Zustand, TailwindCSS, and Vitest.

## Quick start

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
 ├─ main.tsx
 ├─ App.tsx
 ├─ store/scoreStore.ts
 ├─ music/
 │   ├─ types.ts
 │   ├─ mapping.ts
 │   └─ pitchUtils.ts
 ├─ editor/
 │   ├─ tools/NoteTool.ts
 │   ├─ tools/SelectTool.ts
 │   ├─ tools/EraseTool.ts
 │   └─ hitTest.ts
 ├─ svg/
 │   ├─ Staff.tsx
 │   ├─ NoteHead.tsx
 │   ├─ TabNumber.tsx
 │   └─ Caret.tsx
 └─ components/
     ├─ Toolbar.tsx
     ├─ Viewport.tsx
     └─ Inspector.tsx
```

## Adding a new instrument mapping

1. Open `src/music/mapping.ts`.
2. Add a new `InstrumentDefinition` to `INSTRUMENTS` with the desired open-string MIDI pitches.
3. The tablature renderer (`src/components/Viewport.tsx`) uses `mapPitchToTab` to derive string/fret from pitch.

## Adding a new tool

1. Create a tool module in `src/editor/tools/` (see `NoteTool.ts`, `SelectTool.ts`).
2. Export a tool object with an `onPointerDown` handler.
3. Register the tool in `src/components/Viewport.tsx` (`toolMap`) and add a toolbar button in `src/components/Toolbar.tsx`.

## Notes

- The score is the source of truth. Tablature is derived from pitch via the mapping engine.
- The editor persists the score in `localStorage` and provides JSON import/export in the Inspector panel.
- Caret blinking is driven via `requestAnimationFrame` for smooth animation.
