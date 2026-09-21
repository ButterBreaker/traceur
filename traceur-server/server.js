// Traceur — petit serveur qui gère la connexion Strava (OAuth) et sert l'appli.
// Le Client Secret n'est JAMAIS dans le code : il vient des variables
// d'environnement configurées sur Render (STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET,
// SESSION_SECRET).

const express = require("express");
const cookieSession = require("cookie-session");
const path = require("path");

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, SESSION_SECRET, PORT = 3000 } = process.env;
if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !SESSION_SECRET) {
  console.error("Variables manquantes : STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, SESSION_SECRET");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1); // Render est derrière un proxy HTTPS

app.use(cookieSession({
  name: "traceur",
  keys: [SESSION_SECRET],
  maxAge: 30 * 24 * 3600 * 1000, // 30 jours
  sameSite: "lax",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
}));

function baseUrl(req) {
  return `${req.protocol}://${req.get("host")}`;
}

// ---------- OAuth Strava ----------
app.get("/auth/strava", (req, res) => {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: `${baseUrl(req)}/auth/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
  });
  res.redirect(`https://www.strava.com/oauth/authorize?${params}`);
});

app.get("/auth/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect("/?erreur=refus");
  try {
    const r = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Échange de token refusé", r.status, data);
      return res.redirect("/?erreur=token");
    }
    req.session.strava = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      firstname: data.athlete && data.athlete.firstname,
    };
    res.redirect("/");
  } catch (e) {
    console.error(e);
    res.redirect("/?erreur=reseau");
  }
});

app.post("/auth/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

// Renvoie un access token valide, en le rafraîchissant si besoin.
async function getToken(req) {
  const s = req.session && req.session.strava;
  if (!s) return null;
  if (s.expires_at * 1000 > Date.now() + 60_000) return s.access_token;
  const r = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: s.refresh_token,
    }),
  });
  if (!r.ok) { req.session = null; return null; }
  const data = await r.json();
  req.session.strava = { ...s, access_token: data.access_token, refresh_token: data.refresh_token, expires_at: data.expires_at };
  return data.access_token;
}

// ---------- API ----------
app.get("/api/me", (req, res) => {
  const s = req.session && req.session.strava;
  res.json(s ? { connected: true, firstname: s.firstname || "" } : { connected: false });
});

app.get("/api/activities", async (req, res) => {
  try {
    const token = await getToken(req);
    if (!token) return res.status(401).json({ error: "non_connecte" });
    const r = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=15", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 401) { req.session = null; return res.status(401).json({ error: "non_connecte" }); }
    if (r.status === 429) return res.status(429).json({ error: "limite_strava" });
    if (!r.ok) return res.status(502).json({ error: "strava_indisponible" });
    const raw = await r.json();
    const acts = raw
      .filter(a => a.distance > 0 && a.map && a.map.summary_polyline)
      .slice(0, 10)
      .map(a => ({
        id: String(a.id),
        name: a.name,
        sport: a.sport_type || a.type,
        distance_m: a.distance,
        moving_time_s: a.moving_time,
        elevation_gain_m: a.total_elevation_gain,
        calories: a.calories || null,
        location: a.location_city || "",
        start_local: a.start_date_local,
        polyline: a.map.summary_polyline,
      }));
    res.json({ activities: acts });
  } catch (e) {
    console.error(e);
    res.status(502).json({ error: "strava_indisponible" });
  }
});

// ---------- Frontend ----------
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (req, res) => res.send("ok"));

app.listen(PORT, () => console.log(`Traceur en ligne sur le port ${PORT}`));
