import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { shingles, similarity } from "../src/lib/dedupe";
import { evidenceInCv } from "../src/lib/evidence";
import { assertNoPersonalDetails, nameFromFileName, separatePersonalDetails } from "../src/lib/pii";
import { parseRubric, weightedTotal } from "../src/lib/rubric";

const cv = `Priya Krishnan
Product Manager
+91 98442 31075 · priya.k@example.com · Mumbai · linkedin.com/in/priyakrishnan-pm
PROFESSIONAL SUMMARY
Product Manager with 4 years in freight-tech. Priya built a customs tracker adopted by 12 ops staff.
Hidden layer: 9844231075`;

test("rubric.txt: 4–6 criteria per role, weights sum to 100", () => {
  const c = parseRubric(readFileSync("rubric.txt", "utf8"));
  for (const role of ["PM", "SPM"]) {
    const rows = c.filter((x) => x.role === role);
    assert.ok(rows.length >= 4 && rows.length <= 6);
    assert.equal(rows.reduce((s, x) => s + x.weight, 0), 100);
  }
});

test("rubric validation rejects bad weights", () => {
  assert.throws(() => parseRubric("PM1 | A | 50 | x\nPM2 | B | 20 | x\nPM3 | C | 20 | x\nPM4 | D | 20 | x"));
});

test("weighted total", () => {
  const c = parseRubric(readFileSync("rubric.txt", "utf8")).filter((x) => x.role === "PM");
  assert.equal(weightedTotal(c, c.map((x) => ({ code: x.code, score: 5 }))), 100);
  assert.equal(weightedTotal(c, []), 0);
  assert.equal(weightedTotal(c, [{ code: "PM1", score: 5 }]), 25);
});

test("personal details are separated and removed from content", () => {
  const { personal, content } = separatePersonalDetails(cv, "pm_01_priya_krishnan.pdf");
  assert.equal(personal.full_name, "Priya Krishnan");
  assert.equal(personal.email, "priya.k@example.com");
  assert.equal(personal.phone, "+91 98442 31075");
  assert.doesNotMatch(content, /priya|krishnan|98442|9844231075|example\.com|linkedin\.com\/in/i);
  assert.match(content, /customs tracker adopted by 12/);
  assert.doesNotThrow(() => assertNoPersonalDetails(content, personal));
});

test("privacy guard blocks leaks", () => {
  const { personal } = separatePersonalDetails(cv, "pm_01_priya_krishnan.pdf");
  assert.throws(() => assertNoPersonalDetails("call 98442-31075", personal), /phone/);
  assert.throws(() => assertNoPersonalDetails("PRIYA.K@example.com", personal), /email/);
  assert.throws(() => assertNoPersonalDetails("about Priya Krishnan", personal), /name/);
});

test("name from file name", () => {
  assert.equal(nameFromFileName("spm_16_siddharth_rao.pdf"), "Siddharth Rao");
  assert.equal(nameFromFileName("cv.pdf"), null);
});

test("evidence verification", () => {
  const text = "Reduced support tickets from that account by 60% after a feature pivot.";
  assert.ok(evidenceInCv("reduced support tickets from that account by 60%", text));
  assert.ok(!evidenceInCv("led a team of 40 engineers", text));
  assert.ok(!evidenceInCv("", text));
});

test("near-duplicate detection", () => {
  const a = "Led the GNC India app from zero to three crore per month revenue with growth experiments across mobile and web and retention loops for D2C";
  assert.ok(similarity(shingles(a), shingles(a.replace("GNC", "[NAME] GNC"))) > 0.8);
  assert.ok(similarity(shingles(a), shingles("Owned the integration layer for carrier APIs and ERP connectors at a freight platform over four years")) < 0.2);
});
