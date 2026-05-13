# J.G. Walsh & Co. Workspace

Private portfolio, market intelligence, and renovation operations workspace for
J.G. Walsh & Co.

Stack: Next.js (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL
(Railway). Cloudflare Access + Microsoft Entra protect the production app.

## Getting Started

```bash
npm install
npm run dev
```

Open <http://localhost:3000> with your browser.

## Environment

Copy `.env.example` to `.env` and fill in `DATABASE_URL`. The contacts module
(and any future DB-backed module) requires a reachable Postgres.

```bash
cp .env.example .env
# DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public"
```

For local development, point `DATABASE_URL` at a local Postgres or a Railway
database branch URL. **Never commit a real `DATABASE_URL`.**

## Database (Prisma)

Schema lives in [`prisma/schema.prisma`](./prisma/schema.prisma).

| Script | What it does |
| --- | --- |
| `npm run db:generate` | Regenerate Prisma Client (run after schema edits) |
| `npm run db:migrate` | Create + apply a new dev migration locally (`prisma migrate dev`) |
| `npm run db:migrate:deploy` | Apply pending migrations against the configured database (used by Railway pre-deploy) |
| `npm run db:seed` | Run [`prisma/seed.ts`](./prisma/seed.ts) — inserts placeholder contacts |
| `npm run db:studio` | Open Prisma Studio against the configured database |

### First-time local setup

```bash
# 1. Set DATABASE_URL in .env
# 2. Create + apply the initial migration
npm run db:migrate -- --name init

# 3. (Optional) seed placeholder contacts
npm run db:seed

# 4. Start the dev server
npm run dev
```

### After schema changes

```bash
npm run db:migrate -- --name describe_change
npm run db:generate
```

`prisma migrate dev` writes a new SQL file under `prisma/migrations/` —
**commit those files** so they replay in production.

## Railway deployment

Once `prisma/migrations/*` has at least one committed migration, set the
**Pre-Deploy Command** on the Railway `walsh-co` service to:

```bash
npx prisma migrate deploy
```

This applies any pending migrations before the new build starts. Railway
provides `DATABASE_URL` to the running service automatically — do not commit it.

## Auth

The production app sits behind **Cloudflare Access** with **Microsoft Entra**
login. The app itself is not currently auth-aware (no app-native auth, no
Microsoft Graph / Google Workspace / Apple Contacts sync).

## Modules

- **Contacts** (`/contacts`) — first-class contact manager (contractors,
  professionals, municipal, vendors). DB-backed; full CRUD + favorites.
- **Market Tracker** (`/market`) — placeholder market intelligence panels.
- **Portfolio / Properties / Renovation / Documents / Budget / Tasks /
  Quotes / Settings** — workspace pages. The Quotes workspace may still use
  `/bids` internally for routing compatibility.

## Learn More

- [Next.js documentation](https://nextjs.org/docs)
- [Prisma documentation](https://www.prisma.io/docs)
