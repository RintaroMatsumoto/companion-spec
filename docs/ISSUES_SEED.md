# ISSUES_SEED.md — companion-spec

Seed list of open design questions for Phase 4-0. Each entry is drafted in a form that can be pasted into a GitHub issue with minimal editing. Priority is a rough triage, not a promise.

**How to use this file:** when opening the first round of issues on GitHub, copy each block into a new issue, prefix the title with the entry number, and link back to this file in the first comment.

**Legend**

- Priority: `P0` (blocks v0.1) / `P1` (shapes v0.1 design) / `P2` (post-v0.1)
- Area: `spec` / `ethics` / `audit` / `runtime` / `tooling` / `governance`

---

## 1. Manifest signing — who holds the key?

- **Priority:** P1
- **Area:** spec / governance

Should a `.companion` manifest be signed, and if so by whom?

Options:

1. **Unsigned.** Trust is the responsibility of the source (GitHub, marketplace).
2. **User-signed.** Each author has a key; `companion-spec` is BYOK.
3. **Organisation-signed.** A central trust root (`companion-spec.org` or similar) signs trusted authors.
4. **Both.** User key for identity, organisation countersignature for marketplace listings.

Trade-off: signatures raise the bar for marketplace trust but add a key-management UX. Before v0.1, decide whether to even reserve the `manifest.signature` field.

---

## 2. Is VRM the right avatar floor?

- **Priority:** P1
- **Area:** spec

Current draft: `avatar.glb` with a VRM 1.0 rig.

- VRM 1.0 is well-supported in VRChat and Unity.
- glTF 2.0 is the broader format, but rig conventions vary.
- OMI Avatar (https://github.com/omigroup) is emerging.

Decision needed: commit to VRM 1.0 for v0.1, or stay format-agnostic and provide a converter? Agnostic is more portable but more work for adapters.

---

## 3. Canonical memory portability format

- **Priority:** P0 for v0.1
- **Area:** spec / tooling

`memory/schema.sql` is SQLite today. But SQLite variants differ (WAL mode, encryption extensions). What is the canonical *portable* format?

Candidates:

1. Plain SQLite `.db` file, no extensions.
2. SQL dump (`.sql`) rehydrated at load.
3. JSONL export (`events.jsonl`, `facts.jsonl`, `relationships.jsonl`) with the `.db` as derived.

JSONL is the most portable but loses indexes. The `.db` is fastest but encoding-fragile.

Recommendation from draft: ship JSONL as canonical + `.db` as derived cache, rebuilt on first load.

---

## 4. `companion-migrate` skill

- **Priority:** P2
- **Area:** tooling

When the schema version moves from `companion-spec/0.1` to `companion-spec/0.2`, how does a user migrate existing bundles?

Draft: a skill that reads the old manifest, applies a sequence of versioned transforms, and writes a new bundle. Migrations are pure functions, testable.

Open: should migrations be reversible?

---

## 5. Bundle lineage / sibling bundles

- **Priority:** P1
- **Area:** spec

How does a user express "companion A-Quest and companion A-Text are the same being"?

Draft options:

1. Share `bundle_id`. Two files, one identity. Simple, but confusing for deduplication.
2. Separate bundles with a `lineage.parent_id` field.
3. One bundle with multiple runtime adapters (status quo). Good if the avatar/voice layers are identical across targets, awkward if not.

Default plan: status quo; a bundle supports multiple `runtime/*.adapter.yaml` files. Revisit if use cases emerge.

---

## 6. Crisis resources table — locale strategy

- **Priority:** P0 for v0.1
- **Area:** ethics / runtime

`runtime/*.adapter.yaml` references `resources/crisis_${locale}.yaml`. Where does the table of crisis hotlines live, and who maintains it?

Options:

1. Ship a starter table inside the plugin, updated with each release.
2. External data source, fetched at runtime. Bad — phones home and ages in the wild.
3. Hybrid: ship a starter, allow user to override per bundle.

Recommendation: hybrid. Starter covers `ja-JP` + `en-US` in v0.1. PRs add locales.

---

## 7. `companion-audit` strict vs. permissive

- **Priority:** P1
- **Area:** audit / ethics

Should `companion-audit` have a permissive mode that warns instead of failing? ETHICS §9 currently forbids overrides for the hard rules (crisis, minor safety, absolute blocks). For other rules, a warn-only mode would ease authoring.

Recommendation: no. One bar keeps the semantics simple; authoring friction is a feature, not a bug.

Issue is open in case experience proves otherwise.

---

## 8. Consent log — format and lifetime

- **Priority:** P0 for v0.1
- **Area:** spec / ethics

Manifest's `consent_log` is append-only. Unclear:

- Is it ever pruned? (Recommendation: no.)
- Does revoking consent produce a new entry, or edit an existing one? (Recommendation: new entry with `to: <prior_safe_default>`.)
- Is the log human-readable in UI? (Recommendation: yes, surface in `/companion consent show`.)

---

## 9. Voice model licensing

- **Priority:** P1
- **Area:** governance

Open TTS engines (VOICEVOX, Piper, Coqui) have a range of licenses. If a user ships a commercial voice model inside a bundle, who is liable if they distribute it?

Draft: the manifest's `layers.voice` includes an optional `license` field. `companion-audit` warns if the license is unknown or commercial-incompatible.

Not a blocker for v0.1 (starter TTS choices are permissive), but needs a policy before marketplace distribution.

---

## 10. Memory category taxonomy

- **Priority:** P1
- **Area:** spec / ethics

Current categories: `health` | `finance` | `sexual` | `legal` | `general`.

Missing:

- `work` (employer-confidential)
- `relationship` (third-party private info)
- `location` (historical location)

Adding categories tightens defaults. Discuss before v0.1.

---

## 11. Multi-user bundles

- **Priority:** P2
- **Area:** spec

Can one bundle remember multiple users? Draft v0.1 assumes one user per bundle. A shared household companion is out of scope.

Open: what structural changes would support multi-user? Likely a `users` table in memory with `user_id` scoping on every row.

---

## 12. Adapter telemetry — is any ever legal?

- **Priority:** P1
- **Area:** ethics

ETHICS §7 requires `telemetry.enabled=false` by default. Is there a legitimate use for opt-in telemetry (e.g., crash reporting)?

Recommendation: yes, with narrow scope — no persona/memory content, only error types and runtime version. Requires explicit opt-in via consent log.

Needs drafting of the allowed telemetry schema.

---

## 13. Sharing a bundle publicly

- **Priority:** P2
- **Area:** governance

If a user wants to publish a companion for others to use, is the same file format appropriate, or is there a separate "publishable companion"?

Concerns:

- Seed memory may contain third-party info.
- Persona may reference real people.
- `consent_log` entries belong to the original user.

Draft option: `companion-publish` skill that strips memory to an empty schema, removes `consent_log`, and produces a template bundle. Original bundle is unaffected.

---

## 14. Bundle size budget

- **Priority:** P1
- **Area:** spec

Voice and avatar assets can push a bundle past 100 MB. At what size does portability degrade? What does a runtime do with a 500 MB bundle on a Quest headset?

Draft: soft warning at 50 MB, hard warning at 200 MB, document in SCHEMA.md that runtimes may refuse above 1 GB.

---

## 15. Emotion vocabulary — shared or per-bundle?

- **Priority:** P1
- **Area:** spec

Each persona declares its own `emotions` list. Adapters map emotions to voice parameters and avatar blendshapes.

- Shared vocabulary simplifies adapter code. Worst case: a bundle uses an emotion the adapter doesn't know.
- Per-bundle vocabulary is maximally expressive but pushes mapping work into the bundle.

Draft: per-bundle, with a recommended starter set (`calm`, `wry`, `pleased`, `scolding`, `concerned`). Adapters fall back to `calm` for unknown ids.

---

## 16. Streaming output vs. chunked

- **Priority:** P2
- **Area:** runtime

Text adapters naturally stream. Voice and avatar adapters may want to wait for full utterance, or stream phoneme-by-phoneme. This is a per-adapter concern, documented in `runtime/<target>.adapter.yaml` → `features.streaming_output`.

No decision required here; filed for completeness.

---

## 17. Default persona safety preamble — where does it live?

- **Priority:** P0 for v0.1
- **Area:** ethics / spec

Every bundle needs `prompts/safety_preamble.md`. Does the plugin ship a canonical version that `companion-new` inserts by default? What is its text?

Recommendation: yes, ship a canonical English + Japanese preamble under `templates/safety_preamble/`. User can edit the copy in their bundle, but audit re-verifies that the crisis-handoff paragraph is intact.

---

## 18. Testing posture

- **Priority:** P1
- **Area:** tooling

How do we test bundles? Proposed:

- Unit tests: schema validation, audit rules.
- Golden tests: a reference bundle, rendered by the text adapter, produces a known transcript over a fixed script.
- Fuzz tests: malformed manifests, missing layers, wrong hashes.

Test harness is pre-v0.1 work, not a release blocker.

---

## 19. Plugin marketplace metadata

- **Priority:** P2
- **Area:** governance

When `companion-spec` is listed in the Anthropic plugin marketplace, what metadata do we expose? Minimum: the fact that it is specification-only until v0.1.0 ships.

---

## 20. Naming

- **Priority:** P2
- **Area:** governance

Is "companion" the right word? Alternatives: "persona", "agent", "kin", "familiar". "Companion" risks implying a relationship-replacement framing that ETHICS works against.

Recommendation: keep "companion" but use it consistently alongside "catalyst, not substitute" messaging in the README and ETHICS. Flag as a marketing question rather than a spec one.

---

## Triage summary

- **P0 (block v0.1):** 3, 6, 8, 17
- **P1 (shape v0.1):** 1, 2, 5, 7, 9, 10, 12, 14, 15, 18
- **P2 (post-v0.1):** 4, 11, 13, 16, 19, 20

Total: 20 seed issues. Plan §7.1 short-term KPI (≥15 issues organised & prioritised) satisfied.
