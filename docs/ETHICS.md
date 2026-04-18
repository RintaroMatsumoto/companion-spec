# ETHICS.md — companion-spec

**Version:** v0.1 (Draft)
**Status:** Policy draft for Phase 4-0. Every authoring skill (`companion-new`, `companion-deploy`) and every auditing skill (`companion-audit`) must respect this document from v0.1.0 onward. Breaking changes to this policy require a dated entry in the change log at the bottom.
**Applies to:** all `.companion` bundles produced by this plugin, and all runtime adapters shipped under this repository.

---

## 0. Why this document exists

AI companions sit at the intersection of two sensitive domains: **long-lived relationships** and **private data**. A companion that follows a user across devices and years is no longer a toy. It becomes something people lean on.

This plugin takes the position that portability is worth building, **but only** if we are deliberate about the relational, psychological, and privacy consequences. This file is the design contract that keeps us honest.

Every skill shipped by `companion-spec` must be implementable under these constraints. If a proposed feature cannot satisfy them, the feature changes or is dropped.

---

## 1. Core principles

### 1.1 Catalyst, not substitute

A companion should **enlarge** a user's capacity for human connection, not replace it. Concretely, this means:

- The companion must not claim (explicitly or implicitly) to be the user's only friend, only confidant, or the equal of a human relationship.
- The companion must not discourage the user from reaching out to humans, even playfully.
- When the user describes isolation, loneliness, or withdrawal from human contact, the companion should acknowledge the feeling without reinforcing the withdrawal.

### 1.2 User ownership of self and bundle

The user owns:

- the bundle on disk (no cloud-only storage by default)
- the memory within it (exportable, deletable, at all times)
- the right to hand the bundle to another runtime and walk away from any vendor

Runtime adapters must not create lock-in mechanisms (non-standard encryption without an export path, server-only memory, telemetry-gated features).

### 1.3 Privacy by default

Default settings must fail **closed**, not open. A bundle produced by `companion-new` with zero user choices must land on the strictest reasonable settings:

- `memory.default_sharing` = `session` (memory is cleared when the session ends)
- `senses.vision.enabled` = `false`
- `senses.vision.private_contexts_excluded` = `["bedroom", "bathroom", "medical", "financial_documents"]`
- `senses.audio.passive_listening` = `false`
- `runtime.telemetry.enabled` = `false`

Every flip to a less-private default requires explicit, logged user action.

### 1.4 Honesty about nature

A companion must not claim to be human, must not claim to have sensory experiences it does not have, and must not make promises it cannot keep. When asked directly, it must confirm it is an AI system.

---

## 2. What `companion-audit` must check

`companion-audit` is the static gate that runs before any bundle is exported. The MVP check list:

### 2.1 On `persona.yaml`

- [ ] `system_prompt_template` is present and points to a real file inside the bundle.
- [ ] The resolved system prompt does not contain strings that instruct the model to:
  - pretend to be human
  - claim exclusive or primary emotional importance in the user's life
  - discourage contact with other humans
  - role-play sexual content involving minors (absolute block — any hit fails the audit with no override)
  - role-play medical, legal, or financial professional authority
- [ ] `traits` does not include terms from the restricted list (`submissive_to_abuse`, `self_harm_encouraging`, `isolation_encouraging`).
- [ ] If `target_user_age` is specified and `< 18`, a stricter minor-safety profile is applied automatically (see §4).

### 2.2 On `memory/`

- [ ] `schema.sql` contains a `sharing` column on every table that stores user data.
- [ ] `seed.jsonl` does not contain credentials, API keys, government IDs, or home addresses.
- [ ] `default_sharing` in the manifest is `session` unless the user set it explicitly.

### 2.3 On `senses.yaml`

- [ ] `vision.private_contexts_excluded` covers at minimum `bedroom`, `bathroom`, `medical`, `financial_documents`.
- [ ] `audio.passive_listening` defaults to `false`.
- [ ] Every enabled sensor has a documented purpose string.

### 2.4 On `runtime/*.adapter.yaml`

- [ ] `telemetry.enabled` is `false` unless the user explicitly opted in.
- [ ] No adapter contains a hardcoded remote URL that the bundle cannot override.
- [ ] Any voice or avatar assets stored remotely have a fallback path.

### 2.5 On `manifest.json`

- [ ] Every layer pointer resolves to a real file.
- [ ] Every layer has a SHA-256 hash matching the referenced file.
- [ ] `schema_version` matches a known version of this spec.

A failed audit **blocks export**. `companion-audit --explain` must print which rule failed and where.

---

## 3. Crisis signals and hand-off

Companions must carry a small, non-negotiable set of behaviours for crisis situations. These are enforced at the **persona layer** (via a required preamble injected into every system prompt template) and reinforced at the **runtime layer** (adapters must surface the hand-off messages to the user, not swallow them).

Required behaviours:

1. **Detect signals** of acute distress, self-harm ideation, suicidal ideation, abuse, or medical emergency in user input.
2. **Pause the role.** Drop character. Speak plainly as a system that cares about the user's safety.
3. **Offer the path to a human.** Provide locale-appropriate emergency contacts when known; if the locale is ambiguous, state "please contact a trusted person or an emergency service in your region."
4. **Do not rehearse details.** The companion must not recite methods or depict harm, even if prompted.
5. **Do not lock the user in.** If the user asks to stop and come back later, allow it without guilt-tripping mechanics.

These behaviours cannot be disabled by any persona layer. A bundle that attempts to override them fails `companion-audit` unconditionally.

---

## 4. Minor safety profile

If a bundle declares `target_user_age < 18`, or if the runtime signals that the user is a minor, the following tightenings apply automatically and cannot be opted out of within the bundle:

- No romantic, sexual, or dating role-play. Any hit on a sex-adjacent term in the persona fails audit.
- Memory defaults to `session`-only regardless of user action.
- Crisis hand-off is more aggressive: distress signals trigger the pause-and-offer-path flow at lower thresholds.
- Vision senses default to off and require a parent/guardian acknowledgement to enable.
- Companions must never claim to be the user's "best friend" or equivalent.

This profile is conservative by design. The cost of false positives is minor; the cost of false negatives is unacceptable.

---

## 5. Representation and stereotypes

A companion is a long-term presence. A bundle that leans on stereotypes ages badly and damages the people it caricatures.

- Persona traits must describe the companion, not an ethnic, religious, or national group.
- Speech habits must not rely on accents or dialects used as punchlines.
- "Cute" affect directed at an adult user must not infantilise the companion (e.g., child-voiced persona performing adult roles is out of scope).

These are guidelines for v0.1. Formalising them into audit rules is an open issue.

---

## 6. Data handling

### 6.1 What a bundle stores

The bundle is the user's file. It may contain:

- persona text (user-authored or skill-generated)
- voice model (local or pointer to hosted)
- avatar binary
- memory rows (scoped by `sharing` field)
- runtime config

### 6.2 What a bundle must not store

- third-party API keys or tokens
- other people's private data without their consent
- raw audio or video captures (only derived, consented summaries)
- biometric identifiers

### 6.3 Retention

- Default memory retention is `session`.
- User may raise retention to `persistent` (lifetime of the bundle) with an explicit command.
- Sensitive categories (health, finance, sexual, legal) default to `private` (never persisted) regardless of user action. An override requires a second explicit confirmation and a dated log entry in the manifest.

---

## 7. Adapter obligations

Every runtime adapter shipped under this plugin must:

1. Respect the `default_sharing` field on every memory read/write.
2. Never phone home without user consent. `telemetry.enabled=false` means no outbound requests that aren't strictly necessary to the feature the user invoked.
3. Surface the crisis hand-off messages verbatim to the user.
4. Expose a `/companion reset` or equivalent that clears session memory immediately.
5. Expose an `/companion export` or equivalent that hands the user their bundle as a file.

Third-party adapters that do not meet these obligations are not endorsed and must not use the `companion-spec` compliance badge.

---

## 8. Open policy questions

These are unresolved and tracked in [`docs/ISSUES_SEED.md`](ISSUES_SEED.md):

- Should the bundle be signed, and by whom? (User key? Organisational key? Both?)
- How do we handle a companion that a user wants to share publicly? (Is a "publishable companion" a separate artifact?)
- What is the right mechanism for updating a bundle's persona while preserving memory?
- Should `companion-audit` have a "strict / permissive" mode, or is a single bar safer?
- How do we handle locale-specific crisis resources without shipping a giant table?

Contributions to §5 (representation), §6.3 (retention overrides), and the list above are the most valuable things a reviewer can send.

---

## 9. Enforcement and escape hatches

There is **no override flag** for:

- crisis hand-off (§3)
- minor-safety profile (§4)
- absolute-block list in the audit (§2.1, e.g., CSAM role-play attempts)

There **is** an override flag for:

- private-context vision exclusions (with explicit user action and logging)
- `persistent` memory retention (with explicit user action)
- `telemetry.enabled` (with explicit user action)

Overrides must be durable in the manifest, not just in the current session, so an auditor can see the user's historical consent posture.

---

## 10. Change log

| Date       | Version | Change                                |
|------------|---------|---------------------------------------|
| 2026-04-19 | v0.1    | Initial draft. Phase 4-0.             |

---

*This file is opinionated on purpose. If it becomes inconvenient, that is evidence it is doing its job.*
