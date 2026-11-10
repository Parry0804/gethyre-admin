# Backend notes

These are the rules the backend has to enforce. The panel only shows what the API returns, so all of these checks must happen on the server.

## Sign-in (user ID and password, no Google)

- Admins are stored in `admin_users`. Store passwords only as a hash, using **argon2id** (or bcrypt with cost ≥ 12). Never log passwords.
- Create the first admin with a one-off script or seed. There is no sign-up and no "forgot password". A super admin resets passwords directly in the database or with a script.
- **Lockout:** each wrong password increments `failed_attempts`. At 5, set `locked_until = now() + 15 min` and return 423. A correct password resets the counter. Return 401 with `tries_left` while the account is not locked.
- Return the same 401 for an unknown user ID so attackers can't find out which IDs exist (`tries_left: 4` is fine).
- **Session:** after sign-in, set a random session ID in a cookie with `HttpOnly; Secure; SameSite=Strict; Path=/admin`. The session lasts **12 hours**. Keep sessions in `admin_sessions` (or Redis) so sign-out and suspension take effect immediately.
- CORS: allow only the admin panel's origin, with `credentials: true`.
- Add rate limiting on `/admin/auth/login` per IP, in addition to the per-account lockout.

## Retries (max 3 tries)

- `resumes`, `interview_sessions` and `career_plans` each get an `attempts` column (see migration).
- The worker increments it whenever it starts a run.
- `POST /admin/jobs/.../retry` returns 409 when `attempts >= 3`. Otherwise it sets the status back to pending and re-queues the job.
- A job is **stuck** when it has been `pending` or `processing` for more than 15 minutes.
- When a retry succeeds, send the user the normal in-app notification.

## Plan limits (Free: 1 mock interview, 3 CV generations or optimizations)

- `plan_limits` holds one row per plan and feature. `limit = NULL` means unlimited.
- `user_limit_overrides` adds `extra` uses for one user, optionally until `ends_at`.
- **The main app must check the limit before starting** a mock interview or a CV generation:
  `allowed = plan_limit.enabled AND (limit IS NULL OR used_in_period < limit + active_extra)`.
  Count `used_in_period` from `interview_sessions` / `resumes (source='generated')` within the current period (`resets`: `never`, `monthly`, `plan_period`).
- Lowering a limit doesn't take back uses already made.

## Payments

- `subscriptions` and `payments` are filled in by the payment provider's webhook. The panel is read-only.
- Keep `amount_paise` NULL until pricing is final. The panel then shows `₹[price]`.

## Exports

- `POST /admin/exports` creates a row in `exports` with status `preparing` and starts a background job. The job fills in `progress` (0 to 1) and `rows`, writes the file to private storage, then sets `ready` and `expires_at = now() + 7 days`.
- Formats:
  - **xlsx**: one sheet per data type
  - **csv**: a zip with one csv per data type
  - **pdf**: a summary report; warn above 500 users
  - **json**: nested data
- When `include_contacts` is false, leave out phone and email. Never export OTP codes or password hashes.
- The download endpoint checks the admin session and returns 410 after the export expires.

## Audit log

Every write goes into `admin_actions` and records who did it, what they did, the target, the details as JSON, and when.
