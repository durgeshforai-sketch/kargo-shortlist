import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-rule bg-card p-5 ${className}`}>{children}</section>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{children}</p>;
}

const TONES = {
  go: "bg-go-soft text-go",
  hold: "bg-hold-soft text-hold",
  stop: "bg-stop-soft text-stop",
  cargo: "bg-cargo-soft text-cargo",
  plain: "bg-paper text-muted border border-rule",
} as const;

export function Pill({ tone = "plain", children, title }: { tone?: keyof typeof TONES; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function ScoreBar({ value, muted = false }: { value: number | null; muted?: boolean }) {
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-rule/60">
        <div className={`h-full ${muted ? "bg-muted/50" : v >= 70 ? "bg-go" : v >= 45 ? "bg-hold" : "bg-stop"}`} style={{ width: `${v}%` }} />
      </div>
      <span className={`font-mono text-sm tabular-nums ${muted ? "text-muted" : "font-medium"}`}>{value === null ? "—" : v.toFixed(0)}</span>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-rule bg-card px-4 py-3">
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SetupNotice({ message }: { message: string }) {
  return (
    <Card className="border-hold/40 bg-hold-soft/50">
      <p className="font-medium">The dashboard is not connected yet</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
    </Card>
  );
}
