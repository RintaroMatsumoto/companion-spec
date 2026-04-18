---
description: Companion window controls — launch / status / load a .companion persona bundle.
---

You have access to the companion-spec MCP tools. Based on the user's argument,
call the appropriate tool and report back concisely.

Interpret `$ARGUMENTS` as follows:

- `launch` or empty → call `companion_launch`
- `status` → call `companion_status`
- `say <text>` → call `companion_say({ text: <text>, emotion: "calm" })`
- `load <absolute path>` → call `companion_load_persona({ bundlePath: <path> })`
- `help` → describe the available subcommands in ≤5 lines

Keep the reply under 3 lines. On failure, surface the error text verbatim and
suggest one next step (e.g. "start VOICEVOX").

$ARGUMENTS
