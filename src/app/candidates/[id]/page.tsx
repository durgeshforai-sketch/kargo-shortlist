import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EmailStatus, Recommendation } from "@/components/badges";
import { EmailPanel } from "@/components/EmailPanel";
import { IconTile } from "@/components/icons";
import { RecordPath } from "@/components/RecordPath";
import { TierControls } from "@/components/TierControls";
import { Badge, Card, Field, Score } from "@/components/ui";
import { getCandidate, getCriteria, getScores, listCandidates } from "@/lib/db";
import { firstName, recipientFor } from "@/lib/email";
import { env } from "@/lib/env";
import { hireLabel } from "@/lib/hires";
import { ROLE_LABEL, ROLES, roleScore } from "@/lib/types";
import { rankedRows } from "@/lib/views";

export default async function CandidateRecord({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const c = await getCandidate(id);
  if (!c) notFound();
  const [criteria, scores, all] = await Promise.all([getCriteria(), getScores(id), listCandidates()]);
  const rows = rankedRows(all, c.applied_role);
  const rank = rows.find((r) => r.c.id === id)?.rank;
  const dup = c.duplicate_of ? all.find((x) => x.id === c.duplicate_of) : null;

  return (
    <div className="space-y-3">
      <p className="text-xs">
        <Link href={`/?role=${c.applied_role}`} className="link">Candidates</Link>
        <span className="text-weak"> › {ROLE_LABEL[c.applied_role]} Applicants</span>
      </p>

      <section className="card">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <IconTile name="person" />
          <div className="min-w-0 flex-1 basis-[200px]">
            <p className="text-xs text-weak">Candidate</p>
            <h1 className="truncate text-lg font-bold leading-tight">{c.full_name ?? c.file_name}</h1>
          </div>
          <TierControls id={c.id} tier={c.tier} source={c.tier_source} locked={c.email_status === "sent"} />
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-line px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Applied Role">{ROLE_LABEL[c.applied_role]}</Field>
          <Field label="Rank">{rank ? `${rank} of ${rows.length}` : "–"}</Field>
          <Field label="PM Score">{c.pm_score ?? "–"}</Field>
          <Field label="SPM Score">{c.spm_score ?? "–"}</Field>
          <Field label="Recommendation"><Recommendation c={c} /></Field>
          <Field label="Email Status"><EmailStatus c={c} /></Field>
        </div>
      </section>

      <section className="card px-4 py-3">
        <RecordPath c={c} />
      </section>

      {(c.error || dup) && (
        <div className="card border-l-4 border-l-bad px-4 py-2.5 text-[13px]">
          {c.error && <p className="text-bad">{c.error}</p>}
          {dup && (
            <p>
              This CV is nearly identical to the one submitted by{" "}
              <Link href={`/candidates/${dup.id}`} className="link">{dup.full_name ?? dup.file_name}</Link>.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <Card title="Interview Brief">
            {c.brief ? <p className="leading-relaxed">{c.brief}</p> : <p className="text-weak">Briefs are prepared for candidates recommended for interview.</p>}
            {c.red_flags.length > 0 && (
              <div className="mt-3">
                <p className="field-label mb-1">Questions to Probe</p>
                <ul className="list-disc space-y-0.5 pl-5">
                  {c.red_flags.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}
          </Card>

          {ROLES.map((role) => (
            <Card
              key={role}
              title={<span>{ROLE_LABEL[role]} Scorecard {role === c.applied_role && <span className="ml-1"><Badge tone="brand">Applied</Badge></span>}</span>}
              actions={<Score value={roleScore(c, role)} muted={role !== c.applied_role} />}
              bodyClass=""
            >
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Criterion</th>
                    <th className="w-16">Weight</th>
                    <th className="w-16">Rating</th>
                    <th>Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.filter((cr) => cr.role === role).map((cr) => {
                    const s = scores.find((x) => x.code === cr.code);
                    return (
                      <tr key={cr.code} className="align-top">
                        <td className="!align-top font-semibold">{cr.name}</td>
                        <td className="!align-top tabular-nums text-weak">{cr.weight}%</td>
                        <td className="!align-top tabular-nums">{s ? `${s.score} / 5` : "–"}</td>
                        <td className="!align-top">
                          <p>{s?.reasoning}</p>
                          {s?.evidence && (
                            <p className={`mt-1 border-l-2 pl-2 text-xs ${s.evidence_verified ? "border-line-strong text-weak" : "border-bad text-bad"}`}>
                              “{s.evidence}”{!s.evidence_verified && " · Not found in CV; rating capped"}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <Card title={c.email_kind === "invite" ? "Interview Invite" : c.email_kind === "rejection" ? "Decline Email" : "Email"}>
            <EmailPanel
              id={c.id}
              kind={c.email_kind}
              subject={c.email_subject ?? ""}
              body={c.email_body ?? ""}
              status={c.email_status}
              error={c.email_error}
              firstName={firstName(c)}
              recipient={recipientFor(c)}
              testMode={!!env.testRecipient}
              sentAt={c.sent_at}
              sentTo={c.sent_to}
            />
          </Card>

          <Card title="Contact Details">
            <div className="grid grid-cols-1 gap-3">
              <Field label="Name">{c.full_name ?? "–"}</Field>
              <Field label="Email">{c.email ?? "–"}</Field>
              <Field label="Phone">{c.phone ?? "–"}</Field>
              <Field label="Source File">{c.file_name}</Field>
            </div>
            <p className="mt-3 text-xs text-weak">Contact details are stored separately and are never sent to the scoring model.</p>
          </Card>

          {c.closest_hire && (
            <Card title="Closest Past Hire">
              <p className="font-semibold">{hireLabel(c.closest_hire)}</p>
              <p className="mt-1 text-weak">{c.closest_hire_reason}</p>
            </Card>
          )}

          <Card title="Anonymised CV">
            <details>
              <summary className="link cursor-pointer">View the text used for scoring</summary>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap font-sans text-xs text-weak">{c.cv_content}</pre>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
