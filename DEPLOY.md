# Deploying Silverland (two-tier)

- **Backend** = Express + Prisma API → **Render** (https://render.com)
- **Frontend** = Next.js → **Netlify** (https://netlify.com)

Both provide **HTTPS**, which is required for the phone's QR camera (`getUserMedia`).

> Vercel also works natively for the Next.js frontend if you prefer (simpler) — the steps below use Netlify as requested.

---

## 0) Prerequisites

1. Put the project in a **GitHub repo** (both `backend/` and `frontend/` in the same repo).
2. Confirm `.env` files are **NOT committed** (they are git-ignored). Only `.env.example` is committed.

---

## 1) Create the database (Supabase — free, recommended)

1. Create a Supabase project → *Project Settings → Database → Connection string* → copy the **Pooler** (port 5432) PostgreSQL string, e.g.
   ```
   postgresql://postgres.<ref>:<password>@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public
   ```
2. Create the tables by running (from your machine, against that URL):
   ```bash
   cd backend
   npx prisma db push
   npm run seed        # optional DEMO data
   ```
   > Do this once locally with `DATABASE_URL` pointed at Supabase, or run it via the Render "Shell".
   > Alternative: use Render's free PostgreSQL and use its connection string.

---

## 2) Deploy the backend to Render

Option A — **Render Blueprint** (uses the included `backend/render.yaml`):
- Push repo → Render → *New → Blueprint* → select repo. Fill in the `DATABASE_URL` and `AUTH_SECRET` "sync: false" secrets in the dashboard.

Option B — **Manual Web Service** (recommended):
1. Render → *New → Web Service* → connect your GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm ci && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
3. Environment variables:
   - `NODE_VERSION` = `20`
   - `DATABASE_URL` = your Supabase pooler string
   - `AUTH_SECRET` = long random string (`openssl rand -base64 32`)
   - `CORS_ORIGINS` = `http://localhost:3000` (update to the Netlify URL in step 3)
   - `ACCESS_TOKEN_EXPIRE_SECONDS` = `28800`
4. Deploy. Copy the service URL — it looks like `https://silverland-backend-xxxx.onrender.com`.

> Render injects `PORT` automatically, so the app binds correctly. Free instances idle after ~15 min and wake on the first request (adds ~50s).

---

## 3) Deploy the frontends to Netlify (or run live)

Because the platform is now split into three distinct apps, you can deploy each as a Netlify site from the same GitHub repository:

### Site A: Admin Web App (`adminweb`)
1. Netlify → *Add new site → Import an existing project* → select repo.
2. **Build settings:**
   - **Base directory:** `adminweb`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
3. **Environment variables:**
   - `NEXT_PUBLIC_API_URL` = your Render backend URL (e.g. `https://silverland-backend-xxxx.onrender.com`)
   - `NEXT_PUBLIC_APP_NAME` = `Silverland Zone`
   - `NEXT_PUBLIC_ESTATE_SUBTITLE` = `Tedo Housing Estate`

### Site B: Resident Mobile App (`resident-mobile`)
1. Netlify → *Add new site → Import an existing project* → select repo.
2. **Build settings:**
   - **Base directory:** `resident-mobile`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
3. **Environment variables:**
   - `NEXT_PUBLIC_API_URL` = your Render backend URL

### Site C: Officer Mobile Terminal (`officer-mobile`)
1. Netlify → *Add new site → Import an existing project* → select repo.
2. **Build settings:**
   - **Base directory:** `officer-mobile`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
3. **Environment variables:**
   - `NEXT_PUBLIC_API_URL` = your Render backend URL

---

## 4) Connect CORS on Render

Update the backend's `CORS_ORIGINS` in the Render dashboard to include your deployed Netlify URLs (comma-separated):
```
CORS_ORIGINS=https://admin.silverland.ng,https://resident.silverland.ng,https://officer.silverland.ng
```
*(Or leave `CORS_ORIGINS` empty so it reflects the requesting origin automatically).*

---

## 5) Running Locally with Live Backend

You can also run the resident and officer apps on your machine/phone immediately while pointing them to your live Render backend:

In `resident-mobile/.env.local` and `officer-mobile/.env.local`:
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```
Then start the apps:
- `npm --prefix resident-mobile run dev` (Port 3001)
- `npm --prefix officer-mobile run dev` (Port 3002)

---

## Common gotchas

- **`NEXT_PUBLIC_API_URL` must be set at build time.** If you change the backend URL, re-run the Netlify build.
- **CORS:** if the frontend shows network errors, check the backend's `CORS_ORIGINS` exactly matches the frontend origin (no trailing slash mismatch; multiple origins comma-separated).
- **Secrets:** never commit `.env`. All secrets are dashboard env vars.
- **DB migrations on deploy:** run `npx prisma db push` (or `migrate deploy`) against the production DB before/at first deploy. `db push` is fine for now; use committed `migrations/` + `prisma migrate deploy` for a strict production setup.
- **Render free tier** sleeps → the first visit after idle is slow. Wake the backend first (open its `/health`), then use the frontend.
