# Silverland Zone — Tedo Housing Estate Access Control System

A production-oriented, mobile-first access-control platform for **Residents, Visitors, Dispatch
Riders, Contractors and Security Officers**, replacing the estate's manual notebook system.

Brand: **SILVERLAND ZONE** / **TEDO HOUSING ESTATE** (blue & white professional theme).

> **Structure:** The app is structured into three cleanly separated applications powered by a unified **backend API service**:
> 1. **adminweb** — Desktop/responsive Web App for estate managers & super admins.
> 2. **resident-mobile** — Dedicated Mobile App for residents to generate visitor and self-exit/entry gate codes.
> 3. **officer-mobile** — Dedicated Mobile App for security officers at the gate to confirm & verify codes.

---

## Architecture (Decoupled 3-Tier Multi-App)

```
silverland-app/
  backend/            Express + TypeScript + Prisma REST API (runs on :4000)
    prisma/           schema.prisma, seed.ts
    src/              db, auth(JWT), gate-logic, routes/* (tokens, gate, resident, etc.)
  adminweb/           Admin Web App (Next.js 15, runs on :3000)
    src/app/          Dashboard, Gate Passes, Visitors, Residents, Vehicles, Logs, Reports, Settings
  resident-mobile/    Resident Mobile App (Next.js 15 PWA, runs on :3001)
    src/app/          Visitor Code Generator, Self Gate Pass (Exit/Entry), Active Passes, WhatsApp Share
  officer-mobile/     Officer Mobile Terminal (Next.js 15 PWA, runs on :3002)
    src/app/          Gate Code Terminal, Numeric Keypad, Camera QR Scan, Grant/Deny Access, Shift Counters
  README.md
```

**Auth model:** the backend issues a signed **JWT** on login (returned in the body). Each client stores its token in `localStorage` and sends it as `Authorization: Bearer <token>` on requests. CORS is configured to accept requests from all three applications.

---

## 1) What was built

- **Authentication** — email/password with bcrypt hashing + expiring JWT sessions (bearer token).
- **Role-Based Access Control** — `SUPER_ADMIN`, `ESTATE_MANAGEMENT`, `SECURITY_OFFICER`, `RESIDENT`, enforced server-side on every endpoint (401/403).
- **Dashboard** — residents, visitors/dispatch/vehicles inside, expected today, exited today, denied today, recent gate activity, security alerts.
- **Gate Control** (mobile-first) — large-tap screen: `[SCAN QR] [REGISTER VISITOR] [DISPATCH RIDER] [CHECK OUT] [SEARCH]` + live counters.
- **Visitor registration** — full form, automatic secure **QR pass** (random token, expiry, single-use), approval workflow, regenerate/revoke.
- **QR scanning & verification** — camera (`html5-qrcode`), manual entry, detail + reason display, **GRANT / LOG DENIED**.
- **Access logging** — every entry/exit/denied stored with token, officer, vehicle, duration, device info; auto-denial.
- **Dispatch riders** — registration, resident/officer confirmation, entry/exit, configurable expiry.
- **Resident directory** + **notebook IMPORT/VERIFY** (records added as UNVERIFIED, never auto-trusted).
- **Resident portal** — dashboard, visitor pre-registration, dispatch approval, history, profile.
- **Reports** — daily/weekly/monthly trends + **CSV & PDF export**.
- **Notifications** — in-app arrival/approval/denial/dispatch/checkout/alert; structured for WhatsApp/SMS/email later.
- **Estate settings** — configurable validity, approval rules, etc.
- **Audit log** — WHO / WHAT / WHEN / person / device for every important action.
- **PWA** — manifest, installable icons, service worker with offline cache.

## 2) Tech stack

| Layer | Backend | Frontend |
|-------|---------|----------|
| Runtime | Node (Express 4) | Next.js 15 (App Router), React 19 |
| Language | TypeScript | TypeScript |
| DB | PostgreSQL via Prisma ORM | — (calls API) |
| Auth | jose (JWT), bcryptjs | bearer token in localStorage |
| Validation | zod | — |
| QR | qrcode (generate) | html5-qrcode (scan) |
| Export | jspdf + autotable (PDF), CSV | — |
| Styling | — | Tailwind CSS v4 (blue/white theme) |
| PWA | — | manifest + service worker + icons |

## 3) Database tables (Prisma, in `backend/prisma/schema.prisma`)

`User`, `SecurityOfficer`, `Property`, `Resident`, `Vehicle`, `Visitor`, `VisitorPass`,
`DispatchRider`, `AccessLog`, `Notification`, `AuditLog`, `EstateSettings` + 13 enums.
Generated DDL: `backend/prisma/silverland_schema.sql`.

## 4) How to run

Prerequisites: **Node 20+**, **PostgreSQL 16** (or Docker), two terminals.

### Backend (`:4000`)
```bash
cd silverlandApp/backend
npm install
# copy .env and set DATABASE_URL + AUTH_SECRET  (a working .env is provided)
npx prisma db push      # create tables
npm run seed            # optional DEMO data
npm run dev             # -> http://localhost:4000
```

### Frontend (`:3000`)
```bash
cd silverlandApp/frontend
npm install
# .env.local sets NEXT_PUBLIC_API_URL=http://localhost:4000  (provided)
npm run dev             # -> http://localhost:3000
```

Open **http://localhost:3000** and log in. To build for production: `npm run build` in each, then
`npm start` (backend) and `npm start` (frontend, `output: standalone` not used, standard `next start`).

## 5) Demo accounts (DEMO data only)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@silverland.ng` | `SuperAdmin@123` |
| Estate Management | `management@silverland.ng` | `Estate@123` |
| Security Officer | `officer.ade@silverland.ng` | `Officer@123` |
| Resident | `resident@silverland.ng` | `Resident@123` |

## 6) Environment variables

### `backend/.env`
| Variable | Purpose |
|----------|---------|
| `PORT` | backend port (default 4000) |
| `DATABASE_URL` | Postgres / Supabase connection string |
| `AUTH_SECRET` | JWT signing secret |
| `CORS_ORIGINS` | comma-separated frontend origins (default `http://localhost:3000`) |
| `ACCESS_TOKEN_EXPIRE_SECONDS` | session lifetime (28800s) |
| Defaults (visitor/dispatch validity, approval toggles) | |

### `frontend/.env.local`
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | backend base URL (default `http://localhost:4000`) |
| `NEXT_PUBLIC_APP_NAME` / `NEXT_PUBLIC_ESTATE_SUBTITLE` | branding |

## 7) Connect Supabase (backend)

1. Create a Supabase project → copy the **Pooler connection string** (PostgreSQL driver).
2. Set it as `DATABASE_URL` in `backend/.env`.
3. `cd backend && npx prisma db push` then optionally `npm run seed`.
4. For production migrations use `npx prisma migrate deploy` with committed migrations.

The backend talks to Postgres through Prisma and enforces authorization at the application layer.
Supabase Row-Level Security is not applied because Prisma uses the service-role connection.

## 8) Deploy

- **Backend**: any Node host (Railway, Render, Fly, a VPS). Set `PORT`, `DATABASE_URL`,
  `AUTH_SECRET`, `CORS_ORIGINS` (must include the frontend's public URL). Build with `npm run build`.
- **Frontend**: Vercel (or any static/Node host). Set `NEXT_PUBLIC_API_URL` to the public backend URL.
- Update `CORS_ORIGINS` on the backend to allow the deployed frontend origin, and use HTTPS in
  production (the PWA/service worker and bearer auth both work over HTTPS).

## 9) Security features

- bcrypt password hashing; signed, expiring JWT (bearer).
- Every endpoint enforces session + role (401/403).
- Opaque random QR tokens (never encode PII); expiry, single-use, revocable.
- Denied attempts always recorded and alerted to management.
- All important actions written to `audit_logs` with actor, entity, time, IP/user-agent.
- zod validation on all writes; CORS restricted to configured origins.

## 10) Known limitations

- WhatsApp/SMS/email notification delivery is scaffolded but not wired (`notify` layer + env placeholders).
- Offline mode of the service worker caches the app shell / reads only; write operations need connectivity.
- Photo upload storage is not connected (URLs only).
- Supabase Row-Level Security is not enforced (authorization is application-level).
- Camera QR scanning requires a secure context (HTTPS) or `localhost`.
