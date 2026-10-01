import Link from "next/link";
import { connection } from "next/server";
import { EmailStatus, Recommendation } from "@/components/badges";
import { SyncDraftsButton } from "@/components/SyncDraftsButton";
import { Badge, PageHeader, Score, SetupNotice } from "@/components/ui";
import { listCandidates } from "@/lib/db";
import { hireLabel } from "@/lib/hires";
import { INTERVIEW_SLOTS, ROLE_LABEL, ROLES, type Candidate, type Role } from "@/lib/types";
import { otherRole, rankedRows, type RankedRow } from "@/lib/views";

export default async function CandidatesList({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  await connection();
  const { role: r } = await searchParams;
  const role: Role = r === "SPM" ? "SPM" : "PM";

  let all: Candidate[];
  try {
    all = await listCandidates();
  } catch (e) {
    return <SetupNotice message={(e as Error).message} />;
  }

  const rows = rankedRows(all, role);
  const pending = all.filter((c) => c.applied_role === role && c.status !== "scored");
  const byId = new Map(all.map((c) => [c.id, c]));
  const kpis = [
    { label: "Total Applicants", value: all.length },
    { label: `${role} Applicants`, value: all.filter((c) => c.applied_role === role).length },
    { label: "Drafts Awaiting Review", value: all.filter((c) => c.email_status === "draft").length },
    { label: "Emails Sent", value: all.filter((c) => c.email_status === "sent").length },
  ];

  return (
    <>
      <PageHeader
        icon="person"
        object="Candidates"
        title={`${ROLE_LABEL[role]} Applicants`}
        meta={`${rows.length} items · Sorted by ${role} Score · Top ${INTERVIEW_SLOTS} recommended for interview`}
        actions={
          <>
            <SyncDraftsButton />
            <Link href="/upload" className="btn btn-brand">Upload CVs</Link>
          </>
        }
      />

      <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card px-4 py-3">
            <p className="field-label">{k.label}</p>
            <p className="mt-1 text-2xl font-light tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="flex items-center gap-1 border-b border-line px-3">
          {ROLES.map((x) => (
            <Link
              key={x}
              href={`/?role=${x}`}
              className={`border-b-2 px-3 py-2.5 text-[13px] ${x === role ? "border-brand font-semibold" : "border-transparent text-weak hover:text-text"}`}
            >
              {ROLE_LABEL[x]} ({all.filter((c) => c.applied_role === x).length})
            </Link>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-weak">
            No scored {role} candidates yet. <Link href="/upload" className="link">Upload CVs</Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table w-full min-w-[900px]">
              <thead>
                <tr>
                  <th className="w-10">Rank</th>
                  <th>Candidate Name</th>
                  <th>Summary</th>
                  <th>{role} Score</th>
                  <th>{otherRole(role)} Score</th>
                  <th>Closest Past Hire</th>
                  <th>Recommendation</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                <GroupRow label="Recommended for Interview" count={Math.min(INTERVIEW_SLOTS, rows.length)} />
                {rows.slice(0, INTERVIEW_SLOTS).map((row) => <Row key={row.c.id} row={row} role={role} byId={byId} />)}
                {rows.length > INTERVIEW_SLOTS && <GroupRow label="Other Applicants" count={rows.length - INTERVIEW_SLOTS} />}
                {rows.slice(INTERVIEW_SLOTS).map((row) => <Row key={row.c.id} row={row} role={role} byId={byId} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="card mt-3">
          <div className="card-header">Processing ({pending.length})</div>
          <ul className="card-body space-y-1">
            {pending.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Link href={`/candidates/${c.id}`} className="link">{c.full_name ?? c.file_name}</Link>
                <Badge tone={c.status === "error" ? "bad" : "warn"}>{c.status === "error" ? "Error" : "Processing"}</Badge>
                {c.error && <span className="truncate text-xs text-bad">{c.error}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function GroupRow({ label, count }: { label: string; count: number }) {
  return (
    <tr>
      <td colSpan={8} className="!bg-[#fafaf9] !py-1.5 text-xs font-semibold text-weak">
        {label} ({count})
      </td>
    </tr>
  );
}

function Row({ row, role, byId }: { row: RankedRow; role: Role; byId: Map<string, Candidate> }) {
  const { c } = row;
  return (
    <tr>
      <td className="text-weak tabular-nums">{row.rank}</td>
      <td className="whitespace-nowrap">
        <Link href={`/candidates/${c.id}`} className="link">{c.full_name ?? c.file_name}</Link>
        {c.duplicate_of && (
          <span className="ml-2"><Badge tone="bad" title={`Matches the CV of ${byId.get(c.duplicate_of)?.full_name ?? "another applicant"}`}>Duplicate CV</Badge></span>
        )}
        {row.crossRoleFit && (
          <span className="ml-2"><Badge tone="brand" title={`Ranks in the ${otherRole(role)} top ${INTERVIEW_SLOTS}`}>Also fits {otherRole(role)}</Badge></span>
        )}
      </td>
      <td className="max-w-[260px] truncate text-weak" title={c.headline ?? ""}>{c.headline}</td>
      <td><Score value={row.score} /></td>
      <td><Score value={row.otherScore} muted /></td>
      <td className="whitespace-nowrap text-weak">{hireLabel(c.closest_hire)?.split(" (")[0] ?? "–"}</td>
      <td><Recommendation c={c} /></td>
      <td><EmailStatus c={c} /></td>
    </tr>
  );
}
