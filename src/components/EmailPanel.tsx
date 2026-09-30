"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: string;
  kind: "invite" | "rejection" | null;
  subject: string;
  body: string;
  status: "none" | "draft" | "sent" | "failed";
  error: string | null;
  firstName: string;
  recipient: string | null;
  testMode: boolean;
  sentAt: string | null;
  sentTo: string | null;
}

const fill = (t: string, name: string) => t.replace(/\{\{\s*first_name\s*\}\}|\[NAME\]/gi, name);

export function EmailPanel(p: Props) {
  const router = useRouter();
  const [subject, setSubject] = useState(p.subject);
  const [body, setBody] = useState(p.body);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(p.error);
  const dirty = subject !== p.subject || body !== p.body;
  const locked = p.status === "sent";

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/candidates/${p.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ email_subject: subject, email_body: body }) });
    setBusy(false);
    setMsg(res.ok ? "Saved" : (await res.json()).error);
    router.refresh();
  }

  async function send() {
    setBusy(true);
    setMsg(null);
    if (dirty) await save();
    const res = await fetch(`/api/candidates/${p.id}/send`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: true }) });
    const json = await res.json();
    setBusy(false);
    setConfirming(false);
    setMsg(res.ok ? `Sent to ${json.sent_to}` : json.error);
    router.refresh();
  }

  if (!p.kind) return <p className="text-sm text-muted">No draft yet. Use “Refresh briefs &amp; drafts” on the shortlist.</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded px-2 py-0.5 font-medium ${p.kind === "invite" ? "bg-cargo-soft text-cargo" : "bg-paper text-muted"}`}>{p.kind}</span>
        <span className="text-muted">to {p.recipient ?? "no address on CV"}</span>
        {p.testMode && <span className="rounded bg-hold-soft px-2 py-0.5 text-hold">test mode: redirected</span>}
      </div>

      {locked ? (
        <div className="rounded border border-go/30 bg-go-soft/40 p-3 text-sm">
          <p className="font-medium text-go">Sent {p.sentAt ? new Date(p.sentAt).toLocaleString() : ""} to {p.sentTo}</p>
          <p className="mt-2 font-medium">{fill(p.subject, p.firstName)}</p>
          <pre className="mt-1 whitespace-pre-wrap font-sans">{fill(p.body, p.firstName)}</pre>
        </div>
      ) : (
        <>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full rounded border border-rule bg-white px-3 py-2 text-sm" aria-label="Subject" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={11} className="w-full rounded border border-rule bg-white px-3 py-2 font-mono text-[13px] leading-relaxed" aria-label="Body" />
          <p className="text-xs text-muted">
            <code>{"{{first_name}}"}</code> becomes “{p.firstName}” at send time. The AI never saw the name.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={save} disabled={!dirty || busy} className="rounded border border-rule px-3 py-2 text-sm disabled:opacity-40">Save edits</button>
            {!confirming ? (
              <button onClick={() => setConfirming(true)} disabled={busy || !p.recipient} className="rounded bg-cargo px-3 py-2 text-sm font-medium text-white disabled:opacity-40">
                Confirm &amp; send…
              </button>
            ) : (
              <span className="flex items-center gap-2 rounded border border-cargo/40 bg-cargo-soft/50 px-2 py-1">
                <span className="text-sm">Send this {p.kind} to {p.recipient}?</span>
                <button onClick={send} disabled={busy} className="rounded bg-cargo px-3 py-1.5 text-sm font-medium text-white">{busy ? "Sending…" : "Yes, send"}</button>
                <button onClick={() => setConfirming(false)} className="px-2 text-sm text-muted">Cancel</button>
              </span>
            )}
          </div>
        </>
      )}
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}
