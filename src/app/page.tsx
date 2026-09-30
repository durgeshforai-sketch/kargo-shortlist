import Link from "next/link";
import { connection } from "next/server";
import { SyncDraftsButton } from "@/components/SyncDraftsButton";
import { Card, Eyebrow, Pill, ScoreBar, SetupNotice, Stat } from "@/components/ui";
import { listCandidates } from "@/lib/db";
import { hireLabel } from "@/lib/hires";
import { INTERVIEW_SLOTS, ROLE_LABEL, ROLES, type Candidate, type Role } from "@/lib/types";
import { otherRole, rankedRows } from "@/lib/views";

function EmailPill({ c }: { c: Candidate }) {
  if (c.email_status === "sent") return <Pill tone="go">sent</Pill>;
  if (c.email_status === "failed") return <Pill tone="stop">send failed</Pill>;
  if (c.email_status === "draft") return <Pill tone={c.email_kind === "invite" ? "cargo" : "plain"}>{c.email_kind} draft</Pill>;
  return <Pill>no draft</Pill>;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
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
  const sent = all.filter((c) => c.email_status === "sent").length;
  const drafts = all.filter((c) => c.email_status === "draft").length;
  const byId = new Map(all.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Ranked shortlist</Eyebrow>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{ROLE_LABEL[role]}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Top {INTERVIEW_SLOTS} get a brief and an invite draft. Read above the line closely and skim below it once. Nothing goes out until you confirm it.
          </p>
        </div>
        <SyncDraftsButton />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Applications" value={all.length} hint={`${all.filter((c) => c.status === "scored").length} scored`} />
        <Stat label={`${role} applicants`} value={rows.length + pending.length} />
        <Stat label="Drafts waiting" value={drafts} hint="need your confirm" />
        <Stat label="Emails sent" value={sent} />
      </div>

      <div className="flex gap-1 border-b border-rule">
        {ROLES.map((x) => (
          <Link
            key={x}
            href={`/?role=${x}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${x === role ? "border-cargo text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {ROLE_LABEL[x]} <span className="font-mono text-xs">({all.filter((c) => c.applied_role === x).length})</span>
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            No scored {role} candidates yet. <Link className="text-cargo underline" href="/upload">Upload CVs</Link> to start.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-rule bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-rule text-left font-mono text-[11px] uppercase tracking-wider text-muted">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">{role} score</th>
                <th className="px-4 py-3">{otherRole(role)}</th>
                <th className="px-4 py-3">Most like</th>
                <th className="px-4 py-3">Signals</th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <RowWithLine key={row.c.id} showLine={row.rank === INTERVIEW_SLOTS + 1}>
                  <tr className={`border-b border-rule/70 hover:bg-paper/70 ${row.rank <= INTERVIEW_SLOTS ? "" : "text-ink/85"}`}>
                    <td className="px-4 py-3 font-mono text-muted">{row.rank}</td>
                    <td className="px-4 py-3">
                      <Link href={`/candidates/${row.c.id}`} className="font-medium hover:text-cargo">
                        {row.c.full_name ?? row.c.file_name}
                      </Link>
                      <p className="max-w-xs truncate text-xs text-muted">{row.c.headline}</p>
                    </td>
                    <td className="px-4 py-3"><ScoreBar value={row.score} /></td>
                    <td className="px-4 py-3"><ScoreBar value={row.otherScore} muted /></td>
                    <td className="px-4 py-3 text-xs text-muted">{hireLabel(row.c.closest_hire)?.split("·")[1]?.trim() ?? "—"}</td>
                    <td className="space-x-1 px-4 py-3">
                      {row.c.tier === "interview" && <Pill tone="go">interview</Pill>}
                      {row.c.tier_source === "founder" && <Pill tone="hold" title="You overrode the system's tier">your call</Pill>}
                      {row.crossRoleFit && <Pill tone="cargo" title={`Scores higher for ${otherRole(role)}`}>fits {otherRole(role)}</Pill>}
                      {row.c.duplicate_of && (
                        <Pill tone="stop" title={`Near-identical CV to ${byId.get(row.c.duplicate_of)?.full_name ?? "another applicant"}`}>duplicate CV</Pill>
                      )}
                    </td>
                    <td className="px-4 py-3"><EmailPill c={row.c} /></td>
                  </tr>
                </RowWithLine>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pending.length > 0 && (
        <Card>
          <Eyebrow>Not scored yet</Eyebrow>
          <ul className="mt-2 space-y-1 text-sm">
            {pending.map((c) => (
              <li key={c.id} className="flex gap-2">
                <Link href={`/candidates/${c.id}`} className="font-medium hover:text-cargo">{c.full_name ?? c.file_name}</Link>
                <Pill tone={c.status === "error" ? "stop" : "hold"}>{c.status}</Pill>
                {c.error && <span className="truncate text-xs text-stop">{c.error}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function RowWithLine({ showLine, children }: { showLine: boolean; children: React.ReactNode }) {
  return (
    <>
      {showLine && (
        <tr>
          <td colSpan={7} className="px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="cut-line flex-1" />
              <span className="font-mono text-[11px] uppercase tracking-widest text-cargo">the line · below = rejection drafts, still your call</span>
              <div className="cut-line flex-1" />
            </div>
          </td>
        </tr>
      )}
      {children}
    </>
  );
}
