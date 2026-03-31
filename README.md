# Ledgerbook (Church Ledger)

Full-stack ledger app (React + Express + Sequelize + SQLite/PostgreSQL) with multi-tenant support.

## Features
- User registration and login with JWT
- Organization-level tenant isolation
- Ledger and transaction CRUD
- PDF export + saved records
- Docker + docker-compose ready
- API security: Helmet + rate limit + CORS

## Quick start (local)

1. Copy environment file:
   - `cp .env.example .env`
   - Edit secrets in `.env`, especially `JWT_SECRET`.

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

`docker-compose up --build`

- Backend at `localhost:3000`
- Frontend at `localhost:5173` (proxy to backend)

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
- For production, set `NODE_ENV=production` and use PostgreSQL with `DATABASE_URL`.
- Keep `JWT_SECRET` confidential.
- Add tests and continuous integration for release.
