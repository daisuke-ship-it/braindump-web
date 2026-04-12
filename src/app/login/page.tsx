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
      <form onSubmit={handleSubmit} className="w-full max-w-sm px-6">
        <h1
          className="text-center mb-8"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            fontWeight: 600,
            lineHeight: 1.14,
            letterSpacing: "-0.02em",
          }}
        >
          braindump pipeline
        </h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="パスワード"
          autoFocus
          className="w-full px-4 py-3 rounded-lg bg-surface-2 text-foreground placeholder:text-text-tertiary focus:outline-none"
          style={{
            border: "1px solid var(--border-light)",
            fontSize: "17px",
            letterSpacing: "-0.022em",
          }}
        />
        {error && (
          <p className="text-sm mt-2" style={{ color: "#ff453a" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-3 rounded-lg font-medium disabled:opacity-50 transition-opacity"
          style={{
            background: "var(--accent)",
            color: "#ffffff",
            fontSize: "17px",
            letterSpacing: "-0.022em",
          }}
        >
          {loading ? "..." : "ログイン"}
        </button>
      </form>
    </div>
  );
}
