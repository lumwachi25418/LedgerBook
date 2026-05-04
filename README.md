# Ledgerbook (Church Ledger)

Full-stack ledger app (React + Express + Sequelize + PostgreSQL) with multi-tenant support.

## Features
- User registration and login with JWT
- Organization-level tenant isolation
- Ledger and transaction CRUD
- PDF export + saved records
- Docker + docker-compose ready
- API security: Helmet + rate limit + CORS

## Quick start (local)

1. Copy environment files:
   - `cp Backend/.env.example Backend/.env`
   - `cp Frontend/.env.example Frontend/.env`
   - Edit secrets in `Backend/.env`, especially `JWT_SECRET`.

2. Backend
   - `cd Backend`
   - `npm install`
   - `npm run dev` (or `npm start`)

3. Frontend
   - `cd Frontend`
   - `npm install`
   - `npm run dev`

4. Open
   - Frontend: `http://localhost:5173`
   - Backend health: `http://localhost:3000/health`

## Docker

1. Set a secret:
   - `export JWT_SECRET="$(openssl rand -hex 32)"`

2. Start the stack:
   - `docker-compose up --build`

- Backend at `localhost:3000`
- Frontend at `localhost:5173`
- PostgreSQL runs inside Docker and persists in the `ledgerbook-postgres-data` volume.

## API Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /api/ledgers`
- `POST /api/ledgers`
- `GET /api/ledgers/:ledgerId`
- `PUT /api/ledgers/:ledgerId`
- `DELETE /api/ledgers/:ledgerId`
- `GET /api/ledgers/:ledgerId/transactions`
- `POST /api/ledgers/:ledgerId/transactions`
- `PUT /api/ledgers/:ledgerId/transactions/:transactionId`
- `DELETE /api/ledgers/:ledgerId/transactions/:transactionId`

## Notes
- For production, set `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, and `CORS_ORIGIN`.
- Run migrations before serving traffic: `cd Backend && npm run start:production`.
- Keep `JWT_SECRET` confidential.
- `ENABLE_ADMIN_USERS=true` exposes the authenticated organization-scoped `/admin/users` endpoint; keep it unset unless needed.
- Add continuous integration before release.
