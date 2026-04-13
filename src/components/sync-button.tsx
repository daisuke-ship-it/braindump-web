"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const router = useRouter();

  async function handleSync() {
    setSyncing(true);
    setResult(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        setResult({ ok: true, message: `${data.synced}件 同期完了` });
        router.refresh();
      } else if (res.status === 503) {
        setResult({ ok: false, message: "ローカルで npm run sync を実行してください" });
      } else {
        setResult({ ok: false, message: data.error ?? "同期に失敗しました" });
      }
    } catch {
      setResult({ ok: false, message: "通信エラー" });
    }

    setSyncing(false);
    setTimeout(() => setResult(null), 4000);
  }

  return (
    <div className="flex items-center gap-2">
      {result && (
        <span
          className="text-xs"
          style={{ color: result.ok ? "#30d158" : "#ff453a" }}
        >
          {result.message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity disabled:opacity-50"
        style={{
          background: "rgba(0, 113, 227, 0.12)",
          color: "var(--link)",
        }}
        title="パイプラインの状況を同期"
      >
        <RefreshCw
          className="w-3 h-3"
          style={{
            animation: syncing ? "spin 1s linear infinite" : "none",
          }}
        />
        {syncing ? "同期中..." : "同期"}
      </button>
    </div>
  );
}
