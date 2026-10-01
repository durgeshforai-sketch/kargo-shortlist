"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Candidates", match: (p: string) => p === "/" || p.startsWith("/candidates") },
  { href: "/upload", label: "Upload", match: (p: string) => p.startsWith("/upload") },
  { href: "/outbox", label: "Outbox", match: (p: string) => p.startsWith("/outbox") },
  { href: "/instincts", label: "Scoring Model", match: (p: string) => p.startsWith("/instincts") },
];

export function NavTabs() {
  const path = usePathname();
  return (
    <nav className="flex h-10 items-stretch overflow-x-auto">
      {TABS.map((t) => {
        const active = t.match(path);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center border-b-[3px] px-3 text-[13px] whitespace-nowrap ${active ? "border-brand font-semibold text-text" : "border-transparent text-weak hover:border-line-strong hover:text-text"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
