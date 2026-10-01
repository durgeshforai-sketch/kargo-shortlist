import type { Candidate } from "@/lib/types";
import { Icon } from "./icons";

/** Stage indicator for a candidate record: Uploaded → Scored → Drafted → Sent. */
export function RecordPath({ c }: { c: Candidate }) {
  const stages = ["Uploaded", "Scored", "Draft Ready", c.email_kind === "invite" ? "Invite Sent" : c.email_kind === "rejection" ? "Decline Sent" : "Email Sent"];
  const reached = c.email_status === "sent" ? 4 : c.email_status === "draft" || c.email_status === "failed" ? 3 : c.status === "scored" ? 2 : 1;
  return (
    <div className="flex overflow-x-auto">
      {stages.map((s, i) => {
        const done = i < reached - 1;
        const current = i === reached - 1;
        return (
          <div
            key={s}
            className={`relative flex h-8 min-w-[120px] flex-1 items-center justify-center gap-1 text-[13px] ${i === 0 ? "rounded-l-full" : ""} ${i === stages.length - 1 ? "rounded-r-full" : ""} ${done ? "bg-ok text-white" : current ? "bg-brand-dark text-white" : "bg-[#ececec] text-weak"}`}
            style={{ clipPath: i < stages.length - 1 ? "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%)" : "polygon(0 0, 100% 0, 100% 100%, 0 100%, 10px 50%)", marginLeft: i ? -6 : 0 }}
          >
            {done && <Icon name="check" className="h-3.5 w-3.5" />}
            {s}
          </div>
        );
      })}
    </div>
  );
}
