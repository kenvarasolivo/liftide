# Liftide

A Next.js gym companion with a charcoal, steel and amber visual identity.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000. Neon Auth accepts localhost for local sign-in; authentication pages opened through 127.0.0.1 redirect to localhost in development. Build with `npm run build`, then use `npm start` or deploy the Next.js app to Vercel. Neon auth and database APIs require a server runtime; static `out/` hosting is no longer used.

## Install and use offline

The build generates `public/sw.js` from public assets and Next.js browser chunks.
Deploy the Next.js app on an HTTPS server host. Service workers are disabled in
development; test with `npm run build` and `npm start` on localhost or HTTPS.
The worker caches public page shells and equipment, never auth or training APIs.

Use the browser's Install option, the in-app Install button when available, or
Share → Add to Home Screen on iOS. The installed app opens directly to `/train`.
After the first successful online load and service-worker installation, public
page shells and equipment are available offline. Training records are loaded
from the account database and require a connection. Logging a set writes it
immediately; the UI says saved only after the database acknowledges it. No new
workout records are persisted to localStorage or IndexedDB. Uploaded equipment
photos remain device-only and account-scoped; theme and authentication storage
are separate from workout persistence.

Open sessions appear in History from the first logged set. Finishing gives the
session a name and completion timestamp; it is not required to preserve sets.
Network failures leave changes pending in memory, show an unsaved warning, and
retry on reconnect or every 15 seconds while visible. Keep the page open until
saving succeeds. Refreshing or closing while writes are pending triggers the
browser's unsaved-changes warning. Other devices' changes are refreshed and
revision conflicts retry against the latest database record automatically.

New builds download in the background. An Update app banner lets you choose when
to reload; updates also activate once all existing app tabs have closed. A failed
download keeps the previous offline version. Validate by running a production server, opening
the app online, waiting for the worker to activate, then disabling the network
and reloading `/train`. Also check navigation from `/` to `/train` while offline.

PWA files: `lib/app-manifest.ts`, `app/manifest.webmanifest/route.ts`, `components/pwa-controls.tsx`,
`scripts/build-pwa.mjs`, `scripts/service-worker.js`, and `public/icons/`.

## Accounts and Neon

Login, create-account, confirmation, password reset and account pages use managed
Neon Auth; training data is stored in Neon Postgres through server-only APIs.
Copy `.env.example` to `.env.local` or `.env` when your project is ready. Set
`DATABASE_URL`, `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`, then run the
Neon SQL migration. See [neon/README.md](neon/README.md) for complete setup.
Without credentials, the app remains in preview mode; saving requires login. All credentials are
server-only. Signed-in training uses private per-user database records. Photos stay device-only. Guests cannot save training or photos. Old account-scoped unsynced sessions are recovered into the matching account automatically, with a database receipt preventing repeat imports. Old device records remain untouched; guest-era workouts can be copied into an empty account from the Account page.

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
- Login-required persistence and JSON export, with immediate database writes and automatic revision retries. Guests have transient exercise previews only. Legacy local records remain untouched and can be recovered after login.

Saving requires login. Training saves directly to the account database; photos remain in account-scoped IndexedDB on the current device. JSON export includes training, custom machines and setup notes; photo files remain on the device. The body map shows exercise targets and logged coverage, not recovery or a prescription. Machine setups and starting weights are examples to customize.

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
