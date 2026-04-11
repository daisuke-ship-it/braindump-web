"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/runs");
    } else {
      setError("パスワードが違います");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold mb-6 text-center">
          braindump pipeline
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          className="w-full px-4 py-3 rounded-lg bg-surface border border-border focus:border-accent focus:outline-none text-foreground"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 px-4 py-3 rounded-lg bg-accent text-black font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          {loading ? "..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
