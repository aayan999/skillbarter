# Requirements traceability — SRS v1.1, REQ-1 to REQ-19

Status legend: **verified** = exercised by an automated test and/or the live
HTTP smoke run; **implemented** = code complete and type-checked, not
exercised end-to-end in this environment.

| REQ | Requirement | Where (key files) | Status |
| --- | --- | --- | --- |
| REQ-1 | Register/login with college ID/email | `lib/auth.ts`, `app/api/auth/*`, `app/register`, `app/login` | verified (smoke: 3 registrations incl. admin) |
| REQ-2 | Profile lists skills the student offers | `app/profile/page.tsx`, `app/api/profile` | verified (service test + smoke round 2: profile page renders the provider's offer) |
| REQ-3 | Providers post skill offers | `lib/services/offers.ts`, `app/api/offers`, `app/offers/new` | verified (smoke: offer created) |
| REQ-4 | Seekers post skill requests | `lib/services/offers.ts`, `app/api/requests`, `app/requests/new` | verified (unit + smoke round 2: create, list, close by owner; close by non-owner rejected 404) |
| REQ-5 | Categorized browsable listings | `app/offers/page.tsx`, `app/requests/page.tsx`, `components/CategoryFilter.tsx` | verified (unit + smoke round 2: category filter on API and page; see bug fix below) |
| REQ-6 | Wallet + 2 free credits at registration | `lib/services/wallet.ts` (`grantRegistrationBonus`), `lib/auth.ts` | verified (`tests/wallet.test.ts`) |
| REQ-7 | Reserve on accept, transfer on complete | `lib/services/wallet.ts`, `lib/services/bookings.ts` | verified (unit + lifecycle tests + smoke) |
| REQ-8 | Balance never negative | `db/migrations/001_init.sql` CHECK + `FOR UPDATE` in `wallet.ts` | verified (unit tests: over-spend rejected, reversal clamped) |
| REQ-9 | Booking request + provider accept/reject | `lib/services/bookings.ts`, `app/api/bookings`, `app/api/sessions/[id]/{accept,reject}` | verified (lifecycle + smoke) |
| REQ-10 | Credit check before booking request | `lib/services/bookings.ts` (`requestBooking`) | verified (lifecycle test: 1-credit seeker denied) |
| REQ-11 | Chat only after acceptance | `lib/services/chat.ts`, `app/api/sessions/[id]/messages`, `components/Chat.tsx` | verified (lifecycle + smoke: pre-accept send rejected, post-accept works) |
| REQ-12 | Share files and short videos in a session | `lib/services/resources.ts`, `app/api/sessions/[id]/resources*`, `components/ResourcePanel.tsx` | verified (unit + smoke round 2: file and video upload, >25 MB rejected, participant download 200, outsider 404, anonymous 401) |
| REQ-13 | Mark complete → transfer + rating opens | `lib/services/bookings.ts` (`completeSession`) | verified (lifecycle + smoke) |
| REQ-14 | Two-way rating + review after session | `lib/services/ratings.ts`, `app/api/sessions/[id]/ratings`, `components/RatingForm.tsx` | verified (lifecycle + smoke; duplicate rating rejected) |
| REQ-15 | Notifications: booking status + reminders | `lib/services/notifications.ts`, `lib/services/disputes.ts` (`createSessionReminders`), `app/api/notifications*` | verified (smoke: 3 notifications for seeker; reminders are dashboard-triggered, unit-not-tested) |
| REQ-16 | Dispute reporting (no-show, poor quality…) | `lib/services/disputes.ts`, `app/api/disputes`, `app/sessions/[id]/dispute` | verified (lifecycle + smoke) |
| REQ-17 | User dashboard: credits, sessions, offers/requests, ratings | `app/dashboard/page.tsx` | verified (unit: balance/reserved math; smoke round 2: page renders all 7 sections) |
| REQ-18 | Admin dashboard: users, sessions, disputes, activity | `app/admin/page.tsx`, `lib/services/admin.ts` | verified (unit: overview counts; smoke round 2: page renders; non-admin redirected) |
| REQ-19 | Admin reviews disputes: reverse credits or warn | `lib/services/admin.ts` (`resolveDispute`), `app/api/admin/disputes/[id]/resolve` | verified (lifecycle: reverse + warn; smoke: warn via admin cookie) |

## Cross-cutting rules (SRS 5.5)

| Rule | Enforcement | Verified |
| --- | --- | --- |
| Balance never negative | DB CHECK + transactional `FOR UPDATE` guards | yes (unit) |
| Chat/files unlock after acceptance | `chat.ts` / `resources.ts` status checks | yes (lifecycle + smoke) |
| Reserve on accept / transfer on complete / release on cancel | `bookings.ts` + `wallet.ts` | yes (lifecycle) |
| 2 free credits at registration | `grantRegistrationBonus` in registration tx | yes (unit) |
| Chat and files visible only to the two participants | `getSessionForParty` (admin excluded) | yes (lifecycle: outsider gets null) |
| Admin reviews disputes and can reverse credits or warn | `admin.ts` + admin-only API guard | yes (lifecycle + smoke) |

## Bug found and fixed during verification

- **Category filter was broken** (`lib/services/offers.ts`): the filter SQL
  referenced parameter `$2` while only one parameter was bound, so every
  filtered listing failed. Found by `tests/features.test.ts`, fixed to `$1`,
  re-verified by unit tests and the live smoke run.

## Test evidence

- `npm test` → 15/15 passing (`tests/wallet.test.ts`, `tests/lifecycle.test.ts`,
  `tests/features.test.ts`) against embedded PostgreSQL (PGlite, real Postgres engine).
- `npm run build` → compiles clean; all routes dynamic.
- Live HTTP smoke round 1 (`next start`): register ×3 (incl. admin), create
  offer, book, chat blocked pre-accept, accept, chat, complete, rate, dispute,
  admin warn — all OK.
- Live HTTP smoke round 2: category filter (API + page), request create/list/
  close with ownership check, file + video upload, 26 MB upload rejected,
  participant download 200 / outsider 404 / anonymous 401, anonymous API 401,
  profile/dashboard/admin pages render their sections, admin page redirects
  non-admins — all OK.
