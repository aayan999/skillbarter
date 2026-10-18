-- SkillBarter schema, from SRS v1.1 Section 6 (nine tables) plus a notifications
-- table used for REQ-15 (booking status and session reminder notifications).
-- Names and columns follow the SRS table list and the Figure B.2 class diagram.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  college_id    TEXT NOT NULL,                 -- college roll number / ID (REQ-1)
  password_hash TEXT NOT NULL,
  credits       INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),  -- never negative (REQ-8)
  avg_rating    DOUBLE PRECISION,
  warnings      INTEGER NOT NULL DEFAULT 0,    -- admin warnings (REQ-19)
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_offers (
  id             SERIAL PRIMARY KEY,
  provider_id    INTEGER NOT NULL REFERENCES users(id),
  skill_name     TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'General',
  description    TEXT NOT NULL DEFAULT '',
  duration_hours INTEGER NOT NULL CHECK (duration_hours > 0),  -- 1 hour = 1 credit
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','deactivated')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_requests (
  id           SERIAL PRIMARY KEY,
  seeker_id    INTEGER NOT NULL REFERENCES users(id),
  skill_needed TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'General',
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id           SERIAL PRIMARY KEY,
  offer_id     INTEGER REFERENCES skill_offers(id),
  request_id   INTEGER REFERENCES skill_requests(id),
  seeker_id    INTEGER NOT NULL REFERENCES users(id),
  provider_id  INTEGER NOT NULL REFERENCES users(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'requested'
               CHECK (status IN ('requested','accepted','rejected','cancelled','completed')),
  credits      INTEGER NOT NULL CHECK (credits > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (seeker_id <> provider_id)
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  session_id    INTEGER REFERENCES sessions(id),
  amount        INTEGER NOT NULL,              -- signed: + earn/release/bonus, - reserve/reversal
  type          TEXT NOT NULL CHECK (type IN
                ('registration_bonus','reserve','release','earn','admin_reversal')),
  balance_after INTEGER NOT NULL,
  note          TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id  INTEGER NOT NULL REFERENCES users(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  uploader_id INTEGER NOT NULL REFERENCES users(id),
  file_type   TEXT NOT NULL CHECK (file_type IN ('file','video')),
  file_name   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  byte_size   INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ratings (
  id         SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  rater_id   INTEGER NOT NULL REFERENCES users(id),
  ratee_id   INTEGER NOT NULL REFERENCES users(id),
  score      INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  review     TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, rater_id)                -- two-way: one rating per participant
);

CREATE TABLE IF NOT EXISTS disputes (
  id           SERIAL PRIMARY KEY,
  session_id   INTEGER NOT NULL REFERENCES sessions(id),
  reporter_id  INTEGER NOT NULL REFERENCES users(id),
  reason       TEXT NOT NULL,                  -- e.g. no_show, poor_quality, other (REQ-16)
  description  TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolution   TEXT,                           -- 'credits_reversed' | 'user_warned' | 'dismissed'
  admin_notes  TEXT NOT NULL DEFAULT '',
  resolved_by  INTEGER REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ
);

-- REQ-15 notifications (booking status + session reminders).
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,                    -- booking_requested | booking_accepted | ... | session_reminder
  message    TEXT NOT NULL,
  link       TEXT NOT NULL DEFAULT '',
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  dedupe_key TEXT,                             -- prevents duplicate reminders
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_key_idx
  ON notifications (dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS sessions_seeker_idx   ON sessions (seeker_id);
CREATE INDEX IF NOT EXISTS sessions_provider_idx ON sessions (provider_id);
CREATE INDEX IF NOT EXISTS messages_session_idx  ON messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS credit_tx_user_idx    ON credit_transactions (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS ratings_ratee_idx     ON ratings (ratee_id);
CREATE INDEX IF NOT EXISTS offers_category_idx   ON skill_offers (category);
CREATE INDEX IF NOT EXISTS requests_category_idx ON skill_requests (category);
