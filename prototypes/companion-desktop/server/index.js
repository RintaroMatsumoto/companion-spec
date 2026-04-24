// companion-desktop prototype — local server.
//
// Responsibilities:
//   - Serve the browser UI (public/) and avatar (avatars/)
//   - Proxy text-to-speech to VOICEVOX
//   - Broadcast audio + emotion payloads to the browser via WebSocket
//
// Endpoints:
//   GET  /                 → public/index.html
//   GET  /avatars/:file    → VRM file
//   GET  /health           → { server, voicevox }
//   POST /say              → { text, emotion?, speaker? }  → WS broadcast
//   POST /move             → { action: approach|retreat|step, steps? }  → WS broadcast

import express from "express";
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { synthesize, ping, DEFAULT_SPEAKER } from "./voicevox.js";
import { loadBundle } from "./persona.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PORT = Number(process.env.COMPANION_PORT || process.env.PORT || 5173);

const VALID_EMOTIONS = new Set(["calm", "wry", "pleased", "scolding"]);
const VALID_MOVE_ACTIONS = new Set(["approach", "retreat", "step"]);

// In-memory persona state. Updated by /persona/load.
let currentPersona = {
  name: "default",
  speaker: DEFAULT_SPEAKER,
  avatarUrl: "/avatars/companion.vrm",
};

const app = express();
app.use(express.json({ limit: "32kb" }));
app.use(express.static(resolve(ROOT, "public")));
app.use("/avatars", express.static(resolve(ROOT, "avatars")));

app.get("/health", async (_req, res) => {
  const version = await ping();
  res.json({
    server: "ok",
    voicevox: version ? { version } : null,
    persona: { name: currentPersona.name, speaker: currentPersona.speaker },
  });
});

app.get("/persona", (_req, res) => {
  res.json(currentPersona);
});

app.post("/persona/load", async (req, res) => {
  const { bundlePath } = req.body || {};
  if (typeof bundlePath !== "string" || !bundlePath.trim()) {
    return res.status(400).json({ error: "bundlePath is required" });
  }
  try {
    const info = await loadBundle(bundlePath);
    currentPersona = {
      name: info.name,
      speaker: info.speaker ?? DEFAULT_SPEAKER,
      avatarUrl: info.avatarUrl,
    };
    broadcast({ type: "persona", ...currentPersona });
    res.json({ ok: true, persona: currentPersona });
  } catch (err) {
    console.error("[persona] load failed:", err.message);
    res.status(400).json({ error: String(err.message || err) });
  }
});

// POST /move — broadcast a locomotion trigger to the browser.
//   body: { action: "approach" | "retreat" | "step", steps?: number }
// UX 方針：自動発火はしない。明示トリガのみ（curl / スクリプト）。
app.post("/move", (req, res) => {
  const { action, steps } = req.body || {};
  if (!VALID_MOVE_ACTIONS.has(action)) {
    return res.status(400).json({
      error: `action must be one of: ${[...VALID_MOVE_ACTIONS].join(", ")}`,
    });
  }
  const payload = { type: "move", action };
  if (action === "step" && Number.isFinite(steps)) {
    payload.steps = Math.max(1, Math.min(8, Math.floor(steps)));
  }
  broadcast(payload);
  res.json({ ok: true, ...payload });
});

app.post("/say", async (req, res) => {
  const { text, emotion = "calm", speaker } = req.body || {};
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "text is required" });
  }
  const emo = VALID_EMOTIONS.has(emotion) ? emotion : "calm";
  const spk = Number.isFinite(speaker) ? speaker : currentPersona.speaker;

  try {
    const wav = await synthesize(text, { speaker: spk });
    broadcast({
      type: "say",
      emotion: emo,
      text,
      audio: wav.toString("base64"),
      mime: "audio/wav",
    });
    res.json({ ok: true, bytes: wav.length, emotion: emo, speaker: spk });
  } catch (err) {
    console.error("[say] synthesis failed:", err.message);
    res.status(502).json({ error: String(err.message || err) });
  }
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello", message: "companion online" }));
  ws.send(JSON.stringify({ type: "persona", ...currentPersona }));
});

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

httpServer.listen(PORT, async () => {
  const v = await ping();
  console.log(`[companion-desktop] http://localhost:${PORT}/`);
  console.log(`[companion-desktop] VOICEVOX: ${v ? "v" + v : "NOT REACHABLE (start VOICEVOX first)"}`);
});
