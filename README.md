# Wallet Transaction Processing

NestJS API for merchants, wallets, charges, refunds, and ledger entries. PostgreSQL is accessed via Prisma.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/)
- Docker (for PostgreSQL)

## Project setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables and set `DATABASE_URL`:

```bash
cp .env.example .env
```

Example `DATABASE_URL` when using the bundled Postgres container:

```
DATABASE_URL=postgresql://wallets_app_user:wallets_app_password@localhost:5432/wallets_app_db
```

3. Start PostgreSQL:

```bash
docker compose up -d postgres
```

4. Generate the Prisma client and apply migrations:

```bash
pnpm prisma:generate
pnpm prisma:migrate
```

5. (Optional) Load sample data:

```bash
pnpm prisma:seed
```

6. Run the API:

```bash
pnpm start:dev
```

The server listens on `http://localhost:3000` by default (`PORT` in `.env` overrides this).

### Docker (API + database)

```bash
# Development (hot reload)
docker compose --profile dev up

# Production image
docker compose --profile prod up
```

## Application usage

### API documentation

Open [http://localhost:3000](http://localhost:3000) — the root URL redirects to Swagger UI at `/api/v1/docs`.

Set `SWAGGER_ENABLED=false` in `.env` to disable the docs UI.

### Health check

```bash
curl http://localhost:3000/api/v1/health
```

### Main resources

All routes are under the `/api/v1` prefix:

| Area | Base path | Purpose |
|------|-----------|---------|
| Merchants | `/api/v1/merchants` | Create and manage merchants |
| Wallets | `/api/v1/wallets` | Create wallets and update status |
| Transactions | `/api/v1/transactions` | Charge and refund |
| Ledger | `/api/v1/wallets/:walletId/ledger-entries` | List ledger entries per wallet or transaction |

Use Swagger to explore request bodies, query parameters, and try requests interactively.

### Useful scripts

| Command | Description |
|---------|-------------|
| `pnpm start:dev` | Run API with watch mode |
| `pnpm start:prod` | Run built app (`pnpm build` first) |
| `pnpm prisma:migrate` | Apply database migrations |
| `pnpm prisma:seed` | Seed sample merchants, wallets, and transactions |
| `pnpm test` | Unit tests |
