"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Demo credentials, shown as placeholders on purpose (requested for the demo). */
const DEMO_USER = "arjun";
const DEMO_PASS = "kargo123";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ username, password }) });
    if (res.ok) {
      router.replace(next);
      router.refresh();
      return;
    }
    setError((await res.json().catch(() => ({}))).error ?? "Unable to log in.");
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="field-label">Username</span>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={DEMO_USER} autoComplete="username" autoFocus className="input mt-1 !h-10" />
      </label>
      <label className="block">
        <span className="field-label">Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={DEMO_PASS} autoComplete="current-password" className="input mt-1 !h-10" />
      </label>
      {error && <p className="text-[13px] text-bad">{error}</p>}
      <button type="submit" disabled={busy || !username || !password} className="btn btn-brand !h-10 w-full justify-center text-[14px]">
        {busy ? "Logging in…" : "Log In"}
      </button>
    </form>
  );
}
