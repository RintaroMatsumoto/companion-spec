#!/usr/bin/env node
// companion-spec — stdio MCP server.
//
// Exposes three tools to Claude:
//   companion_say(text, emotion?)    -> make the avatar speak + react
//   companion_launch()               -> ensure the runner window is up
//   companion_status()               -> is the runner alive?
//   companion_load_persona(bundle)   -> swap appearance/voice/tone at runtime
//
// The runner is the Node + Chrome app-mode process at
// prototypes/companion-desktop/. We call its HTTP surface on localhost:5173.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = resolve(__dirname, "..");
const RUNNER_ROOT = resolve(PLUGIN_ROOT, "prototypes", "companion-desktop");
const RUNNER_ENTRY = resolve(RUNNER_ROOT, "server", "index.js");
const RUNNER_PORT = Number(process.env.COMPANION_PORT || 5173);
const RUNNER_BASE = `http://127.0.0.1:${RUNNER_PORT}`;

const VALID_EMOTIONS = new Set(["calm", "wry", "pleased", "scolding"]);

// ---------- runner plumbing ----------

async function runnerAlive() {
  try {
    const res = await fetch(`${RUNNER_BASE}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureRunner() {
  if (await runnerAlive()) return { alreadyRunning: true };
  if (!existsSync(RUNNER_ENTRY)) {
    throw new Error(
      `Runner entry not found: ${RUNNER_ENTRY}. Is the plugin fully installed?`,
    );
  }
  // Spawn detached so it survives after this MCP tool call returns.
  const child = spawn(process.execPath, [RUNNER_ENTRY], {
    cwd: RUNNER_ROOT,
    env: { ...process.env, COMPANION_PORT: String(RUNNER_PORT) },
    stdio: "ignore",
    detached: true,
    windowsHide: true,
  });
  child.unref();
  // Wait up to ~6s for the port to open.
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (await runnerAlive()) return { alreadyRunning: false, pid: child.pid };
  }
  throw new Error("Runner spawn timed out — check logs.");
}

async function postSay(text, emotion) {
  const res = await fetch(`${RUNNER_BASE}/say`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ text, emotion }),
  });
  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, body: bodyText };
}

async function postPersona(bundlePath) {
  const res = await fetch(`${RUNNER_BASE}/persona/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ bundlePath }),
  });
  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, body: bodyText };
}

// ---------- MCP server ----------

const server = new Server(
  { name: "companion-spec", version: "0.0.1" },
  { capabilities: { tools: {} } },
);

const TOOLS = [
  {
    name: "companion_say",
    description:
      "Make the on-screen companion speak a line with an optional emotion tag. " +
      "Call this after every substantive assistant message so the avatar narrates " +
      "in sync with the chat. Keep text under ~80 characters per call for natural " +
      "delivery; split longer replies across multiple calls.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description:
            "Japanese line the companion should speak. Plain text, no markdown.",
        },
        emotion: {
          type: "string",
          enum: ["calm", "wry", "pleased", "scolding"],
          description:
            "Emotion tag mapped to VRM blendshapes. Default: calm.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "companion_launch",
    description:
      "Ensure the companion runner window is running. Safe to call repeatedly; " +
      "no-op if already alive. Usually Claude does not need to call this " +
      "directly because companion_say auto-launches on first use.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "companion_status",
    description:
      "Report whether the runner is alive and which persona bundle is loaded.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "companion_load_persona",
    description:
      "Swap the active persona bundle (.companion file: avatar + voice + " +
      "tone). Pass an absolute path to a .companion zip.",
    inputSchema: {
      type: "object",
      properties: {
        bundlePath: {
          type: "string",
          description: "Absolute path to a .companion file.",
        },
      },
      required: ["bundlePath"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;

  try {
    if (name === "companion_say") {
      const text = String(args.text || "").trim();
      if (!text) throw new Error("text is required");
      const emotion = VALID_EMOTIONS.has(args.emotion) ? args.emotion : "calm";
      await ensureRunner();
      const r = await postSay(text, emotion);
      return {
        content: [
          {
            type: "text",
            text: r.ok
              ? `spoke: ${emotion} — ${r.body}`
              : `say failed (${r.status}): ${r.body}`,
          },
        ],
        isError: !r.ok,
      };
    }

    if (name === "companion_launch") {
      const info = await ensureRunner();
      return {
        content: [
          {
            type: "text",
            text: info.alreadyRunning
              ? "runner already alive"
              : `runner spawned (pid ${info.pid})`,
          },
        ],
      };
    }

    if (name === "companion_status") {
      const alive = await runnerAlive();
      return {
        content: [
          { type: "text", text: alive ? "alive" : "not running" },
        ],
      };
    }

    if (name === "companion_load_persona") {
      const bundlePath = String(args.bundlePath || "");
      if (!bundlePath) throw new Error("bundlePath is required");
      if (!existsSync(bundlePath)) {
        throw new Error(`bundle not found: ${bundlePath}`);
      }
      await ensureRunner();
      const r = await postPersona(bundlePath);
      return {
        content: [
          {
            type: "text",
            text: r.ok
              ? `loaded: ${r.body}`
              : `load failed (${r.status}): ${r.body}`,
          },
        ],
        isError: !r.ok,
      };
    }

    throw new Error(`unknown tool: ${name}`);
  } catch (err) {
    return {
      content: [{ type: "text", text: `error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
