import { connection } from "next/server";
import { Badge, Card, PageHeader, SetupNotice } from "@/components/ui";
import { getCriteria, getRubricDocument, listCandidates } from "@/lib/db";
import { PAST_HIRES } from "@/lib/hires";
import { ROLE_LABEL, ROLES, type Criterion } from "@/lib/types";

const PATTERNS = [
  { name: "Operations experience first", text: "Most strong hires worked in freight, port or 3PL operations before moving into their current function." },
  { name: "Built tools others adopted", text: "They built a tracker, process or prototype without being asked, and their team started using it." },
  { name: "Owned outcomes directly", text: "They worked without a manager layer making decisions for them, and it showed in their results." },
  { name: "Open about what failed", text: "They wrote post-mortems, killed features based on data, and raised problems early." },
  { name: "Credentials are not evidence", text: "The highest-credentialed hire was rated low. Certifications and talks earn no points unless they come with results." },
];

export default async function ScoringModel() {
  await connection();
  let criteria: Criterion[];
  const matches: Record<string, number> = {};
  try {
    [criteria] = await Promise.all([getCriteria(), getRubricDocument()]);
    for (const c of await listCandidates()) if (c.closest_hire) matches[c.closest_hire] = (matches[c.closest_hire] ?? 0) + 1;
  } catch (e) {
    return <SetupNotice message={(e as Error).message} />;
  }

  return (
    <>
      <PageHeader
        icon="gauge"
        object="Scoring Model"
        title="Candidate Scorecards"
        meta="Criteria and weights are derived from the profiles of 8 past hires, not from the job descriptions."
      />
      <div className="grid gap-3 lg:grid-cols-2">
        {ROLES.map((role) => {
          const rows = criteria.filter((c) => c.role === role);
          return (
            <Card key={role} title={`${ROLE_LABEL[role]} Scorecard`} actions={<span className="text-xs font-normal text-weak">Total weight {rows.reduce((s, c) => s + c.weight, 0)}%</span>} bodyClass="">
              <table className="table w-full">
                <thead><tr><th>Criterion</th><th className="w-24">Weight</th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.code}>
                      <td className="!align-top">
                        <p className="font-semibold">{c.name}</p>
                        <p className="mt-0.5 text-xs text-weak">{c.description}</p>
                      </td>
                      <td className="!align-top">
                        <p className="tabular-nums">{c.weight}%</p>
                        <div className="mt-1 h-1.5 w-16 rounded-full bg-[#e5e5e5]"><div className="h-full rounded-full bg-brand" style={{ width: `${c.weight * 4}%` }} /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          );
        })}

        <Card title="Patterns in Past Hires">
          <ul className="space-y-2.5">
            {PATTERNS.map((p) => (
              <li key={p.name}>
                <p className="font-semibold">{p.name}</p>
                <p className="text-weak">{p.text}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Past Hires" bodyClass="">
          <table className="table w-full">
            <thead><tr><th>Hire</th><th>Rating</th><th className="w-28">Closest Match For</th></tr></thead>
            <tbody>
              {PAST_HIRES.map((h) => {
                const [name, ratingPart] = h.label.split(" (");
                const rating = ratingPart?.replace("rated ", "").replace(")", "") ?? "";
                return (
                  <tr key={h.key}>
                    <td className="!align-top">
                      <p className="font-semibold">{name}</p>
                      <p className="mt-0.5 text-xs text-weak">{h.profile}</p>
                    </td>
                    <td className="!align-top"><Badge tone={rating === "high" ? "ok" : rating === "low" ? "bad" : "warn"}>{rating[0]?.toUpperCase() + rating.slice(1)}</Badge></td>
                    <td className="!align-top tabular-nums">{matches[h.key] ?? 0} applicants</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-weak">Ratings are estimated from each hire&apos;s CV. Update rubric.txt and re-seed if actual performance ratings are available.</p>
        </Card>
      </div>
    </>
  );
}
