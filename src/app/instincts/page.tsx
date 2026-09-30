import { connection } from "next/server";
import { Card, Eyebrow, SetupNotice } from "@/components/ui";
import { getCriteria, getRubricDocument, listCandidates } from "@/lib/db";
import { PAST_HIRES } from "@/lib/hires";
import { ROLE_LABEL, ROLES, type Criterion } from "@/lib/types";

/** Shows the founder-instinct model: where every criterion comes from. */
export default async function Instincts() {
  await connection();
  let criteria: Criterion[];
  let doc: string | null;
  let matches: Record<string, number> = {};
  try {
    [criteria, doc] = await Promise.all([getCriteria(), getRubricDocument()]);
    for (const c of await listCandidates()) if (c.closest_hire) matches[c.closest_hire] = (matches[c.closest_hire] ?? 0) + 1;
  } catch (e) {
    return <SetupNotice message={(e as Error).message} />;
  }
  const section = (title: string) => {
    const m = doc?.split(/\n(?=STEP \d|ANTI-SIGNAL)/).find((s) => s.startsWith(title));
    return m?.split("\n").slice(title.startsWith("STEP") ? 2 : 0).join("\n").trim();
  };

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Founder model</Eyebrow>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">What Arjun&apos;s past hires say he values</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          The rubric comes from patterns in the 8 past hires, not from the job descriptions. Each criterion links back to the hires behind it.
          This is the same rubric text stored in the database and used for every score.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Eyebrow>Past hires</Eyebrow>
          <ul className="mt-2 space-y-2 text-sm">
            {PAST_HIRES.map((h) => (
              <li key={h.key}>
                <p className="font-medium">{h.label} <span className="font-mono text-xs text-muted">· closest match for {matches[h.key] ?? 0} applicants</span></p>
                <p className="text-muted">{h.profile}</p>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <Eyebrow>Patterns the JDs don&apos;t ask for</Eyebrow>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed">{[section("STEP 2"), section("ANTI-SIGNAL")].filter(Boolean).join("\n\n") || "Seed the rubric to see this."}</pre>
        </Card>
      </div>

      {ROLES.map((role) => (
        <Card key={role}>
          <Eyebrow>{ROLE_LABEL[role]} rubric · weights add to {criteria.filter((c) => c.role === role).reduce((s, c) => s + c.weight, 0)}%</Eyebrow>
          <div className="mt-3 space-y-3">
            {criteria.filter((c) => c.role === role).map((c) => (
              <div key={c.code} className="grid grid-cols-[56px_1fr] gap-3">
                <div className="pt-0.5">
                  <div className="h-2 rounded-full bg-cargo" style={{ width: `${c.weight * 2}px` }} />
                  <p className="font-mono text-xs text-muted">{c.weight}%</p>
                </div>
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-muted">{c.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
