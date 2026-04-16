import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import sharp from "sharp";
import pg from "pg";
import { db } from "./db.js";
import { userPreferences, icons } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Ensure session table exists
pgPool.query(`
  CREATE TABLE IF NOT EXISTS "session" (
    "sid" varchar NOT NULL COLLATE "default",
    "sess" json NOT NULL,
    "expire" timestamp(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
  ) WITH (OIDS=FALSE);
  CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
`).catch((e: Error) => console.warn("[Sessions] Table setup warning:", e.message));

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    store: new PgSession({ pool: pgPool, tableName: "session" }),
    secret: process.env.SESSION_SECRET || "planlizz-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userName?: string;
    userAvatar?: string;
  }
}

function getAppUrl(req?: express.Request): string {
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (req) {
    const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
    const host = (req.headers["x-forwarded-host"] as string) || req.get("host") || "localhost:5000";
    return `${proto}://${host}`;
  }
  return "http://localhost:5000";
}

// Auth middleware — checks session
function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

// ── Auth Routes ────────────────────────────────────────────────────────────

// GET /api/auth/user — returns current session user
app.get("/api/auth/user", (req, res) => {
  if (!req.session.userId) {
    res.json({ user: null });
    return;
  }
  res.json({
    user: {
      id: req.session.userId,
      name: req.session.userName,
      avatar: req.session.userAvatar,
    },
  });
});

// POST /api/auth/guest — create a guest session
app.post("/api/auth/guest", (req, res) => {
  const guestId = `guest_${Date.now()}`;
  req.session.userId = guestId;
  req.session.userName = "Guest";
  res.json({ user: { id: guestId, name: "Guest", avatar: null } });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/auth/login — redirect to Google OAuth
app.get("/api/auth/login", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    // No OAuth configured — create a demo session
    req.session.userId = "demo_user";
    req.session.userName = "Demo User";
    res.redirect("/");
    return;
  }

  const redirectUri = `${getAppUrl(req)}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// GET /api/auth/callback — Google OAuth callback
app.get("/api/auth/callback", async (req, res) => {
  try {
    const { code, error } = req.query as { code?: string; error?: string };

    if (error || !code) {
      console.error("[OAuth] Error from Google:", error || "missing code");
      res.redirect(`/?auth_error=${encodeURIComponent(error || "missing_code")}`);
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      // Dev fallback — no credentials, demo session
      req.session.userId = "demo_user";
      req.session.userName = "Demo User";
      res.redirect("/");
      return;
    }

    const redirectUri = `${getAppUrl(req)}/api/auth/callback`;

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("[OAuth] Google token exchange failed:", errBody);
      let reason = "token_exchange_failed";
      try { reason = JSON.parse(errBody).error || reason; } catch {}
      res.redirect(`/?auth_error=${encodeURIComponent(reason)}`);
      return;
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    // Get user profile from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = (await userRes.json()) as {
      id: string;
      name: string;
      picture?: string;
      email?: string;
    };

    req.session.userId = `google_${profile.id}`;
    req.session.userName = profile.name;
    req.session.userAvatar = profile.picture;

    // Explicitly save session to DB before redirecting
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("[OAuth] Session save failed:", saveErr);
        res.redirect("/?auth_error=session_save_failed");
      } else {
        console.log("[OAuth] Login success:", req.session.userId);
        res.redirect("/");
      }
    });
  } catch (err) {
    console.error("[OAuth] Auth callback error:", err);
    res.redirect("/?auth_error=server_error");
  }
});

// ── User Preferences Routes ────────────────────────────────────────────────

// GET /api/preferences — load routines for logged-in user
app.get("/api/preferences", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const row = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    res.json({ routines: (row[0]?.routines as any[]) ?? [] });
  } catch (err) {
    console.error("Get preferences error:", err);
    res.status(500).json({ error: "Failed to load preferences" });
  }
});

// PUT /api/preferences — save routines for logged-in user
app.put("/api/preferences", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { routines } = req.body;

    await db
      .insert(userPreferences)
      .values({ userId, routines, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { routines, updatedAt: new Date() },
      });

    res.json({ ok: true });
  } catch (err) {
    console.error("Put preferences error:", err);
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

// GET /api/preferences/recent-icons — load recent icons for logged-in user
app.get("/api/preferences/recent-icons", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (userId.startsWith("guest")) {
      res.json({ recentIcons: [] });
      return;
    }
    const row = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    res.json({ recentIcons: (row[0]?.recentIcons as string[]) ?? [] });
  } catch (err) {
    console.error("Get recent icons error:", err);
    res.status(500).json({ error: "Failed to load recent icons" });
  }
});

// PUT /api/preferences/recent-icons — save recent icons for logged-in user
app.put("/api/preferences/recent-icons", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (userId.startsWith("guest")) {
      res.json({ ok: true });
      return;
    }
    const { recentIcons } = req.body;

    await db
      .insert(userPreferences)
      .values({ userId, recentIcons, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { recentIcons, updatedAt: new Date() },
      });

    res.json({ ok: true });
  } catch (err) {
    console.error("Put recent icons error:", err);
    res.status(500).json({ error: "Failed to save recent icons" });
  }
});

// ── Icons Routes ───────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Manha", "Tarde/Noite", "Saude", "Aprender", "Trabalho",
  "Profissoes", "Familia", "Bebe/Crianca", "Beleza", "Culinaria",
  "Tarefas-da-Casa", "Veiculos", "Exercicios", "Lazer",
  "Lanches/Bebidas", "Pets", "Eletronicos", "Comercio", "Musica", "Religiao",
];

function sanitizePath(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-_./]/g, "")
    .replace(/-+/g, "-");
}

async function toBase64_128px(imageUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(imageUrl);
    if (!resp.ok) return null;
    const arrayBuf = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const resized = await sharp(buffer)
      .resize(128, 128, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return resized.toString("base64");
  } catch {
    return null;
  }
}

async function syncIconsFromAirtable(): Promise<{ inserted: number; updated: number; skipped: number; errors: number; total_records: number } | { error: string }> {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!apiKey || !baseId) {
    return { error: "Airtable credentials not configured" };
  }

  const tableName = "tblNPJDonQwlhTADO";
  let allRecords: any[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableName}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);

    const aRes = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!aRes.ok) {
      const err = await aRes.text();
      return { error: `Airtable fetch failed: ${err}` };
    }

    const data = await aRes.json() as { records: any[]; offset?: string };
    allRecords = allRecords.concat(data.records || []);
    offset = data.offset;
  } while (offset);

  const existingRows = await db
    .select({ category: icons.category, filename: icons.filename, data: icons.data })
    .from(icons);
  const existingWithData = new Set(
    existingRows.filter(i => i.data).map(i => `${i.category}/${i.filename}`)
  );
  const existingAll = new Set(
    existingRows.map(i => `${i.category}/${i.filename}`)
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const record of allRecords) {
    const fields = record.fields || {};
    const category = fields["Notes"] || fields["Name"] || fields["Category"] || "Other";
    const attachments = fields["Anexos"] || fields["Attachments"] || [];

    for (const att of attachments) {
      if (!att.url || !att.filename) continue;
      const safeCat = sanitizePath(category);
      const safeFile = sanitizePath(att.filename);
      const key = `${safeCat}/${safeFile}`;

      if (existingWithData.has(key)) {
        skipped++;
        continue;
      }

      const b64 = await toBase64_128px(att.url);
      if (!b64) {
        errors++;
        continue;
      }

      try {
        if (existingAll.has(key)) {
          await db.update(icons)
            .set({ data: b64 })
            .where(and(eq(icons.category, safeCat), eq(icons.filename, safeFile)));
          updated++;
        } else {
          await db.insert(icons).values({
            category: safeCat,
            filename: safeFile,
            storagePath: att.url,
            data: b64,
          });
          inserted++;
        }
        existingWithData.add(key);
        existingAll.add(key);
      } catch (e) {
        console.error("Error saving icon:", att.filename, e);
        errors++;
      }
    }
  }

  return { total_records: allRecords.length, inserted, updated, skipped, errors };
}

// GET /api/icons — return icons grouped by category (base64 data when available)
app.get("/api/icons", async (_req, res) => {
  try {
    const allIcons = await db
      .select()
      .from(icons)
      .orderBy(icons.createdAt);

    if (allIcons.length === 0) {
      res.json({ categories: [], message: "No icons synced yet." });
      return;
    }

    const categoryMap: Record<
      string,
      { name: string; icons: { url: string; filename: string }[] }
    > = {};
    const seenPerCategory: Record<string, Set<string>> = {};

    for (const icon of allIcons) {
      if (!categoryMap[icon.category]) {
        categoryMap[icon.category] = { name: icon.category, icons: [] };
        seenPerCategory[icon.category] = new Set();
      }
      if (seenPerCategory[icon.category].has(icon.filename)) continue;
      seenPerCategory[icon.category].add(icon.filename);

      const url = icon.data
        ? `data:image/png;base64,${icon.data}`
        : icon.storagePath.startsWith("http")
        ? icon.storagePath
        : `/icons/${icon.storagePath}`;

      categoryMap[icon.category].icons.push({ url, filename: icon.filename });
    }

    const categories = CATEGORY_ORDER.filter((cat) => categoryMap[cat])
      .map((cat) => categoryMap[cat])
      .concat(
        Object.keys(categoryMap)
          .filter((cat) => !CATEGORY_ORDER.includes(cat))
          .map((cat) => categoryMap[cat])
      )
      .filter((c) => c.icons.length > 0);

    res.json({ categories });
  } catch (err) {
    console.error("Icons error:", err);
    res.status(500).json({ error: "Failed to load icons" });
  }
});

// POST /api/icons/sync — sync icons from Airtable, store as 128px base64 in DB
app.post("/api/icons/sync", async (_req, res) => {
  try {
    const result = await syncIconsFromAirtable();
    if ("error" in result) {
      res.status(500).json({ error: result.error });
      return;
    }
    res.json({ success: true, stats: result });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Auto-sync icons in the background if the DB is empty
async function autoSyncIconsIfEmpty() {
  try {
    const rows = await db.select({ filename: icons.filename }).from(icons).limit(1);
    if (rows.length === 0) {
      console.log("[Icons] DB is empty — starting background Airtable sync...");
      const result = await syncIconsFromAirtable();
      if ("error" in result) {
        console.error("[Icons] Auto-sync failed:", result.error);
      } else {
        console.log(`[Icons] Auto-sync done: ${result.inserted} inserted, ${result.skipped} skipped, ${result.errors} errors.`);
      }
    } else {
      console.log("[Icons] DB already has icons — skipping auto-sync.");
    }
  } catch (e) {
    console.error("[Icons] Startup icon check failed:", e);
  }
}

// Run startup check after a short delay
setTimeout(() => autoSyncIconsIfEmpty(), 2000);
