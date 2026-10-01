import type { Candidate } from "@/lib/types";
import { Badge } from "./ui";

export function EmailStatus({ c }: { c: Candidate }) {
  if (c.email_status === "sent") return <Badge tone="ok">Sent</Badge>;
  if (c.email_status === "failed") return <Badge tone="bad">Failed</Badge>;
  if (c.email_status === "draft") return <Badge tone={c.email_kind === "invite" ? "brand" : "neutral"}>{c.email_kind === "invite" ? "Invite draft" : "Decline draft"}</Badge>;
  return <span className="text-faint">–</span>;
}

export function Recommendation({ c }: { c: Candidate }) {
  if (!c.tier) return <span className="text-faint">–</span>;
  const label = c.tier === "interview" ? "Interview" : "Decline";
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={c.tier === "interview" ? "ok" : "neutral"}>{label}</Badge>
      {c.tier_source === "founder" && <span className="text-xs text-weak" title="Set manually">(manual)</span>}
    </span>
  );
}
