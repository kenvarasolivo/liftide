# Liftide

A Next.js gym companion with a charcoal, steel and amber visual identity.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. `npm run build` produces a static export in `out/`.

## Install and use offline

Deploy `out/` at the root of an HTTPS static host. The build generates a versioned
`sw.js` from the exported files, including both pages, Next.js chunks and equipment
images. Service workers are disabled in development; test a production export on
localhost or HTTPS. Serve `/sw.js` as JavaScript with `Cache-Control: no-cache`;
serve `/manifest.webmanifest` as `application/manifest+json`. Configure the host
to resolve `/train` to `/train.html` (and `/` to `/index.html`).

Use the browser's Install option, the in-app Install button when available, or
Share → Add to Home Screen on iOS. The installed app opens directly to `/train`.
After the first successful online load and service-worker installation, both
pages, workout logging, timers, history and equipment work offline. Workouts and
personal photos continue to save in local storage and IndexedDB on that device.
Clearing browser site data removes the offline cache and local training data.

New builds download in the background. An Update app banner lets you choose when
to reload; updates also activate once all existing app tabs have closed. A failed
download keeps the previous offline version. Validate by serving `out/`, opening
the app online, waiting for the worker to activate, then disabling the network
and reloading `/train`. Also check navigation from `/` to `/train` while offline.

PWA files: `app/manifest.ts`, `components/pwa-controls.tsx`,
`scripts/build-pwa.mjs`, `scripts/service-worker.js`, and `public/icons/`.

## Included

- Machine-first logging: choose equipment, enter one set, rest, then log the next set. Switch machines whenever you like.
- Previous-set weights and reps, large number controls, undo/restore and free-training session history.
- Name the current session from its top-right review dialog. The name saves while you train and carries into history when you finish.
- Automatic rest timer with pause, resume, early finish and time adjustment; clock-based countdown survives tab changes and refreshes.
- Interactive front/back muscle map, including upper chest and seven-day training coverage.
- Direct progress shortcuts on every machine card and the logging screen, with a return to logging that keeps your sets and rest timer. The default overview charts session volume (the sum of weight × reps across completed sets), with selectable sessions, changes against the previous session, and set/rep breakdowns. Weight and rep charts remain available.
- Configurable rest and editable setup notes.
- Customize primary and secondary muscle targets in machine settings, including default equipment. These targets update the body map, muscle filters and seven-day coverage; primary muscles count toward coverage.
- 46 built-in exercises covering machines, cables, barbells, dumbbells, kettlebells and bodyweight, with equipment-type and muscle filters. 46 individual equipment photographs (nine existing photos and 37 crops from six generated contact sheets), favorites, custom equipment and personal photo replacement through IndexedDB.
- Weight-entry guidance for the added exercises, including per-dumbbell, total-barbell, bodyweight and assistance conventions. Assisted-exercise charts show lowest assistance rather than highest weight.
- A responsive landing page at `/`, with the workout app at `/train`.
- Responsive desktop and mobile layouts, accessible dialogs and keyboard-selectable muscles.
- Browser-local persistence and JSON export. Existing Liftide v1 history and completed sets migrate without changing the original storage. New users start with an empty log; earlier sample data remains labeled and removable in Settings.

This version saves training in local storage and photos in IndexedDB on the current browser and device. JSON export includes training, custom machines and setup notes; photo files remain on the device. The body map shows exercise targets and logged coverage, not recovery or a prescription. Machine setups and starting weights are examples to customize.

## Structure

- `app/page.tsx` and `app/landing.css`: landing page.
- `app/train/page.tsx`: equipment picker, step-by-step logging, timers and history.
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
