"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-foreground/40 hover:text-foreground/60 transition"
    >
      logout
    </button>
  );
}
