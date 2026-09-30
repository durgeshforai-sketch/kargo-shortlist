import Link from "next/link";
import { connection } from "next/server";
import { Card, Eyebrow, Pill, SetupNotice } from "@/components/ui";
import { listCandidates } from "@/lib/db";
import { recipientFor } from "@/lib/email";
import { env } from "@/lib/env";
import type { Candidate } from "@/lib/types";

export default async function Outbox() {
  await connection();
  let all: Candidate[];
  try {
    all = await listCandidates();
  } catch (e) {
    return <SetupNotice message={(e as Error).message} />;
  }
  const groups: { title: string; rows: Candidate[] }[] = [
    { title: "Interview invites awaiting your confirm", rows: all.filter((c) => c.email_status === "draft" && c.email_kind === "invite") },
    { title: "Rejections awaiting your confirm", rows: all.filter((c) => c.email_status === "draft" && c.email_kind === "rejection") },
    { title: "Failed", rows: all.filter((c) => c.email_status === "failed") },
    { title: "Sent", rows: all.filter((c) => c.email_status === "sent").sort((a, b) => (b.sent_at ?? "").localeCompare(a.sent_at ?? "")) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Step 3 · you confirm</Eyebrow>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Outbox</h1>
        <p className="mt-1 text-sm text-muted">
          Every email is a draft until you open it and click Confirm &amp; send. There is no bulk send, so no candidate is rejected without you reading it.
          {env.testRecipient && <> Test mode is on: every send goes to <b>{env.testRecipient}</b>.</>}
        </p>
      </div>
      {groups.map((g) => (
        <Card key={g.title}>
          <Eyebrow>{g.title} · {g.rows.length}</Eyebrow>
          {g.rows.length === 0 ? (
            <p className="mt-2 text-sm text-muted">None.</p>
          ) : (
            <ul className="mt-2 divide-y divide-rule/70 text-sm">
              {g.rows.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Link href={`/candidates/${c.id}`} className="min-w-44 font-medium hover:text-cargo">{c.full_name ?? c.file_name}</Link>
                  <Pill>{c.applied_role}</Pill>
                  <span className="flex-1 truncate text-muted">{c.email_subject}</span>
                  <span className="font-mono text-xs text-muted">{c.email_status === "sent" ? c.sent_to : recipientFor(c)}</span>
                  {c.email_error && <span className="text-xs text-stop">{c.email_error}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
