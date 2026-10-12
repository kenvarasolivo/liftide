# Neon setup

Liftide uses Neon Postgres for training data and managed Neon Auth (Better Auth)
for accounts. Passwords and sessions are managed by Neon Auth; the application
never stores passwords in workout records. The existing login, signup, account,
email verification and password-reset screens use the Neon SDK.

## Connect your project

1. Create a Neon project and enable managed **Neon Auth** on the selected branch.
   In the console, use **Project > Branch > Auth > Enable Auth**, then open
   **Configuration** and copy the Auth URL. The database connection string is
   separate from this URL.
2. Copy `.env.example` to `.env` or `.env.local`. Set:
   - `DATABASE_URL`: a **direct or pooled** Postgres connection string, using the owner
     role that creates the training table (normally `neondb_owner`).
   - `NEON_AUTH_BASE_URL`: the Auth endpoint URL for that same database branch.
   - `NEON_AUTH_COOKIE_SECRET`: a random string of at least 32 characters. Generate
     it with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
3. Run `migrations/001_training_state.sql` in the Neon SQL editor. Enable Auth
   first: the migration references `neon_auth."user"` and derives the ID column's
   actual type so the foreign key matches the branch's managed schema.
4. In Neon Auth settings, enable email/password authentication and require email
   verification. Add trusted app origins, including `http://127.0.0.1:3000`,
   `http://localhost:3000`, and your production origin such as
   `https://liftide.vercel.app`. Configure the email sender before public launch.
   Signup/verification returns to `/auth/callback`; password reset returns to
   `/reset-password`. If the console exposes a redirect allowlist, add those URLs.
5. Restart development. In production set the same three variables in your hosting
   environment and redeploy. The server reads configuration through `/api/config`.

All three variables are server-only. None uses `NEXT_PUBLIC_`. Never put the
Postgres connection string in browser code or commit your populated env file.

## Hosting

Use a Next.js server host such as Vercel, or `npm run build` followed by
`npm start`. Static `out/` hosting is no longer supported: authentication is
proxied through `/api/auth/[...path]`, and `/api/training` makes private database
queries. Deploy the entire Next.js app; old exported files in `out/` are obsolete.

The service worker now caches public app shells and browser assets from the
server build. Auth endpoints, callbacks, configuration, and training API responses
are never cached. Only add public, non-personalized pages to `PUBLIC_ROUTES` in
`scripts/build-pwa.mjs`. Test offline behavior with a production server, not dev.

## Data and ownership

`public.training_state` holds one version-2 JSONB training document per account,
with a revision for atomic compare-and-save updates. Session history, current
session/rest timer, favorites, custom equipment, setup notes and muscle targets
sync. The foreign key cascades when the managed Auth user is deleted.

Every API request verifies the Neon Auth session. The API derives the user ID
from that session and never accepts a user ID from the request. SQL is parameterized
and includes that user ID on every read/write. PUT requires a same-origin request.
The owner connection is server-only; browser/Data API access to this table is not
configured. RLS is enabled with no public policies; the table owner used by the
server bypasses it. Do not expose the owner credential or grant public access.

Guest training stays at `liftide-v2`. Account caches use
`liftide-v2:account:<user-id>`. Photos have separate account-scoped IndexedDB keys
and remain device-only. The last verified account identity is cached for offline
workouts; this browser identity never authorizes server requests. Sign-out clears
the cached identity but preserves account workout caches for the next sign-in.

Existing guest workouts are never uploaded automatically. The Account page can
copy them into an empty account. Cloud writes are serialized; stale revisions
stop sync and prompt the user to export the local copy before loading the cloud
copy. The local copy is also backed up before replacement. The offline and conflict
behavior in `lib/training-sync.ts` is independent of the database provider.

## Verification

`npm test` covers offline sync and account isolation plus migration/SQL/API tests
using local Postgres through PGlite. These include unauthorized requests, foreign
origins, caller-supplied IDs, revision conflicts and account-deletion cascades.

After connecting a real project, verify signup, email delivery and confirmation,
login, password reset, logout, and loading the same account in a second browser.
Live Neon Auth and production email delivery cannot be tested without your project.

References: [Neon Next.js Auth SDK](https://github.com/neondatabase/neon-js/blob/main/packages/auth/NEXT-JS.md)
and [managed Neon Auth](https://neon.com/docs/auth/overview).
