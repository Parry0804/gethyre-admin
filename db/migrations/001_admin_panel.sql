-- GetHyre admin panel (MVP) — new tables and columns.
-- PostgreSQL. Safe to run once on top of the existing 17-table schema.

BEGIN;

-- Admins (user ID + password, no Google sign-in)
CREATE TABLE admin_users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username         text NOT NULL UNIQUE,
  full_name        text NOT NULL,
  password_hash    text NOT NULL,                 -- argon2id
  role             text NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin')),
  failed_attempts  int  NOT NULL DEFAULT 0,
  locked_until     timestamptz,
  last_login_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_sessions (
  id          text PRIMARY KEY,                     -- random 32+ byte token, stored hashed if preferred
  admin_id    uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,                 -- created_at + 12 hours
  ip          inet,
  user_agent  text
);
CREATE INDEX ON admin_sessions (admin_id);

-- Audit log of every admin write
CREATE TABLE admin_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES admin_users(id),
  action      text NOT NULL,                        -- suspend_user, reactivate_user, extra_uses, save_limits, retry_job, create_export, sign_in
  target_type text,
  target_id   uuid,
  details     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON admin_actions (target_type, target_id);
CREATE INDEX ON admin_actions (created_at DESC);

-- User suspension
ALTER TABLE users
  ADD COLUMN status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  ADD COLUMN suspended_at      timestamptz,
  ADD COLUMN suspended_by      uuid REFERENCES admin_users(id),
  ADD COLUMN suspension_reason text;

-- Retry counter (max 3 tries) on background jobs
ALTER TABLE resumes            ADD COLUMN attempts int NOT NULL DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN attempts int NOT NULL DEFAULT 0;
ALTER TABLE career_plans       ADD COLUMN attempts int NOT NULL DEFAULT 0;

-- Plans and payments
CREATE TABLE subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        text NOT NULL CHECK (plan IN ('free', 'pro')),
  status      text NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
  started_at  timestamptz NOT NULL DEFAULT now(),
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON subscriptions (user_id, status);

CREATE TABLE payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id     uuid REFERENCES subscriptions(id),
  plan                text NOT NULL CHECK (plan IN ('free', 'pro')),
  amount_paise        int,                          -- NULL until pricing is final
  status              text NOT NULL CHECK (status IN ('paid', 'failed', 'pending', 'refunded')),
  method              text CHECK (method IN ('upi', 'card', 'netbanking')),
  provider_reference  text NOT NULL UNIQUE,
  failure_reason      text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON payments (status, created_at DESC);
CREATE INDEX ON payments (user_id);

-- AI feature limits
CREATE TABLE plan_limits (
  plan     text NOT NULL CHECK (plan IN ('free', 'pro')),
  feature  text NOT NULL CHECK (feature IN ('mock_interview', 'cv_generation')),
  "limit"  int CHECK ("limit" IS NULL OR "limit" >= 0),   -- NULL = no limit
  resets   text NOT NULL DEFAULT 'never' CHECK (resets IN ('never', 'monthly', 'plan_period')),
  enabled  boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES admin_users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan, feature)
);
INSERT INTO plan_limits (plan, feature, "limit", resets) VALUES
  ('free', 'mock_interview', 1, 'never'),
  ('free', 'cv_generation',  3, 'never'),
  ('pro',  'mock_interview', NULL, 'plan_period'),
  ('pro',  'cv_generation',  NULL, 'plan_period');

CREATE TABLE user_limit_overrides (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature     text NOT NULL CHECK (feature IN ('mock_interview', 'cv_generation')),
  extra       int  NOT NULL CHECK (extra > 0),
  reason      text NOT NULL,
  ends_at     timestamptz,
  set_by      uuid NOT NULL REFERENCES admin_users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);

-- Data exports
CREATE TABLE exports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  data              text[] NOT NULL,                -- users, resumes, interviews, career_plans, payments, otp_requests
  filters           jsonb NOT NULL DEFAULT '{}',
  format            text NOT NULL CHECK (format IN ('xlsx', 'csv', 'pdf', 'json')),
  include_contacts  boolean NOT NULL DEFAULT false,
  status            text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'ready', 'failed', 'expired')),
  progress          real NOT NULL DEFAULT 0,
  rows              int  NOT NULL DEFAULT 0,
  error             text,
  storage_key       text,
  created_by        uuid NOT NULL REFERENCES admin_users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz
);
CREATE INDEX ON exports (created_at DESC);

COMMIT;
