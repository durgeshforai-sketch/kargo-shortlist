import "./load-env";
import { authHeaders } from "./auth";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

/**
 * Uploads a folder of CVs through the real API, exactly as the founder would from /upload.
 * Usage: BASE_URL=https://… npx tsx scripts/bulk-upload.mts <folder> [roles.json]
 * roles.json maps file name → "PM" | "SPM"; files named pm_/spm_ are detected automatically.
 */
const [folder, rolesFile] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3000";
const roles: Record<string, "PM" | "SPM"> = rolesFile ? JSON.parse(readFileSync(rolesFile, "utf8")) : {};
const auth = await authHeaders(base);

const files = readdirSync(folder).filter((f) => /\.(pdf|docx|txt)$/i.test(f)).sort();
const roleOf = (f: string) => roles[f] ?? (/^spm_/i.test(f) ? "SPM" : /^pm_/i.test(f) ? "PM" : null);
const missing = files.filter((f) => !roleOf(f));
if (missing.length) throw new Error(`No role for: ${missing.join(", ")}`);

let ok = 0;
const queue = [...files];
async function worker() {
  for (let f = queue.shift(); f; f = queue.shift()) {
    const fd = new FormData();
    fd.append("file", new Blob([readFileSync(join(folder, f))]), basename(f));
    fd.append("role", roleOf(f)!);
    const res = await fetch(`${base}/api/candidates`, { method: "POST", body: fd, headers: auth });
    const json = await res.json().catch(() => ({}));
    const good = res.ok && json.status === "scored";
    if (good) ok++;
    console.log(`${good ? "✓" : "✕"} ${f.padEnd(30)} ${roleOf(f)!.padEnd(4)} ${good ? `PM ${json.pm_score}  SPM ${json.spm_score}${json.duplicate_of ? "  DUPLICATE" : ""}` : json.error ?? res.status}`);
  }
}
await Promise.all([worker(), worker(), worker()]);
console.log(`\n${ok}/${files.length} scored. Writing briefs and drafts…`);
for (let i = 0; i < 60; i++) {
  const res = await fetch(`${base}/api/drafts`, { method: "POST", headers: auth });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  console.log(`  drafts: +${json.done}, ${json.remaining} left`);
  if (json.remaining === 0 || json.done === 0) break;
}
