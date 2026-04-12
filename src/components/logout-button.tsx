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
      className="text-xs transition-colors"
      style={{ color: "var(--text-tertiary)", letterSpacing: "-0.01em" }}
    >
      ログアウト
    </button>
  );
}
