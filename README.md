# Walsh Co

A renovation workspace for 322 Osborne and future properties — built on
Next.js 16 (App Router, Turbopack), React 19, TypeScript, and Tailwind v4.

The app gives a single project owner one place to track contractors, bids,
tasks, documents, and budget for an active renovation, with server-side
adapters for the external tools the project relies on (Slack, Microsoft
Teams, Microsoft Planner, Microsoft Excel, GitHub, Notion, Midpage).

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run lint         # ESLint (Next 16 + TypeScript rules)
```

The app is fully usable with no external configuration — everything ships
with realistic mock data so you can navigate the workspace immediately.

## Project layout

```
src/
├─ app/
│  ├─ layout.tsx              root layout (typekit fonts, viewport)
│  ├─ page.tsx                landing page with section cards
│  ├─ not-found.tsx           404
│  ├─ (app)/                  authenticated app shell (sidebar + topbar)
│  │  ├─ layout.tsx
│  │  ├─ loading.tsx          shared skeleton
│  │  ├─ error.tsx            shared error boundary
│  │  ├─ workbench/           project overview
│  │  ├─ contractors/         filterable directory
│  │  ├─ bids/                comparison table
│  │  ├─ tasks/               kanban-style execution board
│  │  ├─ documents/           contracts, COIs, permits, etc.
│  │  ├─ budget/              estimated/quoted/committed/paid by category
│  │  ├─ integrations/        connector dashboard (server component)
│  │  └─ settings/            workspace + access
│  └─ api/
│     └─ integrations/        server-only adapter routes
├─ components/
│  ├─ app-shell.tsx           sidebar + topbar wrapper
│  ├─ sidebar.tsx
│  ├─ top-bar.tsx             includes ⌘K trigger
│  ├─ command-palette.tsx     keyboard-driven nav
│  ├─ page-header.tsx
│  ├─ section-panel.tsx
│  └─ progress-bar.tsx
└─ lib/
   ├─ navigation.tsx          icons + sidebar/landing definitions
   ├─ status.ts               status tones + label dictionaries
   ├─ mock-data.ts            sample contractors/bids/tasks/etc.
   ├─ integrations.ts         integration registry + env-var status
   ├─ integration-adapters.ts server-only HTTP adapters
   └─ api-helpers.ts          shared route-handler error mapping
```

## Integrations

External tools are represented as **server-side adapters** so credentials
never reach the browser. Every integration is registered in
`src/lib/integrations.ts` with the env vars it needs; the adapter functions
in `src/lib/integration-adapters.ts` throw `IntegrationNotConfiguredError`
when those env vars are missing, and the route handlers translate that into
a `501 Not Implemented` response.

Visit `/integrations` for a live status dashboard. It renders on the server
and shows which connectors are configured for the current environment.

| Integration       | Required env                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------- |
| GitHub            | `GITHUB_TOKEN`, `GITHUB_REPO`                                                               |
| Slack             | `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`                                                       |
| Microsoft Teams   | `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`                        |
| Microsoft Planner | `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_PLANNER_PLAN_ID`  |
| Microsoft Excel   | `MS_GRAPH_TENANT_ID`, `MS_GRAPH_CLIENT_ID`, `MS_GRAPH_CLIENT_SECRET`, `MS_EXCEL_FILE_ID`    |
| Notion            | `NOTION_API_KEY`, `NOTION_DATABASE_ID`                                                      |
| Midpage           | `MIDPAGE_API_KEY`                                                                           |

For local development, drop them into a `.env.local` file at the repo root.
For production, set them on your hosting provider (Vercel, Cloudflare Pages,
self-hosted).

### Sample adapter routes

| Route                                     | Purpose                                |
| ----------------------------------------- | -------------------------------------- |
| `GET  /api/integrations`                  | Status of every integration            |
| `POST /api/integrations/slack/post`       | Send a message to the project channel  |
| `GET  /api/integrations/notion/search?q=` | Search across the Notion workspace     |
| `GET  /api/integrations/github/issues`    | List open issues from `GITHUB_REPO`    |

When credentials are missing each route returns:

```json
{ "error": "Integration not configured", "integration": "slack", "missing": ["SLACK_BOT_TOKEN"] }
```

## Keyboard shortcuts

- `⌘K` (macOS) / `Ctrl + K` — open the command palette to jump to any page.
- `↑` / `↓` to move, `Enter` to open, `Esc` to close.

## Access

The deployment is fronted by Cloudflare Access with Microsoft as the
identity provider; the app itself does not handle authentication. Access
policies live in the Cloudflare dashboard.

## Deployment

The repo builds cleanly with `next build` and can deploy to any Next.js
host. The suggested workflow:

1. Push the branch and open a pull request.
2. Configure required integration env vars on the host.
3. Cloudflare Access enforces the Microsoft sign-in gate at the edge.
