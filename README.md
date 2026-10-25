# StockPilot 🚀

**Inventory intelligence for growing businesses.** StockPilot is a full-stack inventory dashboard starter with a bold, responsive UI, product management, stock alerts, analytics, a REST API, PostgreSQL/Prisma configuration, tests, and CI.

> Status: portfolio-ready starter. The frontend includes seeded demo data for a polished first run. Connect PostgreSQL and configure the API to persist real data before production use.

## Features
- Responsive inventory dashboard with inventory KPIs, weekly stock movement, and low-stock alerts
- Sales intelligence page with monthly revenue, units sold, top products, and recent imported records
- CSV sales imports with row validation, error reporting, sample template download, and append-only history
- Supports standard sales CSVs and the uploaded video-game sales schema (`Name`, `Genre`, `Year`, `Global_Sales`); `Global_Sales` is interpreted as millions of units, never currency
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
- `GET /api/sales` — retrieve persisted sales history
- `POST /api/sales/import` — validate and append sales rows (up to 20,000 per request)

## Sales CSV format

The dashboard includes demo sales history for electronics such as studio headphones, mechanical keyboards, wireless mice, USB-C docks, webcams, and portable SSDs. Download the sample CSV directly from the Sales page. Standard uploads use these columns:

```csv
date,product,category,units_sold,revenue
2026-10-01,Wireless Mouse,Electronics,12,479.88
2026-10-02,Studio Headphones,Electronics,8,1199.92
```

`date`, `product`, and `units_sold` are required (a `year` column can stand in for `date`); `category` and `revenue` are optional. CSV uploads append to existing records rather than replacing them. Rows that fail validation are reported before import. When the revenue column is absent, units still count toward volume and rankings, but are excluded from revenue totals.

The app also recognizes the `vgsales.csv`-style headers `Name`, `Genre`, `Year`, and `Global_Sales`. In that dataset, `Global_Sales` is measured in millions of game copies, so it is converted to units sold; it is not treated as money. Rows without a usable year are flagged and skipped.

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
