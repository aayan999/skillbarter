# Folder structure

```
app/                  Next.js App Router: pages and REST API routes (JSON)
  api/                  route handlers (auth, offers, requests, bookings,
                        sessions, messages, resources, ratings, disputes,
                        notifications, admin, pusher)
  .../page.tsx          one folder per screen (dashboard, offers, requests,
                        sessions, profile, admin, help, login, register)
components/           React client components (forms, chat, upload, ratings)
lib/                  server-side infrastructure
  db/index.ts           data layer: pg (DATABASE_URL) or embedded PGlite,
                        runs db/migrations idempotently, withTx() transactions
  auth.ts               registration/login, JWT session cookie (REQ-1)
  pusher.ts             Pusher Channels wrapper; no-op without keys (chat
                        falls back to polling)
  services/             domain logic, one module per feature area
    wallet.ts             time-credit rules (REQ-6, REQ-7, REQ-8, REQ-19)
    notifications.ts      notification creation and reads (REQ-15)
    ...                   bookings, ratings, disputes, admin (later stages)
db/migrations/        SQL schema, applied in filename order (SRS Section 6)
types/                shared TypeScript types (names follow Figure B.2)
tests/                vitest tests (wallet rules, access rules)
docs/                 STRUCTURE.md (this file) and REQUIREMENTS.md (REQ map)
public/               static assets
uploads/              session files/videos at runtime (gitignored)
.pglite-data/         embedded dev database (gitignored)
```

Conventions: pages read data through `lib/services/*` inside server
components; all mutations go through `app/api/*` route handlers; nothing in
`app/` talks to SQL directly.
