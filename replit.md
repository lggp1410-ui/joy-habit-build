# PlanLizz — Replit Environment

## Overview
PlanLizz is a React + TypeScript daily routine planner app (PWA). Migrated from Lovable to Replit.

## Architecture
- **Frontend**: React 18, Vite 8, TypeScript, Tailwind CSS, Shadcn/ui, Zustand, TanStack Query
- **Backend**: Express.js server (TypeScript via tsx), Drizzle ORM, PostgreSQL
- **Auth**: Session-based auth via Express sessions. Google OAuth redirects through `/api/auth/login` and `/api/auth/callback`; guest mode is supported without login. In embedded preview/iframe contexts, the Google login opens in a new tab because Google blocks OAuth flows inside iframes.
- **Database**: Replit-provisioned PostgreSQL (see `DATABASE_URL` env var)
- **Icons**: Icon catalog stored in `icons` table in PostgreSQL. Auto-synced from Airtable on server startup if DB is empty (requires `AIRTABLE_API_KEY`; `AIRTABLE_BASE_ID` is optional when the token can list accessible bases). Manual sync available at `POST /api/icons/sync`. Icons are stored and served only as 128px Base64 PNGs in the DB, avoiding external Airtable URLs in the app.
- **Recent Icons**: Stored only in this installation's IndexedDB. They are intentionally not synced to the server so they disappear after uninstall/reinstall.
- **Notifications/Timers**: `public/timer-sw.js` registers even inside preview if allowed, persists routine reminders and the active timer in IndexedDB, shows an audible/vibrating timer notification at start/pause/completion, and attempts native timestamp-trigger scheduling when supported by the browser. Exact delivery while the app is fully closed still depends on OS/browser PWA notification support and battery restrictions.

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
npm run start     # Start both Express server (3001) and Vite dev server (5000) in parallel
npm run server    # Start Express server only
npm run dev       # Start Vite dev server only
npm run db:push   # Push schema changes to the database
```

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `SESSION_SECRET` — Secret for Express sessions (set via Replit Secrets)
- `AIRTABLE_API_KEY` — For syncing icons from Airtable (optional)
- `AIRTABLE_BASE_ID` — Optional base override for syncing icons from Airtable
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — For Google OAuth login (app works in guest/demo mode without these)

## Migration Notes (from Lovable)
- Removed: `vite-plugin-pwa`, `@lovable.dev/cloud-auth-js`, `lovable-tagger`, `@supabase/supabase-js`
- `src/integrations/supabase/client.ts` is stubbed (returns null)
- `src/integrations/lovable/index.ts` is stubbed (redirects to /api/auth/login)
- Supabase Edge Functions replaced by Express routes in `server/index.ts`
- Supabase auth replaced by session-based auth with Google OAuth support
