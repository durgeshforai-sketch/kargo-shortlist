"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TierControls({ id, tier, source, locked }: { id: string; tier: string | null; source: string; locked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function act(path: string, init: RequestInit, label: string) {
    setBusy(label);
    await fetch(path, init);
    // Regenerate the brief/draft for the new tier straight away.
    await fetch("/api/drafts", { method: "POST" });
    setBusy(null);
    router.refresh();
  }
  const patch = (t: string) => act(`/api/candidates/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier: t }) }, t);

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {!locked && tier !== "interview" && (
        <button onClick={() => patch("interview")} disabled={!!busy} className="rounded border border-go/40 px-3 py-1.5 text-go hover:bg-go-soft">
          {busy === "interview" ? "…" : "Move to interview"}
        </button>
      )}
      {!locked && tier !== "decline" && (
        <button onClick={() => patch("decline")} disabled={!!busy} className="rounded border border-stop/40 px-3 py-1.5 text-stop hover:bg-stop-soft">
          {busy === "decline" ? "…" : "Move below the line"}
        </button>
      )}
      {!locked && source === "founder" && (
        <button onClick={() => patch("system")} disabled={!!busy} className="rounded border border-rule px-3 py-1.5 text-muted">Undo my override</button>
      )}
      <button onClick={() => act(`/api/candidates/${id}/rescore`, { method: "POST" }, "rescore")} disabled={!!busy || locked} className="rounded border border-rule px-3 py-1.5 text-muted hover:text-ink">
        {busy === "rescore" ? "Re-scoring…" : "Re-score"}
      </button>
    </div>
  );
}
