# REAL / REMAX HomeFax

A HomeFax is the permanent record of a house: what was built, repaired,
inspected, permitted and sold, who vouched for each entry, and a hash chain that
proves nothing was edited after the fact. This repository implements the
14-screen demo described in `design/` for all three roles — agent, homeowner and
contractor — end to end.

Three ideas run through everything here, and they are worth knowing before
reading the code:

- **The record is append-only.** Events are chained with SHA-256 over their own
  fields plus the previous hash. Correcting a record means appending a
  correction, and the Verify Ledger panel recomputes the whole chain on demand.
- **Nobody writes to a record they have not earned access to.** Whether the
  current user may contribute is decided in one place on the server
  (`contributeState` in `apps/api/src/services/claim-service.ts`), and the UI
  only reflects that answer. A contractor can never write from a property page,
  only propose through a job the homeowner accepts.
- **AI proposes, a person approves.** Extraction produces a draft with every
  field editable and cannot mark its own work verified. Ask This Home answers
  only from the record in front of it and says so when the record is silent.

## Quick start

```bash
pnpm install
pnpm db:up        # PostgreSQL 16 in Docker
pnpm db:reset     # schema, migrations and the demo dataset
pnpm --filter @homefax/web dev
```

Then open http://localhost:3000. That one process is the whole stack: with
`API_BASE_URL` unset the Fastify app runs inside the Next route handler (see
"Two run modes" below). Copy `.env.example` to `.env` first if you have not.

### Demo accounts

All three share the password `demo-password`.

| Role | Email | Lands on |
| --- | --- | --- |
| Agent | `agent@homefax.demo` | Dashboard, search, every record read-only |
| Homeowner | `owner@homefax.demo` | 123 Main Street, the showcase record |
| Contractor | `summit@homefax.demo` | Jobs, for Summit Mechanical |

The showcase HomeFax is `HF-US-CO-DEN-00001234`. `HF-US-CO-DEN-00002187` is
deliberately unclaimed, for the claim-and-verify path. The dataset is written
against a fixed reference date (`DEMO_TODAY=2026-08-28`) so expiry countdowns
read the same on any day.

## Layout

```
apps/
  web/          Next.js 16, App Router. Every screen. No database access.
  api/          Fastify 5. Routes, services, all authorisation.
packages/
  contracts/    Zod schemas and shared types. The Home Health score lives here
                so the seeder, the API and the tests cannot disagree.
  ledger/       Canonicalisation and hash chaining. No I/O.
  db/           Drizzle schema, migrations, the seeder, the database document
                store.
  fixtures/     The demo dataset. A package of its own because both the seeder
                and the fixture providers need it.
  providers/    Parcel, MLS, permit, deed, licence and storage behind
                interfaces. Swapping in a live county feed is one class.
  auth/         scrypt password hashing and HS256 sessions.
  ai/           Anthropic calls, with documented fallbacks when no key is set.
tests/e2e/      Playwright, driving a running stack.
design/         The original handoff: transcripts, build plan, screens.
```

### Two run modes

`API_BASE_URL` decides how the web app reaches the API, and nothing else
changes:

- **Unset (default).** Fastify is built in-process and requests are dispatched
  with `app.inject()`. One process, no HTTP hop when server components render,
  and it works on a platform that has nowhere to run a long-lived server.
- **Set.** The web app proxies to the standalone Fastify service
  (`pnpm --filter @homefax/api dev`). Useful when working on the API alone.

Both paths go through `apps/web/src/lib/dispatch.ts`, so the routes, plugins,
schemas and error handling are the same code either way.

## Testing

```bash
pnpm typecheck              # every package
pnpm test                   # 100 API tests plus the package suites
pnpm test:e2e               # Playwright, needs the stack running
```

The e2e suite reseeds before every run — it appends events, claims properties
and runs the contractor loop, so without that the second run would start from
the first run's leftovers.

Every element the suite touches carries a `data-testid`. They are catalogued in
`apps/web/src/lib/testids.ts` and are a contract: copy and layout may change
freely, the ids may not.

## Sharing a demo link

`READ_ONLY=true` refuses every write. Reading stays whole — records,
timelines, documents, the ledger check and Ask This Home all work — but
contributions, claims, the contractor loop and account changes are refused,
and the app says so in a banner rather than letting a button fail on someone.

Three things stay open, deliberately: signing in and out, because otherwise
nobody reaches a page at all; Ask This Home, which is a POST only because a
question does not fit in a query string and writes nothing; and the admin
routes, which are already behind a secret and are how the dataset is restored
— locking those would mean read-only mode removes the only way to undo
whatever prompted turning it on.

It is enforced in the API, not by hiding controls. A shared link reaches
browsers this app does not control, and a restriction that lives in the
interface is not a restriction.

The trade is real: the contribution flows are the argument this product makes,
so read-only is right for a link you post somewhere and wrong for a live
walkthrough. With it off, the demo is shared mutable state — one reviewer can
append a record, release a claim, or change the shared password. `POST
/api/admin/seed` puts everything back.

## Live public data

Every provider is fixture-backed by default. Two of them can read real public
data instead:

| Variable | Value | Reads |
| --- | --- | --- |
| `PARCEL_SOURCE` | `denver` | Assessor parcels from the county's ArcGIS FeatureServer |
| `PERMIT_SOURCE` | `denver` | Building permits from a Socrata open-data portal |

With `PARCEL_SOURCE` set, **Provision from county records** on the claim screen
stops synthesizing a parcel and pulls the real one — and with `PERMIT_SOURCE`
set, the permits that jurisdiction has issued for that address land on the
timeline as `SOURCE_VERIFIED` events, hashed into the chain like any other.
A reviewer can then type an address they know and check the record against a
house they can go and stand in front of.

Three things make that safe to leave on:

- **The fixture stays behind each one.** A portal that is down, slow or renamed
  falls through instead of taking a page with it, and a permit lookup that
  fails never fails the provisioning.
- **Nothing is invented.** An attribute the county does not publish stays zero
  rather than being filled with something plausible, and the provisioning event
  names which fields the assessor actually supplied.
- **Unset is the default**, so the seeded demo and the e2e suite stay
  deterministic.

Column names differ in every jurisdiction, and the ones in
`packages/providers/src/live/sources.ts` are a starting guess. To find the real
ones, in demo mode:

```
GET /api/admin/sources
```

It probes each configured source and returns the layer's column list with one
sample row. Correct a mapping either in that file, or without a rebuild:

```
PARCEL_SOURCE_FIELDS={"address":"SITUS_ADDRESS","yearBuilt":"CCYRBLT"}
```

`SOCRATA_APP_TOKEN` is optional and free; it lifts the anonymous rate limit.

## AI

Set `ANTHROPIC_API_KEY` to enable live extraction and Ask This Home. Without
it, both degrade rather than fail, and both say so in the UI: Ask answers from a
local index of the record, and Add Record drops to manual entry with the
document still attached and hashed.

## Deploying

The app is built to run on a serverless platform with a hosted database. Two
settings do the work:

- `STORAGE_DRIVER=database` puts document bytes in PostgreSQL. A serverless
  filesystem is read-only and not shared between invocations, so a document
  written by one request is simply not there for the next.
- `API_BASE_URL` unset, so Fastify runs inside the Next route handler.

### Environment

| Variable | Value | Why |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection string | `POSTGRES_URL` is accepted too, which is what Vercel's Supabase integration injects |
| `AUTH_JWT_SECRET` | a long random string | Signs session cookies |
| `STORAGE_DRIVER` | `database` | No durable disk |
| `DEMO_MODE` | `true` | Demo accounts and the seed route |
| `SEED_SECRET` | a long random string | Enables `POST /api/admin/seed`; without it that route does not exist |
| `ANTHROPIC_API_KEY` | optional | Live AI, or the documented fallbacks |

### Loading the demo data

A hosted deployment has no shell to run `pnpm db:seed` from, so there are two
ways in:

- **From a machine that can reach the database.** Point `DATABASE_URL` at it and
  run `pnpm db:reset`. This is the better option when you have the connection
  string.
- **From the deployment itself.** With `SEED_SECRET` set:

  ```bash
  curl -X POST https://<deployment>/api/admin/seed -H "x-seed-secret: <secret>"
  ```

  It truncates the demo tables and reloads the fixtures. It 404s without the
  secret, refuses to run outside demo mode, and compares the secret in constant
  time — but it is still destructive by design and should be removed before
  this database holds anything real.

For a host reachable only through a management API,
`pnpm --filter @homefax/db export-sql` emits the entire seed as SQL, hashes
included, using the same chaining code the seeder uses.

### Supabase notes

Row Level Security is enabled on every table with no policies, and the `anon`
and `authenticated` grants are revoked. That is deliberate: nothing should reach
this data through PostgREST. The app connects as the owner over the pooled
connection string and is unaffected. Supabase's advisor reports each table as
`rls_enabled_no_policy`, which is the intended posture rather than a finding to
clear.
