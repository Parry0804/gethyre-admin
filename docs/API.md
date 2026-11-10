# Admin API

All endpoints live under `/admin`. Every request carries the session cookie.

- Every endpoint except `POST /admin/auth/login` returns **401** when there is no valid session. The panel then shows the sign-in screen.
- Response bodies are JSON and match the types in `src/api/types.ts`.
- Times are ISO 8601 in UTC.
- Lists are paged at 25 per page and return `{ items, total, page, page_size }`.

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/admin/auth/login` | `{ username, password }` | 200 `{ admin }` and sets the cookie. 401 `{ error: "invalid_credentials", tries_left }`. 423 `{ error: "locked", locked_until }` |
| POST | `/admin/auth/logout` | – | 204 and clears the cookie |
| GET | `/admin/auth/me` | – | 200 `{ admin }` or 401 |

## Overview and jobs

| Method | Path | Returns / notes |
|---|---|---|
| GET | `/admin/overview` | `Overview`: stats, `signups_14d`, `newest_users` (5), `failed_jobs`, and `payment_issues` (failed or pending in the last 7 days) |
| POST | `/admin/jobs/{kind}/{id}/retry` | `kind` is `resume`, `interview_report` or `career_plan`. Returns 200 `{ job }` with `state: "retrying"`, or 409 when `attempts >= 3` |
| POST | `/admin/jobs/retry-all` | Retries every `failed` or `stuck` job that has tries left. Returns `{ queued }` |

`failed_jobs` lists:
- resumes with `status = failed`, or `pending`/`processing` for more than 15 minutes (`state: "stuck"`)
- interviews with `status = fail`
- career plans with `status = failed`

`state` is one of:
- `limit` when `attempts >= 3`
- `retrying` while a retry is running
- otherwise `failed` or `stuck`

A job that succeeds drops out of the list. The panel polls this endpoint to tell the admin whether the retry worked.

## Users

| Method | Path | Query / body | Returns |
|---|---|---|---|
| GET | `/admin/search` | `q` | `{ items: UserRow[] }` (top 8, matched on name, phone or email) |
| GET | `/admin/users` | `q, status, plan, sort (newest\|last_active\|name), page` | `Page<UserRow>` |
| GET | `/admin/users/count` | `plan, status, signed_up_from` | `{ count }` |
| GET | `/admin/users/{id}` | – | `UserDetail` |
| POST | `/admin/users/{id}/suspend` | `{ reason }` | `{ user }`. Also ends that user's app sessions |
| POST | `/admin/users/{id}/reactivate` | – | `{ user }` |
| POST | `/admin/users/{id}/extra-uses` | `ExtraUsesRequest` | `{ override }`. Sending `extra: 0` removes it |

## Resumes and interviews

| Method | Path | Query | Returns |
|---|---|---|---|
| GET | `/admin/resumes` | `status (parsed\|failed\|processing\|generated), q, page` | `Page<Resume> & { counts }` |
| GET | `/admin/resumes/{id}` | – | `Resume` with `insights` |
| GET | `/admin/interviews` | `status, role, page` | `Page<InterviewRow> & { counts }` |
| GET | `/admin/interviews/{id}` | – | `Interview` with `report` and `exchanges` |

`counts` gives the number of rows for each tab, for example `{ all, parsed, failed, processing, generated }`.

## Payments and limits

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/admin/payments` | query `status, q, page` | `Page<Payment> & { counts, summary }` |
| GET | `/admin/limits` | – | `LimitsResponse` |
| PUT | `/admin/limits/{plan}` | `{ limits: [{ feature, limit, resets, enabled }] }` | `LimitsResponse` |
| DELETE | `/admin/limit-overrides/{id}` | – | 204 |

## Exports

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/admin/exports` | – | `{ items: ExportJob[], matching_users }` (newest first, last 30 days) |
| POST | `/admin/exports` | `ExportRequest` | 202 `{ export }` with `status: "preparing"` |
| GET | `/admin/exports/{id}/download` | – | The file, or a redirect to a signed storage URL. 410 after 7 days |

Each write action (suspend, reactivate, extra uses, limits, retry and export) is recorded in `admin_actions`.
