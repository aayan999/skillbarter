-- REQ-1: a college ID identifies one student, so two accounts cannot share it.
CREATE UNIQUE INDEX IF NOT EXISTS users_college_id_key ON users (college_id);
