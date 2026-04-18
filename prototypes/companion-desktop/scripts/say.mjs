// POST to /say with UTF-8 safe handling.
// Usage: node scripts/say.mjs "text" [emotion]
//   emotion: calm | wry | pleased | scolding   (default: calm)

const text = process.argv[2];
const emotion = process.argv[3] || "calm";

if (!text) {
  console.error('usage: node scripts/say.mjs "text" [emotion]');
  process.exit(1);
}

const body = JSON.stringify({ text, emotion });
try {
  const res = await fetch("http://localhost:5173/say", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body,
  });
  const out = await res.text();
  console.log(res.status, out);
  process.exit(res.ok ? 0 : 2);
} catch (err) {
  console.error("POST failed:", err.message);
  process.exit(3);
}
