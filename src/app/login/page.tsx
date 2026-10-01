import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Log In | Kargo Recruiting" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Only allow same-site relative redirects after login.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#eef1f6] px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded bg-brand text-lg font-bold text-white">K</span>
        <span className="text-2xl font-semibold">Kargo</span>
        <span className="ml-1 text-2xl font-light text-weak">Recruiting</span>
      </div>
      <div className="card w-full max-w-[380px] px-6 py-6">
        <LoginForm next={target} />
      </div>
      <p className="mt-6 text-xs text-weak">© {new Date().getFullYear()} Kargo Technologies · Internal use only</p>
    </div>
  );
}
