import "./load-env";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseRubric } from "../src/lib/rubric";

const text = readFileSync("rubric.txt", "utf8");
const criteria = parseRubric(text); // throws unless each role has 4–6 criteria summing to 100
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");

const db = createClient(url, key, { auth: { persistSession: false } });
const up = await db.from("rubric_criteria").upsert(criteria, { onConflict: "code" });
if (up.error) throw new Error(up.error.message);
const stale = await db.from("rubric_criteria").delete().not("code", "in", `(${criteria.map((c) => c.code).join(",")})`);
if (stale.error && !/foreign key/i.test(stale.error.message)) throw new Error(stale.error.message);
const doc = await db.from("rubric_document").upsert({ id: 1, body: text, updated_at: new Date().toISOString() });
if (doc.error) throw new Error(doc.error.message);

for (const role of ["PM", "SPM"]) {
  const rows = criteria.filter((c) => c.role === role);
  console.log(`${role}: ${rows.length} criteria, ${rows.reduce((s, c) => s + c.weight, 0)}% → ${rows.map((c) => `${c.code} ${c.weight}`).join(", ")}`);
}
console.log("Rubric seeded.");
