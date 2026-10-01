import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kargo Recruiting",
  description: "Candidate ranking, interview briefs and outreach for Kargo's PM and SPM roles.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
