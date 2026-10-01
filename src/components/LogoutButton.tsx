"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
      className="btn !h-7 !px-2.5 text-xs"
    >
      Log Out
    </button>
  );
}
