"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Loops /api/drafts until every brief and draft matches the current ranking. */
export function SyncDraftsButton({ label = "Refresh briefs & drafts" }: { label?: string }) {
  const router = useRouter();
  const [state, setState] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      let total = 0;
      for (let i = 0; i < 40; i++) {
        const res = await fetch("/api/drafts", { method: "POST" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        total += json.done;
        setState(`${total} generated · ${json.remaining} left`);
        router.refresh();
        if (json.remaining === 0 || json.done === 0) break;
      }
      setState(`Up to date · ${total} generated`);
    } catch (e) {
      setState(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button onClick={run} disabled={busy} className="rounded bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50">
        {busy ? "Working…" : label}
      </button>
      {state && <span className="font-mono text-xs text-muted">{state}</span>}
    </div>
  );
}
