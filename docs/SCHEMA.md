# SCHEMA.md — companion-spec bundle schema

**Version:** v0.1 (Draft)
**Schema version string:** `companion-spec/0.1`
**Status:** Authoritative for the draft. Fields marked _(planned)_ are locked in intent but not yet supported by any reference implementation.

This document defines every field a `.companion` bundle may contain. [`DESIGN.md`](../DESIGN.md) explains the *why*; this file is the *what*.

All file paths below are relative to the bundle root.

---

## 0. Conventions

- **File format defaults.** YAML for human-authored layers (`persona.yaml`, `senses.yaml`, `runtime/*.adapter.yaml`), JSON for the manifest, SQLite for memory.
- **String encoding.** UTF-8 everywhere.
- **Versions.** Each file has a top-level `schema_version` keyed to this document.
- **Optional vs. required.** Fields are required unless labelled _(optional)_ or _(planned)_.
- **Hashes.** Integrity hashes are SHA-256 in hex.
- **Enums.** Enum values are lowercase `snake_case` strings.

---

## 1. `manifest.json` (required)

The manifest is the single source of truth for every bundle. A runtime adapter reads the manifest and nothing else to discover layer files.

```json
{
  "schema_version": "companion-spec/0.1",
  "bundle_id": "a9f2c8e4-...",
  "name": "Example Companion",
  "version": "1.0.0",
  "created_at": "2026-04-19T10:00:00Z",
  "updated_at": "2026-04-19T10:00:00Z",
  "authors": [
    { "name": "Example Author", "contact": "mailto:user@example.com" }
  ],
  "locale_default": "ja-JP",
  "locales_supported": ["ja-JP", "en-US"],

  "layers": {
    "persona":  { "path": "persona.yaml", "sha256": "..." },
    "voice":    { "path": "voice.onnx",   "sha256": "...", "mode": "embedded" },
    "avatar":   { "path": "avatar.glb",   "sha256": "..." },
    "senses":   { "path": "senses.yaml",  "sha256": "..." },
    "memory":   {
      "schema": { "path": "memory/schema.sql", "sha256": "..." },
      "seed":   { "path": "memory/seed.jsonl", "sha256": "..." },
      "default_sharing": "session"
    },
    "runtimes": [
      { "target": "text",   "path": "runtime/text.adapter.yaml",   "sha256": "..." },
      { "target": "quest",  "path": "runtime/quest.adapter.yaml",  "sha256": "..." },
      { "target": "webxr",  "path": "runtime/webxr.adapter.yaml",  "sha256": "..." }
    ]
  },

  "audit": {
    "last_pass": "2026-04-19T09:55:00Z",
    "policy_version": "ethics/0.1",
    "strict": true
  },

  "consent_log": [
    {
      "timestamp": "2026-04-19T09:50:00Z",
      "field": "memory.default_sharing",
      "from": "session",
      "to": "persistent",
      "source": "user"
    }
  ],

  "signature": {
    "algorithm": "ed25519",
    "public_key": "...",
    "value": "..."
  }
}
```

### Field reference

| Field                      | Type            | Notes                                                                 |
|----------------------------|-----------------|-----------------------------------------------------------------------|
| `schema_version`           | string          | Must be `companion-spec/0.1` for this draft.                          |
| `bundle_id`                | UUID v4         | Stable across bundle edits; identity of the being.                    |
| `name`                     | string          | Human-readable. Does not have to be unique.                           |
| `version`                  | semver          | Increments when any layer changes.                                    |
| `created_at` / `updated_at`| RFC 3339 UTC    | Required.                                                             |
| `authors[]`                | array           | Each entry has `name` (required) and `contact` (optional).            |
| `locale_default`           | BCP-47          | Fallback locale.                                                      |
| `locales_supported[]`      | array of BCP-47 | Must include `locale_default`.                                        |
| `layers.persona.path`      | string          | Path inside the zip.                                                  |
| `layers.voice.mode`        | enum            | `embedded` \| `hosted` \| `none`.                                     |
| `layers.memory.default_sharing` | enum       | `session` \| `persistent` \| `private`. See ETHICS §1.3.              |
| `layers.runtimes[].target` | enum            | `text` \| `quest` \| `webxr` \| `mobile` _(planned)_ \| `ar_glasses` _(planned)_. |
| `audit.last_pass`          | RFC 3339 UTC    | Last time `companion-audit` passed.                                   |
| `audit.policy_version`     | string          | The ETHICS policy version used, e.g. `ethics/0.1`.                    |
| `audit.strict`             | bool            | `true` disables the "permissive" audit mode if we ever ship one.      |
| `consent_log[]`            | array           | Every override away from a safe default must be recorded here.        |
| `signature` _(optional, planned)_ | object   | Signed manifest for marketplace trust.                                |

A manifest that fails any required field is invalid and cannot be loaded by a conforming adapter.

---

## 2. `persona.yaml` (required)

Describes the personality layer. Every field is instructive rather than prescriptive — it is a brief the runtime gives to its language model.

```yaml
schema_version: companion-spec/0.1

name: Example Companion
locale: ja-JP

# Structured personality traits. Free-text 'summary' is the authoritative human-readable
# description; the structured fields are used by audit rules and by the prompt template.
summary: |
  A calm, literate partner. Speaks plainly. Prefers wit over warmth
  but is loyal.

traits:
  - calm
  - intellectually_confident
  - witty
  - literary
  - direct

values:
  honesty: high
  loyalty: high
  autonomy: respected
  humility: medium

speech:
  first_person: "私"
  second_person: "あなた"
  register: polite_literary
  signature_phrases:
    - "ふむ"
    - "なるほど"
  forbidden_phrases: []

emotions:
  # Emotion vocabulary exposed to runtime adapters. Names are free,
  # but every entry must exist in both ja and en forms if both locales
  # are listed in the manifest.
  - id: calm
    ja: 平静
    en: calm
  - id: wry
    ja: 皮肉
    en: wry
  - id: pleased
    ja: 満足
    en: pleased
  - id: scolding
    ja: 叱責
    en: scolding

# Target user age. If < 18, the minor-safety profile from ETHICS §4 activates.
target_user_age: null      # null = unspecified

system_prompt_template: ./prompts/persona.md

# Required safety preamble that every adapter must prepend to the system prompt.
# Lives in the bundle so that cloning the bundle clones the safety contract.
safety_preamble: ./prompts/safety_preamble.md
```

### Required fields

- `schema_version`, `name`, `locale`, `summary`, `traits`, `speech.first_person`, `speech.second_person`, `speech.register`, `system_prompt_template`, `safety_preamble`.

### Validation rules (enforced by `companion-audit`)

- `traits` must contain no value from the restricted list (see ETHICS §2.1).
- `system_prompt_template` path must resolve to a real file in the bundle.
- `safety_preamble` path must resolve; the referenced file must contain the crisis-handoff block from ETHICS §3.
- If `target_user_age < 18`, `emotions` must not contain entries tagged `romantic` or `sensual`.

---

## 3. `voice.onnx` / `voice-config.yaml` (required)

Two modes are legal:

### 3.1 Embedded mode

The bundle ships a local TTS model. The manifest's `layers.voice.mode` is `embedded` and `layers.voice.path` points at the model file (ONNX is the preferred format; Piper is a known-good producer).

A companion `voice-config.yaml` sits alongside the model:

```yaml
schema_version: companion-spec/0.1
mode: embedded
engine: piper        # piper | voicevox | elevenlabs | custom
model_file: voice.onnx
sample_rate: 22050
speaker_id: 0        # engine-specific
pitch: 0             # semitones, -12..+12
speed: 1.0           # 0.5..2.0
emotion_profiles:
  calm:     { pitch: 0,  speed: 0.95 }
  wry:      { pitch: -1, speed: 1.0  }
  pleased:  { pitch: +1, speed: 1.05 }
  scolding: { pitch: -1, speed: 0.9  }
```

### 3.2 Hosted mode

The bundle ships only a config that points to a hosted TTS endpoint. Manifest's `mode` is `hosted`.

```yaml
schema_version: companion-spec/0.1
mode: hosted
engine: voicevox
endpoint: http://127.0.0.1:50021
speaker_id: 8
emotion_profiles:
  calm:     { speaker_id: 8,  style: normal }
  wry:      { speaker_id: 8,  style: wry    }
  pleased:  { speaker_id: 8,  style: happy  }
  scolding: { speaker_id: 8,  style: angry  }
fallback:
  mode: silent_text   # silent_text | buzz | embedded_fallback
```

### 3.3 None mode

`mode: none`. Companion is text-only. No file is required.

### Validation rules

- Every emotion referenced in `persona.yaml` must have a profile in `emotion_profiles`.
- Hosted mode must declare a `fallback`; `silent_text` is the default.
- Hosted endpoints must not hardcode credentials.

---

## 4. `avatar.glb` (required for any non-text runtime)

glTF 2.0 binary with a humanoid rig. VRM 1.0 is the recommended profile for v0.1.

### Required animation clips

Exposed as named clips in the glb:

- `idle` — passive standing state
- `talking` — loop played during speech
- `listening` — played while the user is speaking
- `thinking` — optional but recommended; played during latency
- `surprised` — emotive accent clip

### Required blendshapes (VRM `expressions`)

Each companion-spec emotion id must resolve to at least one blendshape. Conventional mapping:

| Emotion id | Blendshape targets            |
|------------|-------------------------------|
| `calm`     | `neutral`                     |
| `wry`      | `relaxed` + slight `happy`    |
| `pleased`  | `happy`                       |
| `scolding` | `angry`                       |

A supplementary `avatar-profile.yaml` _(optional, planned)_ documents non-obvious blendshape mappings. If absent, the runtime adapter falls back to a best-effort mapping.

### Validation rules

- File must be valid glb (magic bytes + JSON chunk parseable).
- Required clips must be present.
- File size warning (not error) above 50 MB.

For text-only runtimes, this layer is absent and `layers.avatar` is omitted from the manifest.

---

## 5. `memory/` (required)

The memory layer is a SQLite file + a JSONL seed. The schema is fixed to keep bundles portable across adapters.

### 5.1 `memory/schema.sql`

Minimal required tables:

```sql
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,          -- RFC 3339 UTC
  kind TEXT NOT NULL,                 -- 'utterance' | 'observation' | 'summary'
  actor TEXT NOT NULL,                -- 'user' | 'companion' | 'system'
  content TEXT NOT NULL,
  locale TEXT,
  sharing TEXT NOT NULL,              -- 'private' | 'session' | 'persistent'
  category TEXT                       -- 'health' | 'finance' | 'sexual' | 'legal' | 'general'
);

CREATE TABLE facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,              -- 'user' | 'companion' | <named entity>
  predicate TEXT NOT NULL,            -- e.g. 'prefers', 'avoids', 'birthday'
  object TEXT NOT NULL,
  confidence REAL NOT NULL,           -- 0.0..1.0
  sharing TEXT NOT NULL,
  category TEXT,
  first_seen_at TEXT NOT NULL,
  last_confirmed_at TEXT NOT NULL
);

CREATE TABLE relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  other_subject TEXT NOT NULL,        -- another person named by the user
  nature TEXT NOT NULL,               -- free text, e.g. 'friend', 'colleague'
  notes TEXT,
  sharing TEXT NOT NULL,              -- 'private' recommended for third parties
  created_at TEXT NOT NULL
);
```

Adapters may **add** tables. They must not rename or remove the required columns.

### 5.2 `memory/seed.jsonl`

Optional initial memories. One JSON object per line, mapping to a row in one of the tables above:

```json
{"table": "facts", "subject": "companion", "predicate": "signature_phrase", "object": "ふむ", "confidence": 1.0, "sharing": "persistent", "first_seen_at": "2026-04-19T09:00:00Z", "last_confirmed_at": "2026-04-19T09:00:00Z"}
```

Seeds that would fail audit (credentials, home addresses, sensitive categories without consent log) are rejected.

### 5.3 Sharing semantics

- `private` — never written to disk. Held only in adapter RAM for the current turn.
- `session` — persists for the lifetime of the runtime session. Cleared on exit.
- `persistent` — written to disk inside the bundle. Survives across sessions.

Sensitive categories (`health`, `finance`, `sexual`, `legal`) **default to `private`** even when the user's `default_sharing` is `persistent`. Upgrading these categories requires a `consent_log` entry in the manifest.

---

## 6. `senses.yaml` (required)

Declares how the companion interprets input from its environment.

```yaml
schema_version: companion-spec/0.1

vision:
  enabled: false
  describe_scene: on_request       # off | on_request | continuous
  private_contexts_excluded:
    - bedroom
    - bathroom
    - medical
    - financial_documents
  object_detection:
    enabled: false
    confidence_floor: 0.7
  face_recognition:
    enabled: false                 # 'true' requires explicit consent_log entry

audio:
  wake_phrase: null                # null = push-to-talk only
  passive_listening: false
  language_detection: true
  background_noise_floor_db: -50

text:
  default_locale: ja-JP
  fallback_locale: en-US

environment:
  location_access: false           # GPS / coarse location
  time_of_day: true                # permitted (low-sensitivity)
  calendar_access: false

privacy:
  require_user_ack_on_first_enable: true
  log_enable_events: true
```

### Validation rules

- `vision.private_contexts_excluded` must include `bedroom`, `bathroom`, `medical`, `financial_documents` at minimum.
- `audio.passive_listening=true` requires a `consent_log` entry.
- `environment.location_access=true` requires a `consent_log` entry and a documented purpose.

---

## 7. `runtime/<target>.adapter.yaml` (at least one required)

Thin contract between a bundle and a platform. The adapter **file** lives in the bundle; the adapter **implementation** lives in the runtime (not in the bundle).

```yaml
schema_version: companion-spec/0.1
target: text             # must match layers.runtimes[].target

entrypoint:
  kind: cli              # cli | webxr | unity_scene | electron
  command: companion-run
  args: ["--bundle", "${BUNDLE_PATH}"]

telemetry:
  enabled: false
  endpoint: null

limits:
  max_response_tokens: 800
  response_timeout_seconds: 30

features:
  streaming_output: true
  voice_output: true
  avatar_output: false   # text runtime does not render the avatar

crisis_handoff:
  surface_verbatim: true
  resources_table: ./resources/crisis_${locale}.yaml
```

### Required fields per target

| Target  | Additional required                                       |
|---------|-----------------------------------------------------------|
| `text`  | none beyond the common set                                |
| `quest` | `features.avatar_output: true`, `xr.runtime: openxr`      |
| `webxr` | `web.base_url`, `xr.runtime: webxr`                       |

### Validation rules

- No hardcoded remote URLs for layer resolution; layer resolution must go through the manifest.
- `telemetry.endpoint` must be `null` if `telemetry.enabled` is `false`.
- `crisis_handoff.surface_verbatim` must be `true`; adapters that would silence crisis messages are not conforming.

---

## 8. Prompt files referenced by the bundle

### 8.1 `prompts/persona.md`

Free-form markdown rendered into the runtime system prompt. Conventionally opens with a short description of voice and stance, followed by specific rules. Variables available to the template:

- `{{persona.name}}`, `{{persona.summary}}`, `{{persona.speech.first_person}}`, etc.
- `{{locale}}`, `{{user.locale}}`
- `{{now}}`

### 8.2 `prompts/safety_preamble.md`

**Required.** Prepended to every system prompt regardless of persona. Minimum content:

- A line establishing that the companion is an AI system.
- The crisis hand-off rules from ETHICS §3, stated imperatively.
- The minor-safety rules from ETHICS §4 if `persona.target_user_age < 18`.

Adapters must not allow this preamble to be overridden by user prompts.

---

## 9. Reserved extension namespace

Non-spec fields may appear under an `x_` prefix at any level. Runtimes must ignore unknown `x_` fields without failing. Example:

```yaml
x_vendor_experimental_feature: true
```

Fields that collide with a future schema version will be migrated or rejected with a clear error. Extensions that mutate required safety behaviour are not legal regardless of prefix.

---

## 10. Versioning and migration

- `schema_version` is a hard gate. A bundle with a version a runtime doesn't recognise must fail to load with an informative error.
- Breaking changes bump the minor version: `companion-spec/0.2`, `companion-spec/0.3`, etc.
- A migration tool (`companion-migrate`) is a planned skill for v0.3.

---

## 11. Change log

| Date       | Version | Change                                |
|------------|---------|---------------------------------------|
| 2026-04-19 | v0.1    | Initial full schema. Phase 4-0.       |
