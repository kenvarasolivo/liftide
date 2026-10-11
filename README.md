# Liftide

A Next.js gym companion with a charcoal, steel and amber visual identity.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. `npm run build` produces a static export in `out/`.

## Included

- Machine-first logging: choose equipment, enter one set, rest, then log the next set. Switch machines whenever you like.
- Previous-set weights and reps, large number controls, undo/restore and free-training session history.
- Automatic rest timer with pause, resume, early finish and time adjustment; clock-based countdown survives tab changes and refreshes.
- Interactive front/back muscle map, including upper chest and seven-day training coverage.
- Direct progress shortcuts on every machine card. The default overview charts session volume (the sum of weight × reps across completed sets), with selectable sessions, changes against the previous session, and set/rep breakdowns. Weight and rep charts remain available.
- Configurable rest and editable setup notes.
- Ten generated equipment photos covering eleven default machines, favorites, custom machines and personal photo replacement through IndexedDB.
- Responsive desktop and mobile layouts, accessible dialogs and keyboard-selectable muscles.
- Browser-local persistence and JSON export. Existing Liftide v1 history and completed sets migrate without changing the original storage. New users start with an empty log; earlier sample data remains labeled and removable in Settings.

This version saves training in local storage and photos in IndexedDB on the current browser and device. JSON export includes training, custom machines and setup notes; photo files remain on the device. The body map shows exercise targets and logged coverage, not recovery or a prescription. Machine setups and starting weights are examples to customize.

## Structure

- `app/page.tsx`: machine picker, step-by-step logging, timers and history.
- `app/globals.css`: responsive visual system.
- `components/body-map.tsx`: selectable anatomical diagram.
- `components/progress-chart.tsx`: per-machine progress charts.
- `lib/progress.ts`: completed-set volume, per-machine session summaries and percentage changes.
- `lib/training.ts`: default exercise library and session calculations.
- `lib/machine-training.ts`: machine state, previous values and v1 migration.
- `lib/photos.ts`: validated local photo storage.
- `public/gym-hero.png`: generated cinematic gym background.
- `public/equipment/`: optimized default equipment photos.
- `assets/equipment-prompts.md`: image generation prompts and original asset locations.
