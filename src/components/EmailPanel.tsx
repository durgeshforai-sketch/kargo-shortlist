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
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(p.error ? { ok: false, text: p.error } : null);
  const dirty = subject !== p.subject || body !== p.body;

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/candidates/${p.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ email_subject: subject, email_body: body }) });
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: "Draft saved." } : { ok: false, text: (await res.json()).error });
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
    setMsg(res.ok ? { ok: true, text: `Email sent to ${json.sent_to}.` } : { ok: false, text: json.error });
    router.refresh();
  }

  if (!p.kind) return <p className="text-weak">No draft yet. Use Refresh Drafts on the Candidates list.</p>;

  if (p.status === "sent") {
    return (
      <div className="space-y-2">
        <div className="rounded border border-ok/30 bg-ok-soft/40 px-3 py-2 text-[13px]">
          Sent to <b>{p.sentTo}</b> on {p.sentAt ? new Date(p.sentAt).toLocaleString() : ""}
        </div>
        <p className="font-semibold">{fill(p.subject, p.firstName)}</p>
        <pre className="whitespace-pre-wrap font-sans text-[13px]">{fill(p.body, p.firstName)}</pre>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[56px_1fr] items-center gap-2">
        <span className="field-label">To</span>
        <span className="truncate">
          {p.recipient ?? "No email address on CV"}
          {p.testMode && <span className="ml-2 text-xs text-warn">(test inbox)</span>}
        </span>
        <span className="field-label">Subject</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" aria-label="Subject" />
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="input leading-relaxed" aria-label="Message" />
      <p className="text-xs text-weak">
        {"{{first_name}}"} is replaced with “{p.firstName}” when the email is sent.
      </p>

      {msg && <p className={`text-[13px] ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}

      {confirming ? (
        <div className="rounded border border-line bg-head px-3 py-2">
          <p className="mb-2">Send this {p.kind === "invite" ? "interview invite" : "decline email"} to <b>{p.recipient}</b>? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirming(false)} className="btn">Cancel</button>
            <button onClick={send} disabled={busy} className="btn btn-brand">{busy ? "Sending…" : "Send"}</button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <button onClick={save} disabled={!dirty || busy} className="btn">Save Draft</button>
          <button onClick={() => setConfirming(true)} disabled={busy || !p.recipient} className="btn btn-brand">Send Email</button>
        </div>
      )}
    </div>
  );
}
