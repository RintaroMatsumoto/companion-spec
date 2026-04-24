# avatars/

VRM avatar files live here.

リポジトリに同梱されている `companion.vrm` は pixiv Inc. の
**VRoid Studio β Ver AvatarSample_1 / Sendagaya Shibu**（CC0 1.0 Universal）。
VRoid 由来で感情 blendshape（happy/angry/sad/relaxed/neutral）と
humanoid bones 完備。出典・採用理由・blendshape 検証結果は
[`../docs/ASSETS_LICENSE.md`](../docs/ASSETS_LICENSE.md) を参照。

別のモデルに差し替えたい場合は `companion.vrm` を上書きするだけ。
大きなファイル（> 10 MB）を入れるときは `.gitignore` を調整するか
別ホスティングを検討する。

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
