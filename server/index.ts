import express from "express";
import session from "express-session";
import cors from "cors";
import { db } from "./db.js";
import { userPreferences, icons } from "../shared/schema.js";
import { eq } from "drizzle-orm";

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "planlizz-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

declare module "express-session" {
  interface SessionData {
    userId?: string;
    userName?: string;
    userAvatar?: string;
  }
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

// Replit OIDC callback — Replit Auth redirects here after login
app.get("/api/auth/callback", async (req, res) => {
  try {
    const { code } = req.query as { code: string };
    if (!code) {
      res.status(400).json({ error: "Missing code" });
      return;
    }

    const clientId = process.env.REPLIT_CLIENT_ID;
    const clientSecret = process.env.REPLIT_CLIENT_SECRET;
    const redirectUri = `${process.env.REPLIT_APP_URL || "http://localhost:5000"}/api/auth/callback`;

    if (!clientId || !clientSecret) {
      // Dev mode — no OIDC configured, treat as generic login
      res.redirect("/");
      return;
    }

    const tokenRes = await fetch("https://replit.com/api/v0/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text());
      res.redirect("/?auth_error=1");
      return;
    }

    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch("https://replit.com/api/v0/account", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = (await userRes.json()) as {
      id: string;
      username: string;
      profileImageUrl?: string;
    };

    req.session.userId = `replit_${profile.id}`;
    req.session.userName = profile.username;
    req.session.userAvatar = profile.profileImageUrl;

    res.redirect("/");
  } catch (err) {
    console.error("Auth callback error:", err);
    res.redirect("/?auth_error=1");
  }
});

// GET /api/auth/login — redirect to Replit OAuth
app.get("/api/auth/login", (req, res) => {
  const clientId = process.env.REPLIT_CLIENT_ID;
  const appUrl =
    process.env.REPLIT_APP_URL || "http://localhost:5000";
  const redirectUri = `${appUrl}/api/auth/callback`;

  if (!clientId) {
    // No OIDC configured — just create a demo session
    req.session.userId = "demo_user";
    req.session.userName = "Demo User";
    res.redirect("/");
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identity",
  });
  res.redirect(`https://replit.com/api/v0/oauth/authorize?${params}`);
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

// ── Icons Routes ───────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Manha", "Tarde/Noite", "Saude", "Aprender", "Trabalho",
  "Profissoes", "Familia", "Bebe/Crianca", "Beleza", "Culinaria",
  "Tarefas-da-Casa", "Veiculos", "Exercicios", "Lazer",
  "Lanches/Bebidas", "Pets", "Eletronicos", "Comercio", "Musica", "Religiao",
];

// GET /api/icons — return icons grouped by category
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

    const supabaseUrl = process.env.SUPABASE_URL;
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

      const url = supabaseUrl
        ? `${supabaseUrl}/storage/v1/object/public/icons/${icon.storagePath}`
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

// POST /api/icons/sync — sync icons from Airtable into our DB
app.post("/api/icons/sync", async (_req, res) => {
  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!apiKey || !baseId) {
      res.status(500).json({ error: "Airtable credentials not configured" });
      return;
    }

    function sanitizePath(str: string): string {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9\-_./]/g, "")
        .replace(/-+/g, "-");
    }

    const tableName = "tblNPJDonQwlhTADO";
    let allRecords: any[] = [];
    let offset: string | undefined;

    do {
      const url = new URL(
        `https://api.airtable.com/v0/${baseId}/${tableName}`
      );
      url.searchParams.set("pageSize", "100");
      if (offset) url.searchParams.set("offset", offset);

      const aRes = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!aRes.ok) {
        const err = await aRes.text();
        res
          .status(aRes.status)
          .json({ error: "Airtable fetch failed", details: err });
        return;
      }

      const data = await aRes.json() as { records: any[]; offset?: string };
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset;
    } while (offset);

    const existingRows = await db
      .select({ category: icons.category, filename: icons.filename })
      .from(icons);
    const existingSet = new Set(
      existingRows.map((i) => `${i.category}/${i.filename}`)
    );

    let uploaded = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of allRecords) {
      const fields = record.fields || {};
      const category =
        fields["Notes"] || fields["Name"] || fields["Category"] || "Other";
      const attachments =
        fields["Anexos"] || fields["Attachments"] || [];

      for (const att of attachments) {
        if (!att.url || !att.filename) continue;
        const safeCat = sanitizePath(category);
        const safeFile = sanitizePath(att.filename);
        const key = `${safeCat}/${safeFile}`;
        if (existingSet.has(key)) {
          skipped++;
          continue;
        }

        try {
          await db.insert(icons).values({
            category: safeCat,
            filename: safeFile,
            storagePath: att.url,
          });
          uploaded++;
          existingSet.add(key);
        } catch (e) {
          console.error("Error inserting icon:", att.filename, e);
          errors++;
        }
      }
    }

    res.json({
      success: true,
      stats: {
        total_records: allRecords.length,
        uploaded,
        skipped,
        errors,
      },
    });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
