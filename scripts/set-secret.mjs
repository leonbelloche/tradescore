// Saves the Supabase SECRET key into .env.local without showing it on screen.
// Run: node scripts/set-secret.mjs   then paste the key and press Enter.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const ENV_FILE = new URL("../.env.local", import.meta.url);

process.stdout.write("Paste your Supabase secret key (starts with sb_secret_) and press Enter: ");

let key = "";
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  for (const ch of chunk) {
    if (ch === "\u0003") process.exit(1); // Ctrl+C
    if (ch === "\r" || ch === "\n") return save();
    if (ch === "\u0008" || ch === "\u007f") key = key.slice(0, -1); // Backspace
    else key += ch;
  }
});

function save() {
  process.stdin.setRawMode?.(false);
  key = key.trim();
  if (!key.startsWith("sb_secret_")) {
    console.log("\n✕ That does not look like a secret key (it should start with sb_secret_). Nothing saved.");
    process.exit(1);
  }
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8").split(/\r?\n/) : [];
  const kept = lines.filter((l) => !l.startsWith("SUPABASE_SECRET_KEY="));
  while (kept.length && kept[kept.length - 1] === "") kept.pop();
  kept.push("# Secret key: full write access. NEVER commit or share it.", `SUPABASE_SECRET_KEY=${key}`, "");
  writeFileSync(ENV_FILE, kept.join("\n"));
  console.log(`\n✓ Saved (${key.slice(0, 14)}…). You can close this terminal.`);
  process.exit(0);
}
