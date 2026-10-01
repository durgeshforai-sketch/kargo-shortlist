"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TierControls({ id, tier, source, locked }: { id: string; tier: string | null; source: string; locked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(path: string, init: RequestInit, label: string) {
    setBusy(label);
    await fetch(path, init);
    await fetch("/api/drafts", { method: "POST" }); // regenerate the brief/draft for the new recommendation
    setBusy(null);
    router.refresh();
  }
  const set = (t: string) => act(`/api/candidates/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier: t }) }, t);

  return (
    <div className="flex flex-wrap gap-2">
      {!locked && tier !== "interview" && (
        <button onClick={() => set("interview")} disabled={!!busy} className="btn">{busy === "interview" ? "Saving…" : "Move to Interview"}</button>
      )}
      {!locked && tier !== "decline" && (
        <button onClick={() => set("decline")} disabled={!!busy} className="btn btn-danger">{busy === "decline" ? "Saving…" : "Decline"}</button>
      )}
      {!locked && source === "founder" && (
        <button onClick={() => set("system")} disabled={!!busy} className="btn">Reset to System</button>
      )}
      <button onClick={() => act(`/api/candidates/${id}/rescore`, { method: "POST" }, "rescore")} disabled={!!busy || locked} className="btn">
        {busy === "rescore" ? "Re-scoring…" : "Re-score"}
      </button>
    </div>
  );
}
