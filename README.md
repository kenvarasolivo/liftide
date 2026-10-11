# Liftide

A Next.js gym companion with a charcoal, steel and amber visual identity.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. `npm run build` produces a static export in `out/`.

## Included

- Push, pull and leg routines with machine-specific set logging.
- Previous-session weights, editable reps, additional sets and workout history.
- Automatic rest timer with pause, resume, skip and time adjustment; clock-based countdown survives tab changes and refreshes.
- Interactive front/back muscle map, including upper chest and seven-day training coverage.
- Per-machine progress charts and editable setup notes.
- Responsive desktop and mobile layouts, accessible dialogs and keyboard-selectable muscles.
- Browser-local persistence and JSON export. Initial history is explicitly labeled sample data and can be removed in Settings.

This version uses local storage, not a cloud account. The body map shows exercise targets and logged coverage, not recovery or a prescription. Machine setups and starting weights are examples to customize.

## Structure

- `app/page.tsx`: app screens, workout state and interactions.
- `app/globals.css`: responsive visual system.
- `components/body-map.tsx`: selectable anatomical diagram.
- `lib/training.ts`: exercise library, routines and workout calculations.
- `public/gym-hero.png`: generated cinematic gym background.
