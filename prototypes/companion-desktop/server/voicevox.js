// VOICEVOX HTTP client.
//
// VOICEVOX exposes a local REST API on http://127.0.0.1:50021.
// Pipeline:  /audio_query  → /synthesis  → WAV buffer.
//
// Speaker IDs for 春日部つむぎ (Kasukabe Tsumugi):
//   8  = ノーマル (default, used here)
//   76 = あまあま
//   77 = ツンツン
//   78 = セクシー
//   79 = ささやき

const VOICEVOX_BASE = process.env.VOICEVOX_URL || "http://127.0.0.1:50021";
export const DEFAULT_SPEAKER = 8; // 春日部つむぎ ノーマル

export async function synthesize(text, { speaker = DEFAULT_SPEAKER } = {}) {
  // 1. audio_query
  const queryUrl = new URL("/audio_query", VOICEVOX_BASE);
  queryUrl.searchParams.set("text", text);
  queryUrl.searchParams.set("speaker", String(speaker));

  const queryRes = await fetch(queryUrl, { method: "POST" });
  if (!queryRes.ok) {
    throw new Error(`VOICEVOX audio_query failed: ${queryRes.status} ${queryRes.statusText}`);
  }
  const query = await queryRes.json();

  // 2. synthesis
  const synthUrl = new URL("/synthesis", VOICEVOX_BASE);
  synthUrl.searchParams.set("speaker", String(speaker));

  const synthRes = await fetch(synthUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/wav" },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) {
    throw new Error(`VOICEVOX synthesis failed: ${synthRes.status} ${synthRes.statusText}`);
  }

  const wav = Buffer.from(await synthRes.arrayBuffer());
  return wav;
}

export async function ping() {
  try {
    const res = await fetch(new URL("/version", VOICEVOX_BASE));
    if (!res.ok) return null;
    return (await res.text()).trim();
  } catch {
    return null;
  }
}
