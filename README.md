# StockPilot 🚀

**Inventory intelligence for growing businesses.** StockPilot is a full-stack inventory dashboard starter with a bold, responsive UI, product management, stock alerts, analytics, a REST API, PostgreSQL/Prisma configuration, tests, and CI.

> Status: portfolio-ready starter. The frontend includes seeded demo data for a polished first run. Connect PostgreSQL and configure the API to persist real data before production use.

## Features
- Responsive analytics dashboard with inventory KPIs and weekly movement visualization
- Product catalog with search, category filtering, stock status, and add-product flow
- Low-stock and out-of-stock views
- CSV export for the current product list
- Express REST API with Zod validation and Prisma/PostgreSQL data model
- API health endpoint, automated tests, Docker Compose, and GitHub Actions CI
- Environment-variable configuration; no secrets committed

## Stack
- Frontend: React, Vite, plain CSS design system, Lucide React
- Backend: Node.js, Express, Zod
- Data: PostgreSQL, Prisma ORM
- Tests: Vitest, React Testing Library, Node's built-in test runner / Supertest
- Delivery: Docker Compose and GitHub Actions

## Quick start
### Requirements
Node.js 20.19+ (or 22.12+), npm, and Docker Desktop (recommended for PostgreSQL). See the [Vite guide](https://vite.dev/guide/) for supported Node versions.

### 1. Configure environment
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```
On Windows PowerShell, use `Copy-Item server/.env.example server/.env` and the equivalent command for `client`.

### 2. Start PostgreSQL
```bash
docker compose up -d db
```
### 3. Install and initialize the API
```bash
cd server
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```
API defaults to `http://localhost:5000`.

### 4. Start the frontend
In a second terminal:
```bash
cd client
npm install
npm run dev
```
Open the URL printed by Vite (normally `http://localhost:5173`). The UI uses demo data unless `VITE_API_URL` is configured and the API is reachable.

## Scripts
| Directory | Command | Purpose |
|---|---|---|
| `client` | `npm run dev` | Start frontend development server |
| `client` | `npm run build` | Production frontend build |
| `client` | `npm test` | Run frontend tests |
| `server` | `npm run dev` | Start API with watch mode |
| `server` | `npm test` | Run API tests |
| `server` | `npm run db:deploy` | Apply committed Prisma migrations |
| root | `docker compose up --build` | Start the containerized stack |

## API overview
- `GET /api/health` — service health
- `GET /api/products` — list products; supports `q`, `category`, and `status` query parameters
- `POST /api/products` — create a product (validated server-side)
- `PATCH /api/products/:id/stock` — adjust stock by a signed integer `delta`
- `DELETE /api/products/:id` — delete a product

## Deployment checklist
1. Provision a managed PostgreSQL database and set `DATABASE_URL`.
2. Set a strong, unique `PORT`/platform configuration and `CLIENT_ORIGIN` for CORS.
3. Run `npx prisma migrate deploy` during release.
4. Deploy `server` as a Node service and `client` as a static Vite site; set `VITE_API_URL` to the public API URL.
5. Enable HTTPS, configure backups/monitoring, and use managed secrets.
6. Add authentication, authorization, audit logging, and rate limiting before handling real business data. The initial API is intentionally unauthenticated and is not production-safe for public write access.

## Project structure
```text
stockpilot/
├── client/                 # React dashboard
├── server/                 # Express API and Prisma schema
├── .github/workflows/ci.yml
├── docker-compose.yml
└── README.md
```

## Testing
Run `npm test` in both `client` and `server`, and `npm run build` in `client`. CI runs these checks on pushes and pull requests. Database integration checks require a configured PostgreSQL service.

## Roadmap
- Authentication and organization-level roles
- Suppliers, purchase orders, and stock movement ledger
- Pagination and server-side analytics
- Audit trail and alert delivery
- E2E tests and deployment-specific manifests

## License
MIT — see `LICENSE`.
