# Architecture notation — Staff-first MVP

## Phase 1 — Spec (modèle + moteur de layout)

### Source of truth = staff events
- Le score est un graphe d’événements temporels **sur la portée** (`NoteEvent`, `RestEvent`, `ChordSymbolEvent`, etc.).
- Les événements vivent dans des mesures/voix et sont indexés en **ticks**.
- La **tablature** n’est **pas** éditée directement : elle est une **projection** déterministe du staff + l’instrument.
- La tablature est recalculée à chaque rendu en fonction :
  - du pitch MIDI des notes,
  - des cordes disponibles de l’instrument,
  - d’un algorithme simple de choix de position.

### Ticks (PPQ) & quantization
- Choix MVP : **480 ticks = 1 noire**.
- Conséquence : `ticksPerWhole = 1920`.
- Quantization :
  - la grille dépend de la durée active (noire, croche, etc.),
  - on quantize en “snap” sur la grille : `round(tick / grid) * grid`,
  - support des pointés et triolets en multipliant la valeur de base.

### Key signature + accidentals (règles simplifiées MVP)
- On stocke la key signature au niveau du score (ex: `C`, `G`, `D`, `F`, `Bb`).
- Règles MVP :
  1. La key signature définit une **altération par défaut** des degrés.
  2. Une note “staff” sans `accidental` explicite hérite de cette altération.
  3. Une `accidental` explicite (`#`, `b`, `natural`) s’applique **uniquement** à la mesure courante.
  4. Pas de gestion avancée (double dièses, enharmonie contextuelle, etc.).

### Layout engine (staff-first)
- **Horizontal spacing** :
  - la largeur d’une mesure est fixe (MVP),
  - chaque subdivision de mesure consomme un espace proportionnel : `x = margin + (tick / ticksPerMeasure) * measureWidth`.
  - collisions simples : décaler les symboles horizontaux si overlap (MVP = éviter les collisions majeures).
- **Vertical mapping** :
  - conversion `pitchMidi -> staffStep -> y`,
  - `staffStep` avance par demi-interligne,
  - le point de référence dépend de la clef (ex: ligne du bas = E4 en clé de sol).

### Hit-testing
- Projection `(x, y)` vers :
  - **measure** (index) via `floor((x - margin) / measureWidth)`,
  - **tick** via proportion de la mesure,
  - **staffLine** via la distance à la ligne la plus proche.
- Tolérances :
  - `xTolerance` et `yTolerance` pour “snapper” aux lignes/positions proches.
- Le résultat alimente :
  - placement de notes,
  - sélection,
  - drag de pitch/timing.

## Phase 2 — MVP code (React + TS + SVG)

### Composants clés
- `ScoreViewport` (`src/svg/ScoreViewport.tsx`) : rendu SVG principal.
- Outils : `SelectTool`, `NoteTool`, `RestTool`, `EraseTool` (`src/editor/tools.ts`).
- Store global : Zustand (`src/editor/store.ts`).
- Mapping tablature : `mapNotesToTabPositions` (`src/music/mapping.ts`).

### Flux d’édition
1. L’utilisateur clique => conversion `(x, y)` -> `(tick, pitchMidi)` via hit-testing.
2. Le `ToolHandler` applique l’action (création, suppression, sélection).
3. Le staff reste la source de vérité.
4. Si un instrument à cordes est assigné, la tablature est recalculée et affichée.

### Mapping instrument (guitare standard)
- Instrument “Generic” n’affiche pas la tablature.
- “Guitar Standard EADGBE” :
  - apparition automatique de la tablature,
  - choix de position :
    1. on privilégie les **frettes les plus basses**,
    2. à égalité, on **minimise les sauts** (écart fret + corde) par rapport à la note précédente.

### Performance & SVG
- **SVG only** : tout le rendu visuel est vectoriel.
- **Overlay séparé** : calque dédié pour la caret/selection box.
- **Memoization** : couches `BackgroundLayer`, `NotesLayer`, `TabLayer`, `OverlayLayer` pour limiter les rerenders.
- Aucune lib lourde de notation musicale.
