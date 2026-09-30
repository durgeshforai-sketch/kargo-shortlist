import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { EmailPanel } from "@/components/EmailPanel";
import { TierControls } from "@/components/TierControls";
import { Card, Eyebrow, Pill, ScoreBar } from "@/components/ui";
import { getCandidate, getCriteria, getScores, listCandidates } from "@/lib/db";
import { firstName, recipientFor } from "@/lib/email";
import { env } from "@/lib/env";
import { hireLabel } from "@/lib/hires";
import { ROLE_LABEL, ROLES, roleScore } from "@/lib/types";
import { rankedRows } from "@/lib/views";

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const c = await getCandidate(id);
  if (!c) notFound();
  const [criteria, scores, all] = await Promise.all([getCriteria(), getScores(id), listCandidates()]);
  const rank = rankedRows(all, c.applied_role).find((r) => r.c.id === id)?.rank;
  const dup = c.duplicate_of ? all.find((x) => x.id === c.duplicate_of) : null;

  return (
    <div className="space-y-6">
      <Link href={`/?role=${c.applied_role}`} className="text-sm text-muted hover:text-ink">← {ROLE_LABEL[c.applied_role]} shortlist</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow>Applied for {ROLE_LABEL[c.applied_role]}{rank ? ` · ranked #${rank}` : ""}</Eyebrow>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{c.full_name ?? c.file_name}</h1>
          <p className="mt-1 text-muted">{c.headline}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {c.tier === "interview" ? <Pill tone="go">interview tier</Pill> : c.tier === "decline" ? <Pill>below the line</Pill> : null}
            {c.tier_source === "founder" && <Pill tone="hold">your override</Pill>}
            {c.status !== "scored" && <Pill tone={c.status === "error" ? "stop" : "hold"}>{c.status}</Pill>}
            {dup && (
              <Pill tone="stop">near-identical CV to {dup.full_name ?? dup.file_name}</Pill>
            )}
          </div>
        </div>
        <TierControls id={c.id} tier={c.tier} source={c.tier_source} locked={c.email_status === "sent"} />
      </div>

      {c.error && <Card className="border-stop/40 text-sm text-stop">{c.error}</Card>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <Eyebrow>Interview brief</Eyebrow>
            <p className="mt-2 leading-relaxed">{c.brief ?? <span className="text-muted">Briefs are written for the interview tier only.</span>}</p>
            {c.red_flags.length > 0 && (
              <div className="mt-4">
                <Eyebrow>Probe in the interview</Eyebrow>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                  {c.red_flags.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}
            {c.closest_hire && (
              <div className="mt-4 rounded border border-rule bg-paper/60 p-3 text-sm">
                <Eyebrow>Most like a past hire</Eyebrow>
                <p className="mt-1 font-medium">{hireLabel(c.closest_hire)}</p>
                <p className="text-muted">{c.closest_hire_reason}</p>
              </div>
            )}
          </Card>

          {ROLES.map((role) => (
            <Card key={role}>
              <div className="flex items-center justify-between">
                <Eyebrow>{ROLE_LABEL[role]} rubric {role === c.applied_role ? "· applied" : ""}</Eyebrow>
                <ScoreBar value={roleScore(c, role)} muted={role !== c.applied_role} />
              </div>
              <div className="mt-3 divide-y divide-rule/70">
                {criteria.filter((cr) => cr.role === role).map((cr) => {
                  const s = scores.find((x) => x.code === cr.code);
                  return (
                    <div key={cr.code} className="py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium">{cr.name} <span className="font-mono text-xs text-muted">{cr.weight}%</span></p>
                        <span className="font-mono text-sm">{s ? `${s.score}/5` : "—"}</span>
                      </div>
                      {s?.reasoning && <p className="text-sm text-muted">{s.reasoning}</p>}
                      {s?.evidence && (
                        <blockquote className={`mt-1 border-l-2 pl-3 text-sm italic ${s.evidence_verified ? "border-go/60" : "border-stop/60 text-stop"}`}>
                          “{s.evidence}” {!s.evidence_verified && <span className="not-italic">— quote not found in CV, score capped</span>}
                        </blockquote>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <Eyebrow>Draft email</Eyebrow>
            <div className="mt-3">
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
            </div>
          </Card>

          <Card>
            <Eyebrow>Personal details · stored here, never sent to AI</Eyebrow>
            <dl className="mt-2 grid grid-cols-[80px_1fr] gap-y-1 text-sm">
              <dt className="text-muted">Name</dt><dd>{c.full_name ?? "—"}</dd>
              <dt className="text-muted">Email</dt><dd className="break-all">{c.email ?? "—"}</dd>
              <dt className="text-muted">Phone</dt><dd>{c.phone ?? "—"}</dd>
              <dt className="text-muted">File</dt><dd className="break-all">{c.file_name}</dd>
            </dl>
          </Card>

          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-medium">What the AI saw (anonymised CV)</summary>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted">{c.cv_content}</pre>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
