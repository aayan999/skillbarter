# SkillBarter — Product Requirements Document (handover)

Version 1.0 · October 18, 2026 · Status: all 19 SRS requirements implemented;
15/15 automated tests passing; two live HTTP smoke runs passing. Written after the
build and verified against the actual code and test output.

## 1. Product goal and users

SkillBarter is a campus web platform where college students exchange practical
help (debugging, tool setup, spreadsheets, resumes, presentations) using a
non-monetary **time-credit** system: **1 hour of help = 1 time credit**. It
replaces informal WhatsApp groups and paid tutors with structured listings,
booking, chat, ratings and admin oversight.

User classes (SRS 2.3): Students as **Seekers** (spend credits) and
**Providers** (earn credits) — every student can be both — and the **Admin**
(monitoring, disputes). College management is a read-only stakeholder, not a
system user.

## 2. Scope

In scope (this release): college email/ID registration and login; profiles;
skill offers and requests with categorized listings; the hybrid time-credit
wallet (2 free credits at registration, then earn/spend); booking with
provider acceptance; real-time chat and file/short-video sharing after
acceptance; two-way ratings; notifications; dispute reporting; user and admin
dashboards.

Out of scope (SRS 1.1/2.5): multi-college support, AI matching, real-money
payments, live video calling / screen sharing, mobile app.

## 3. Requirements status

Every REQ-1..19 is implemented. The authoritative mapping (requirement →
files → verification) is [docs/REQUIREMENTS.md](REQUIREMENTS.md). Summary:

- **All 19 REQs verified** by automated tests (15/15 vitest) and/or two live
  HTTP smoke runs; see [docs/REQUIREMENTS.md](REQUIREMENTS.md) for the
  per-requirement evidence, including one bug found and fixed during
  verification (category filter parameter binding).

## 4. Architecture

Single Next.js 15 App Router application (frontend + REST/JSON API in one
deployable, SRS 3.4). Server components read through `lib/services/*`; all
mutations go through `app/api/*` route handlers; pages never contain SQL.

```
app/            pages + api routes        components/  client components
lib/db/         data layer (pg/PGlite)    lib/services/ business rules
db/migrations/  SQL schema                types/        domain types
tests/          vitest suites             docs/         this documentation
```

Data layer (`lib/db/index.ts`): if `DATABASE_URL` is set it uses PostgreSQL
through `pg`; otherwise it boots **PGlite**, an embedded PostgreSQL engine,
and persists to `.pglite-data/`. `db/migrations/*.sql` applies idempotently
on first use in both modes. `withTx()` provides real transactions.

Chat transport (`lib/pusher.ts`): Pusher Channels when the env vars exist
(private channels `private-session-<id>`, authorized at `/api/pusher/auth`
for participants only); otherwise the chat UI polls every 3 seconds.

Auth (`lib/auth.ts`): bcrypt password hashes, httpOnly JWT cookie
(`sb_session`, 7-day expiry, HS256 via `jose`). Admin = `users.is_admin`,
granted at registration when the email is in `ADMIN_EMAILS`.

## 5. Data model

Nine SRS tables plus one addition (`notifications`, needed by REQ-15; SRS
Section 6 lists nine tables while the class diagram has ten classes). Full
DDL: `db/migrations/001_init.sql`.

- `users` — name, email (unique), college_id, password_hash, credits
  (`CHECK (credits >= 0)`), avg_rating, warnings, is_admin
- `skill_offers` — provider, skill_name, category, description,
  duration_hours, status (active/deactivated)
- `skill_requests` — seeker, skill_needed, category, description, status
  (open/closed)
- `sessions` — offer_id/request_id, seeker_id, provider_id, scheduled_at,
  status (requested/accepted/rejected/cancelled/completed), credits
- `credit_transactions` — signed amount, type (registration_bonus, reserve,
  release, earn, admin_reversal), balance_after (audit trail)
- `messages`, `resources` — session-scoped chat and shared files/videos
- `ratings` — UNIQUE(session_id, rater_id) enforces one rating per side
- `disputes` — reason, description, status, resolution, admin_notes
- `notifications` — type, message, link, read, dedupe_key (added table)

## 6. Business rules (all enforced in services + DB, verified by tests)

1. **2 free credits at registration** (`grantRegistrationBonus`, inside the
   user-creation transaction).
2. **Reserve on acceptance:** accepting a booking deducts the session credits
   from the seeker inside a transaction with `SELECT ... FOR UPDATE`; rejects
   never reserve; cancellation after acceptance releases them; completion
   transfers them to the provider.
3. **Never negative:** DB CHECK constraint plus transactional guards;
   insufficient funds raise `InsufficientCreditsError` (HTTP 400/409).
4. **Chat and files unlock only after acceptance** and are visible **only to
   the two participants** — the admin is explicitly excluded (SRS 5.3).
5. **Two-way rating** only after completion, one rating per participant,
   `users.avg_rating` recomputed on each rating.
6. **Disputes:** participants report no_show / poor_quality / credit_issue /
   other; admin resolves by reversing credits (clamped so the provider never
   goes negative — partial reversal is recorded in the dispute notes) or
   warning the user involved (`users.warnings` + notification), or dismissing.
7. **Notifications** fire on booking requested/accepted/rejected/cancelled/
   completed, session reminders (<24h, deduplicated), dispute updates, and
   admin warnings.

## 7. API routes (all under /api, JSON)

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/auth/register` `/login` `/logout` | POST | session lifecycle |
| `/api/profile` | PATCH | update display name |
| `/api/offers` | GET, POST | list (optional `?category=`), create |
| `/api/offers/[id]` | PATCH | deactivate (owner) |
| `/api/requests` | GET, POST | list, create |
| `/api/requests/[id]` | PATCH | close (owner) |
| `/api/bookings` | POST | request a booking (REQ-10 check) |
| `/api/sessions/[id]/accept` `/reject` `/cancel` `/complete` | POST | lifecycle transitions |
| `/api/sessions/[id]/messages` | GET, POST | chat (participants, post-acceptance) |
| `/api/sessions/[id]/resources` | GET, POST | list, upload (≤25 MB, multipart) |
| `/api/sessions/[id]/resources/[rid]` | GET | download (participants only) |
| `/api/sessions/[id]/ratings` | POST | rate the other participant |
| `/api/notifications` `/api/notifications/read` | GET, POST | list, mark all read |
| `/api/disputes` | POST | report a dispute |
| `/api/admin/disputes/[id]/resolve` | POST | reverse_credits / warn_user / dismiss (admin) |
| `/api/pusher/auth` | POST | private-channel authorization |

## 8. Tech stack and environment variables

Next.js 15, React 19, TypeScript, PostgreSQL (`pg`) or embedded PGlite,
Pusher Channels (`pusher`, `pusher-js`), bcrypt (`bcryptjs`), JWT (`jose`),
zod (available), vitest. Env vars (names only; values live in `.env.local`,
never committed): `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAILS`,
`PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`,
`NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `UPLOAD_DIR`.

## 9. How to run, test, deploy

- **Run locally:** `npm install`, copy `.env.example` to `.env.local`, set
  `SESSION_SECRET` (and `ADMIN_EMAILS` to get an admin), `npm run dev`. No
  database setup needed (PGlite fallback).
- **Test:** `npm test` (9 tests: wallet rules, full session lifecycle,
  disputes; run against real embedded PostgreSQL).
- **Deploy (not done here):** create a Vercel project, provision Postgres
  (Neon/Vercel Postgres) and set `DATABASE_URL`, set all env vars, deploy.
  Migrations self-apply on first request. **Before deploying, replace local
  file storage** (see known gaps).

## 10. Decisions and deviations from SRS v1.1

1. **Added a `notifications` table** (REQ-15 needs persistence; SRS lists
   nine tables).
2. **Either participant may mark a session complete** — the SRS says "a
   session to be marked complete" without naming who.
3. **PGlite embedded database** as the zero-setup local default; production
   still uses PostgreSQL via `DATABASE_URL`. The SRS stack is unchanged.
4. **Admin cannot read session chats/files** — SRS 5.3 says only the two
   participants may view them; the admin sees session metadata instead.
5. **Partial credit reversal** when the provider already spent the credits,
   because REQ-8 (never negative) takes precedence; recorded in dispute notes.
6. **Session reminders are generated on dashboard load** rather than by a
   background job.
7. Registration validates email format and requires a college ID string; no
   verification email is sent (SRS assumes valid college email/ID).
8. Skill categories are a fixed list (`types/index.ts`: Programming, Design,
   Academics, Communication, Productivity, General) — the SRS says
   "categorized" without naming categories.

## 11. Known gaps and next steps

1. **File storage is local disk** (`uploads/`): does not persist on Vercel
   serverless. Next step: move `app/api/sessions/[id]/resources*` to object
   storage (Vercel Blob or S3).
2. **Pusher untested with real keys** — only the polling fallback ran here.
3. **No Vercel deployment performed**; deploy steps in section 9 are untested.
4. Session reminders need a cron (e.g. Vercel Cron hitting a route that calls
   `createSessionReminders`) to be true reminders.
6. No rate limiting, no email verification, no password reset — fine for a
   campus demo, not for public launch.

## 12. Instructions for the next agent

1. Read `docs/STRUCTURE.md`, then `db/migrations/001_init.sql`, then
   `lib/services/` — all business rules live there, one module per feature.
2. Never bypass `lib/services/wallet.ts` for credit changes; every movement
   must stay inside a transaction and keep `credit_transactions` appended.
3. Keep mutations in `app/api/*` route handlers and SQL out of `app/` pages.
4. Run `npm test` and `npm run build` before and after any change; extend
   `tests/` when you touch wallet, booking, chat-access or dispute logic.
5. When editing schema, add a new file `db/migrations/00N_*.sql` (append-only,
   idempotent) — never edit `001_init.sql` in place.
6. Update `docs/REQUIREMENTS.md` statuses whenever you verify something new,
   and keep this PRD's sections 10-11 truthful.
