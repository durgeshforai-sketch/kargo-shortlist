import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Kargo Shortlist",
  description: "Ranked PM and SPM shortlists for Arjun. The system ranks and explains; Arjun decides.",
};

const NAV = [
  { href: "/", label: "Shortlist" },
  { href: "/upload", label: "Upload CVs" },
  { href: "/outbox", label: "Outbox" },
  { href: "/instincts", label: "Founder model" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <header className="stripes text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight">KARGO</span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">shortlist</span>
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded px-3 py-1.5 text-white/85 hover:bg-white/10 hover:text-white">
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="ml-auto font-mono text-[11px] uppercase tracking-widest text-white/60">AI ranks · Arjun decides</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
