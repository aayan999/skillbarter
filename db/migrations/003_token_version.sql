-- Logout revocation: bumping token_version invalidates every previously
-- issued session cookie for that user (JWTs are stateless otherwise).
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
