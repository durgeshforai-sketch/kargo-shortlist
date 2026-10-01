"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";

/** Regenerates any brief or draft that no longer matches the current ranking. */
export function SyncDraftsButton() {
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
        setState(`Updating… ${json.remaining} remaining`);
        router.refresh();
        if (json.remaining === 0 || json.done === 0) break;
      }
      setState(total ? `${total} updated` : "Everything is up to date");
    } catch (e) {
      setState((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {state && <span className="text-xs text-weak">{state}</span>}
      <button onClick={run} disabled={busy} className="btn">
        <Icon name="refresh" className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
        Refresh Drafts
      </button>
    </span>
  );
}
