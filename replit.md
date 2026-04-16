# PlanLizz — Replit Environment

## Overview
PlanLizz is a React + TypeScript daily routine planner app (PWA). Migrated from Lovable to Replit.

## Architecture
- **Frontend**: React 18, Vite 8, TypeScript, Tailwind CSS, Shadcn/ui, Zustand, TanStack Query
- **Backend**: Express.js server (TypeScript via tsx), Drizzle ORM, PostgreSQL
- **Auth**: Session-based auth via Express sessions. Login redirects to `/api/auth/login` (Replit OIDC or demo mode). Guest mode is supported without login.
- **Database**: Replit-provisioned PostgreSQL (see `DATABASE_URL` env var)
- **Icons**: Icon catalog stored in `icons` table in PostgreSQL. Sync from Airtable via `POST /api/icons/sync` (requires `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` env vars).

## Key Files
- `server/index.ts` — Express server, all API routes
- `server/db.ts` — Drizzle database connection
- `shared/schema.ts` — Drizzle table definitions (user_preferences, icons)
- `drizzle.config.ts` — Drizzle Kit config
- `vite.config.ts` — Vite config (proxies `/api` to Express on port 3001)
- `src/hooks/useAuth.ts` — Client-side auth hook (session-based)
- `src/hooks/useRoutinesSync.ts` — Syncs routines to/from server API
- `src/hooks/useAirtableIcons.ts` — Fetches icons from `/api/icons`

## Ports
- `5000` — Vite dev server (frontend, proxies /api to 3001)
- `3001` — Express API server

## Dev Commands
```bash
npm run dev       # Start both server (3001) and client (5000) in parallel
npm run db:push   # Push schema to database
```

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Secret for Express sessions (optional, defaults to dev value)
- `AIRTABLE_API_KEY` — For syncing icons from Airtable (optional)
- `AIRTABLE_BASE_ID` — For syncing icons from Airtable (optional)
- `REPLIT_CLIENT_ID` / `REPLIT_CLIENT_SECRET` / `REPLIT_APP_URL` — For full Replit OIDC auth (optional; app works in demo mode without these)
- `SUPABASE_URL` — Legacy, used only to build public icon URLs if icons are still stored in Supabase storage (optional)

## Migration Notes (from Lovable)
- Removed: `vite-plugin-pwa`, `@lovable.dev/cloud-auth-js`, `lovable-tagger`, `@supabase/supabase-js`
- `src/integrations/supabase/client.ts` is stubbed (returns null)
- `src/integrations/lovable/index.ts` is stubbed (redirects to /api/auth/login)
- Supabase Edge Functions replaced by Express routes in `server/index.ts`
- Supabase auth replaced by session-based auth with Replit OIDC support
