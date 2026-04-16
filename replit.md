# PlanLizz — Replit Environment

## Overview
PlanLizz is a React + TypeScript daily routine planner app (PWA). Migrated from Lovable to Replit.

## Architecture
- **Frontend**: React 18, Vite 8, TypeScript, Tailwind CSS, Shadcn/ui, Zustand, TanStack Query
- **Backend**: Express.js server (TypeScript via tsx), Drizzle ORM, PostgreSQL
- **Auth**: Session-based auth via Express sessions. Login uses Google Identity Services popup + `/api/auth/google-login` when `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured, avoiding redirect URI mismatch. `/api/auth/login` remains as a redirect fallback. Guest mode is supported without login.
- **Database**: Replit-provisioned PostgreSQL (see `DATABASE_URL` env var)
- **Icons**: Icon catalog stored in `icons` table in PostgreSQL. Auto-synced from Airtable on server startup if DB is empty (requires `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID`). Manual sync available at `POST /api/icons/sync`. Icons are stored as 128px Base64 PNGs in the DB.
- **Recent Icons**: Stored in IndexedDB only and synced to the server only after the current install has local recent icons. They are intentionally excluded from localStorage so Recentes clears on app reinstall.
- **Notifications**: `/timer-sw.js` handles routine reminders and persistent timer notifications. Timer notifications include the routine id so tapping them opens the routine and timer.
- **Production serving**: `server/index.ts` serves the Vite `dist/` build when present, while development uses Vite on port 5000 with `/api` proxied to Express.

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
- `AIRTABLE_BASE_ID` — For syncing icons from Airtable (optional)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — For Google OAuth login (optional; app works in guest/demo mode without these)

## Migration Notes (from Lovable/Replit Agent)
- Removed: Supabase client code, Supabase Edge Functions, and Supabase migrations
- `src/integrations/lovable/index.ts` is stubbed (redirects to /api/auth/login)
- Supabase Edge Functions replaced by Express routes in `server/index.ts`
- Supabase auth replaced by session-based auth with Replit OIDC support
