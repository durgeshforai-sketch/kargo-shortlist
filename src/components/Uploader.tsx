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
        patch(i, { state: "working", note: "Extracting and scoring" });
        try {
          const fd = new FormData();
          fd.append("file", it.file);
          fd.append("role", it.role);
          const res = await fetch("/api/candidates", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok || json.status === "error") throw new Error(json.error ?? "failed");
          patch(i, { state: "done", id: json.id, note: `PM ${json.pm_score} · SPM ${json.spm_score}${json.duplicate_of ? " · Duplicate CV" : ""}` });
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
      setDraftNote(`${json.remaining} drafts remaining`);
      if (json.remaining === 0 || json.done === 0) break;
    }
    setPhase("done");
  }

  const counts = { done: items.filter((x) => x.state === "done").length, err: items.filter((x) => x.state === "error").length };

  const pendingCount = items.filter((x) => x.state === "queued" || x.state === "error").length;
  const running = phase === "scoring" || phase === "drafting";

  return (
    <div className="space-y-3">
      <section className="card">
        <div className="card-header">Select Files</div>
        <div className="card-body space-y-3">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
            className="flex flex-wrap items-center justify-center gap-3 rounded border border-dashed border-line-strong bg-head/50 px-6 py-8"
          >
            <button onClick={() => input.current?.click()} className="btn">Upload Files</button>
            <span className="text-weak">or drop files here · PDF, DOCX or TXT</span>
            <input ref={input} type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => add(e.target.files)} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="field-label">Default Applied Role</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input mt-1 w-64">
                <option value="PM">Product Manager</option>
                <option value="SPM">Senior Product Manager</option>
              </select>
            </label>
            <p className="pb-2 text-xs text-weak">Files named pm_… or spm_… are assigned automatically. You can change the role for each file below.</p>
            <button onClick={start} disabled={running || pendingCount === 0} className="btn btn-brand ml-auto">
              {phase === "scoring" ? "Scoring…" : phase === "drafting" ? "Preparing drafts…" : `Process ${pendingCount} File${pendingCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </section>

      {items.length > 0 && (
        <section className="card">
          <div className="card-header">
            <span>Files ({items.length})</span>
            <span className="text-xs font-normal text-weak">
              {counts.done} completed · {counts.err} failed{draftNote ? ` · ${draftNote}` : ""}
            </span>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="table w-full">
              <thead>
                <tr><th>File Name</th><th className="w-40">Applied Role</th><th className="w-28">Status</th><th>Result</th></tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="max-w-[320px] truncate">{it.id ? <Link className="link" href={`/candidates/${it.id}`}>{it.file.name}</Link> : it.file.name}</td>
                    <td>
                      <select value={it.role} disabled={it.state !== "queued" && it.state !== "error"} onChange={(e) => patch(i, { role: e.target.value as Role })} className="input !py-1">
                        <option value="PM">Product Manager</option>
                        <option value="SPM">Senior Product Manager</option>
                      </select>
                    </td>
                    <td>
                      <span className={`text-xs ${it.state === "done" ? "text-ok" : it.state === "error" ? "text-bad" : "text-weak"}`}>
                        {{ queued: "Queued", working: "Processing", done: "Completed", error: "Failed" }[it.state]}
                      </span>
                    </td>
                    <td className={`max-w-[320px] truncate text-xs ${it.state === "error" ? "text-bad" : "text-weak"}`}>{it.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {phase === "done" && (
        <div className="card border-l-4 border-l-ok px-4 py-2.5">
          Processing complete. <Link href="/" className="link">View candidates</Link>
        </div>
      )}
    </div>
  );
}

function guessRole(name: string): Role | null {
  if (/^spm[_-]/i.test(name)) return "SPM";
  if (/^pm[_-]/i.test(name)) return "PM";
  return null;
}
