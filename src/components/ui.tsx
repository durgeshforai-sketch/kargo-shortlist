import type { ReactNode } from "react";
import { IconTile, type IconName } from "./icons";

export function PageHeader({ icon, object, title, meta, actions }: { icon: IconName; object: string; title: string; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="card mb-3 flex flex-wrap items-center gap-3 px-4 py-3">
      <IconTile name={icon} />
      <div className="min-w-0 flex-1 basis-[220px]">
        <p className="text-xs text-weak">{object}</p>
        <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
        {meta && <p className="mt-0.5 text-xs text-weak">{meta}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", bodyClass = "card-body" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <span>{title}</span>
          {actions}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

const BADGES = {
  ok: "bg-ok-soft text-[#194e31]",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  brand: "bg-brand-soft text-brand-dark",
  neutral: "bg-[#ececec] text-text",
} as const;

export function Badge({ tone = "neutral", children, title }: { tone?: keyof typeof BADGES; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-[1px] text-xs ${BADGES[tone]}`}>
      {children}
    </span>
  );
}

export function Score({ value, muted = false }: { value: number | null; muted?: boolean }) {
  if (value === null) return <span className="text-faint">–</span>;
  const color = muted ? "#aeaeae" : value >= 70 ? "#2e844a" : value >= 45 ? "#dd7a01" : "#ba0517";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-7 text-right tabular-nums ${muted ? "text-weak" : "font-semibold"}`}>{Math.round(value)}</span>
      <div className="h-1.5 w-16 rounded-full bg-[#e5e5e5]">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="field-label">{label}</p>
      <div className="mt-0.5 truncate text-[13px]">{children}</div>
    </div>
  );
}

export function SetupNotice({ message }: { message: string }) {
  return (
    <div className="card border-l-4 border-l-warn px-4 py-3">
      <p className="font-semibold">Unable to load records</p>
      <p className="mt-1 text-weak">{message}</p>
    </div>
  );
}
