# avatars/

VRM avatar files live here. They are excluded from git by `.gitignore`
because they are large binary artifacts.

## How to provide an avatar

Place a VRM file at `avatars/companion.vrm`.

Three options, in order of recommendation:

### Option A — Self-made in VRoid Studio (recommended)

1. Install [VRoid Studio](https://vroid.com/en/studio) (free, Windows/Mac).
2. Start from a base you like, customize freely. Suggested defaults
   for a calm, intellectually-styled companion:
   - Hair: dark or muted tone, medium length
   - Eyes: cool palette (blue / violet / grey)
   - Expression palette: calm default, occasional wry smile
   - Outfit: understated, literary (blazer, turtleneck, etc.)
3. Export as VRM 0.x or 1.0 → save to `avatars/companion.vrm`.

### Option B — Use a freely-licensed public VRM

Some VRoid-published models are licensed CC0 / CC-BY. Search
[VRoid Hub](https://hub.vroid.com/) with filter "allow redistribution".
Download the VRM and rename to `companion.vrm`.

### Option C — VRoid sample avatar

VRoid Studio ships with sample avatars (AvatarSample_A, B, …) that have
permissive licenses. Export any sample → `avatars/companion.vrm`.

## Licensing note

Each VRM embeds its own license metadata. Respect it. This prototype
is a Phase 4-0 learning artifact and does not redistribute avatars.
