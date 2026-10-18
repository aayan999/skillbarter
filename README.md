# SkillBarter

A time-credit based peer skill exchange platform for a college campus.
Students post skill offers and requests, book sessions, chat, share files and
short videos, rate each other, and pay with time credits (1 hour of help = 1
credit) instead of money. Built from SRS v1.1 (Assignment 02, AISSMS IOIT).

## Tech stack

- **Next.js 15 (App Router) + TypeScript** — frontend and API (SRS 2.5)
- **PostgreSQL** — production database via `DATABASE_URL` (`pg` driver)
- **PGlite (embedded PostgreSQL)** — automatic zero-setup fallback when
  `DATABASE_URL` is empty, so the demo runs anywhere with no database server
- **Pusher Channels** — real-time chat transport; without keys the chat falls
  back to 3-second polling
- **bcrypt + JWT cookie (jose)** — authentication
- **vitest** — tests run against the real (embedded) PostgreSQL engine

## Quickstart

```bash
npm install
cp .env.example .env.local   # then edit values
npm run dev                  # http://localhost:3000
```

With an empty `DATABASE_URL` the app creates a local embedded database in
`.pglite-data/` and applies `db/migrations/*.sql` automatically. To use a real
PostgreSQL (e.g. Neon or Vercel Postgres), set `DATABASE_URL` — migrations
still apply automatically on first request.

An admin account is any registered email listed in `ADMIN_EMAILS`
(comma-separated).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / start |
| `npm test` | vitest suite (wallet rules + full session lifecycle) |

## Environment variables

See `.env.example`. None are secrets in this repo; never commit `.env.local`.
`DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAILS`, the five `PUSHER_*` /
`NEXT_PUBLIC_PUSHER_*` vars, and `UPLOAD_DIR`.

## Folder structure

Documented in [docs/STRUCTURE.md](docs/STRUCTURE.md). In short: `app/` pages +
API routes, `components/` client components, `lib/db` data layer,
`lib/services` business rules, `db/migrations` SQL schema, `types/` domain
types, `tests/` vitest, `docs/` documentation.

## Documentation

- [docs/PRD.md](docs/PRD.md) — product requirements document / handover doc
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — REQ-1..19 traceability:
  requirement → files → how verified
- [docs/STRUCTURE.md](docs/STRUCTURE.md) — folder layout and conventions

## Known limitations (honest list)

- **File storage is local disk** (`uploads/`). This does not persist on Vercel
  serverless — deployment needs object storage (e.g. Vercel Blob or S3). Not
  implemented.
- **Pusher is optional.** Without keys, chat polls every 3 s instead of
  delivering instantly.
- **Session reminders** are generated when a user opens their dashboard
  (no background job / cron).
- **Credit reversal is partial** if the provider already spent the credits —
  balances can never go negative (REQ-8 takes precedence); the dispute notes
  record the partial amount.
- No email verification for college addresses; registration checks format and
  requires a college ID field (SRS assumes valid college email/ID).
- Not deployed anywhere yet — no Vercel project was created.
