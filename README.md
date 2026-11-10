# GetHyre Admin

Super-admin panel for GetHyre.ai (MVP). It covers users, resumes, mock interviews, payments, plan limits for the AI features, and data exports.

The frontend is complete and runs today on **sample data**: a fake API runs in the browser using [MSW](https://mswjs.io). When the backend is ready, turn the fake API off and point the panel at the real one. No screen code changes.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Demo sign-in (sample data only): **user ID `pranay`**, **password `gethyre-demo`**.
After 5 wrong passwords, sign-in locks for 15 minutes. To try that, enter a wrong password a few times.

```bash
npm run build        # type-check + production build into dist/
npm run preview      # serve the build
```

## Screens

| Route | What it does |
|---|---|
| `/login` | User ID + password. Shows tries left, lockout, session expired, and signed out. |
| `/` | Overview: stats, failed and stuck jobs with Retry / Retry all, payment issues, sign-ups chart |
| `/users`, `/users/:id` | Search, filters, and quick export. Profile shows plan and usage, extra uses, suspend and reactivate, resumes, interviews, career plan and sign-in codes. |
| `/resumes` | Status tabs and a detail drawer with the ATS breakdown. Failed resumes can be retried. |
| `/interviews`, `/interviews/:id` | Report, plus questions and answers with the verdict for each. Failed reports can be retried. |
| `/payments` | Read-only list with summary stats |
| `/limits` | Free and Pro limits for each AI feature (Free: 1 mock interview, 3 CV generations), plus the list of extra uses given to single users |
| `/exports` | Pick data, users, format (Excel, CSV, PDF, JSON) and whether to include contact details. Shows recent exports with progress and Download. |

Press `/` anywhere to jump to the global user search.

## Connecting the real backend

1. The backend implements the endpoints in **[docs/API.md](docs/API.md)**. The exact response shapes are in `src/api/types.ts`, which is the contract.
2. Run **[db/migrations/001_admin_panel.sql](db/migrations/001_admin_panel.sql)** to add the admin tables.
3. Read **[docs/BACKEND.md](docs/BACKEND.md)** for the rules the backend must enforce: password hashing, lockout, sessions, the 3-try retry cap, and limit checks.
4. Set the environment for the deployed panel:

```bash
VITE_USE_MOCKS=false
VITE_API_URL=https://api.gethyre.ai     # leave empty if served from the same domain
```

The panel sends `credentials: 'include'` on every request. The backend keeps the session in an httpOnly cookie and must allow the panel's origin with CORS credentials. Any `401` signs the admin out.

## Layout

```
src/
  api/types.ts        API contract (shapes the backend must return)
  api/client.ts       every request the panel makes
  mocks/              fake API + sample data (dev only)
  auth/               session check, sign-out on 401
  components/         UI kit (buttons, tables, dialogs, drawer, toasts), layout, shared tables
  pages/              one file per screen
  lib/                formatting, retry hook, labels
docs/                 API + backend notes
db/migrations/        SQL for the new admin tables
```

Stack: Vite, React 18, TypeScript, Tailwind, React Router, TanStack Query, lucide icons.
