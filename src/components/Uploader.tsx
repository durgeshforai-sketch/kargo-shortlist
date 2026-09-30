"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Role = "PM" | "SPM";
interface Item {
  file: File;
  role: Role;
  state: "queued" | "working" | "done" | "error";
  note?: string;
  id?: string;
}

const CONCURRENCY = 3;

export function Uploader() {
  const [role, setRole] = useState<Role>("PM");
  const [items, setItems] = useState<Item[]>([]);
  const [phase, setPhase] = useState<"idle" | "scoring" | "drafting" | "done">("idle");
  const [draftNote, setDraftNote] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const add = (files: FileList | null) =>
    files && setItems((prev) => [...prev, ...Array.from(files).map((file) => ({ file, role: guessRole(file.name) ?? role, state: "queued" as const }))]);
  const patch = (i: number, p: Partial<Item>) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function start() {
    setPhase("scoring");
    const queue = items.map((it, i) => ({ it, i })).filter(({ it }) => it.state === "queued" || it.state === "error");
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        const { it, i } = next;
        patch(i, { state: "working", note: "extracting & scoring…" });
        try {
          const fd = new FormData();
          fd.append("file", it.file);
          fd.append("role", it.role);
          const res = await fetch("/api/candidates", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok || json.status === "error") throw new Error(json.error ?? "failed");
          patch(i, { state: "done", id: json.id, note: `PM ${json.pm_score} · SPM ${json.spm_score}${json.duplicate_of ? " · duplicate CV" : ""}` });
        } catch (e) {
          patch(i, { state: "error", note: (e as Error).message });
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    // Ranking changed: bring briefs + invite/rejection drafts up to date.
    setPhase("drafting");
    let total = 0;
    for (let k = 0; k < 40; k++) {
      const res = await fetch("/api/drafts", { method: "POST" });
      const json = await res.json().catch(() => ({ error: "bad response" }));
      if (!res.ok) { setDraftNote(json.error); break; }
      total += json.done;
      setDraftNote(`${total} briefs/drafts written · ${json.remaining} left`);
      if (json.remaining === 0 || json.done === 0) break;
    }
    setPhase("done");
  }

  const counts = { done: items.filter((x) => x.state === "done").length, err: items.filter((x) => x.state === "error").length };

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
        onClick={() => input.current?.click()}
        className="cursor-pointer rounded-lg border-2 border-dashed border-rule bg-card px-6 py-10 text-center hover:border-cargo"
      >
        <p className="font-medium">Drop CVs here or click to choose</p>
        <p className="mt-1 text-sm text-muted">PDF, DOCX or TXT · many at once is fine</p>
        <input ref={input} type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => add(e.target.files)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Applied role for new files{" "}
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="ml-1 rounded border border-rule bg-white px-2 py-1.5">
            <option value="PM">PM — Product Manager</option>
            <option value="SPM">SPM — Senior Product Manager</option>
          </select>
        </label>
        <span className="text-xs text-muted">Files named pm_… / spm_… are pre-set. You can change each one below.</span>
        <button
          onClick={start}
          disabled={phase === "scoring" || phase === "drafting" || !items.some((x) => x.state === "queued" || x.state === "error")}
          className="ml-auto rounded bg-cargo px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {phase === "scoring" ? "Scoring…" : phase === "drafting" ? "Writing drafts…" : `Process ${items.filter((x) => x.state === "queued" || x.state === "error").length} CVs`}
        </button>
      </div>

      {items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-rule bg-card">
          <div className="flex justify-between border-b border-rule px-4 py-2 font-mono text-xs text-muted">
            <span>{items.length} files · {counts.done} scored · {counts.err} failed</span>
            {draftNote && <span>{draftNote}</span>}
          </div>
          <ul className="max-h-[480px] divide-y divide-rule/70 overflow-auto text-sm">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2">
                <span className="w-5 text-center">{it.state === "done" ? "✓" : it.state === "error" ? "✕" : it.state === "working" ? "…" : "·"}</span>
                <span className="flex-1 truncate">{it.id ? <Link className="hover:text-cargo" href={`/candidates/${it.id}`}>{it.file.name}</Link> : it.file.name}</span>
                <select
                  value={it.role}
                  disabled={it.state !== "queued" && it.state !== "error"}
                  onChange={(e) => patch(i, { role: e.target.value as Role })}
                  className="rounded border border-rule bg-white px-1 py-0.5 text-xs"
                >
                  <option>PM</option>
                  <option>SPM</option>
                </select>
                <span className={`w-64 truncate text-right text-xs ${it.state === "error" ? "text-stop" : "text-muted"}`}>{it.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {phase === "done" && (
        <p className="text-sm">
          Done. <Link href="/" className="text-cargo underline">Open the shortlist →</Link>
        </p>
      )}
    </div>
  );
}

function guessRole(name: string): Role | null {
  if (/^spm[_-]/i.test(name)) return "SPM";
  if (/^pm[_-]/i.test(name)) return "PM";
  return null;
}
