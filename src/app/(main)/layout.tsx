import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { NavTabs } from "@/components/NavTabs";
import { loginEnabled } from "@/lib/session";

export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-surface shadow-[0_2px_3px_rgba(0,0,0,0.08)]">
        <div className="flex h-12 items-center gap-3 border-b border-line px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-brand text-sm font-bold text-white">K</span>
            <span className="text-[15px] font-semibold">Kargo</span>
          </Link>
          <span className="h-5 w-px bg-line" />
          <span className="text-[15px] text-weak">Recruiting</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-xs leading-tight sm:block">
              <span className="block font-semibold">Arjun Mehta</span>
              <span className="text-weak">Founder</span>
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-dark text-xs font-semibold text-white">AM</span>
            {loginEnabled() && <LogoutButton />}
          </div>
        </div>
        <div className="px-2">
          <NavTabs />
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-3 py-3 sm:px-4 sm:py-4">{children}</main>
    </>
  );
}
