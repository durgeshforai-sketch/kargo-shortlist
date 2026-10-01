import Link from "next/link";
import { connection } from "next/server";
import { Badge, PageHeader, SetupNotice } from "@/components/ui";
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
    { title: "Interview Invites", rows: all.filter((c) => c.email_status === "draft" && c.email_kind === "invite") },
    { title: "Decline Emails", rows: all.filter((c) => c.email_status === "draft" && c.email_kind === "rejection") },
    { title: "Failed", rows: all.filter((c) => c.email_status === "failed") },
    { title: "Sent", rows: all.filter((c) => c.email_status === "sent").sort((a, b) => (b.sent_at ?? "").localeCompare(a.sent_at ?? "")) },
  ];

  return (
    <>
      <PageHeader
        icon="mail"
        object="Outbox"
        title="Candidate Emails"
        meta={`Each email is reviewed and sent individually from the candidate record.${env.testRecipient ? ` Test mode: all emails are delivered to ${env.testRecipient}.` : ""}`}
      />
      <div className="space-y-3">
        {groups.map((g) => (
          <section key={g.title} className="card">
            <div className="card-header">{g.title} ({g.rows.length})</div>
            {g.rows.length === 0 ? (
              <p className="card-body text-weak">No items.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full min-w-[720px]">
                  <thead>
                    <tr><th>Candidate</th><th className="w-20">Role</th><th>Subject</th><th>{g.title === "Sent" ? "Sent To" : "Recipient"}</th>{g.title === "Sent" && <th>Sent On</th>}</tr>
                  </thead>
                  <tbody>
                    {g.rows.map((c) => (
                      <tr key={c.id}>
                        <td className="whitespace-nowrap"><Link href={`/candidates/${c.id}`} className="link">{c.full_name ?? c.file_name}</Link></td>
                        <td><Badge>{c.applied_role}</Badge></td>
                        <td className="max-w-[340px] truncate">{c.email_subject}{c.email_error && <span className="ml-2 text-xs text-bad">{c.email_error}</span>}</td>
                        <td className="text-weak">{c.email_status === "sent" ? c.sent_to : recipientFor(c)}</td>
                        {g.title === "Sent" && <td className="whitespace-nowrap text-weak">{c.sent_at ? new Date(c.sent_at).toLocaleString() : ""}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
