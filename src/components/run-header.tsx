"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PipelineRun, ARTICLE_TYPES } from "@/lib/types";
import { PhaseIndicator } from "./phase-indicator";
import { SyncButton } from "./sync-button";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  running: { label: "実行中", color: "#30d158", bg: "rgba(48, 209, 88, 0.12)" },
  waiting_decision: { label: "判断待ち", color: "#ffd60a", bg: "rgba(255, 214, 10, 0.12)" },
  completed: { label: "完了", color: "#0071e3", bg: "rgba(0, 113, 227, 0.12)" },
  failed: { label: "失敗", color: "#ff453a", bg: "rgba(255, 69, 58, 0.12)" },
};

export function RunHeader({ initialRun }: { initialRun: PipelineRun }) {
  const [run, setRun] = useState(initialRun);

  useEffect(() => {
    const channel = supabase
      .channel(`run-header-${initialRun.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bdp_runs",
          filter: `id=eq.${initialRun.id}`,
        },
        (payload) => {
          setRun(payload.new as PipelineRun);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialRun.id]);

  const typeLabel = run.article_type ? ARTICLE_TYPES[run.article_type] : null;
  const status = STATUS_LABELS[run.status] ?? STATUS_LABELS.running;

  return (
    <header
      className="sticky top-0 z-10 px-4 py-3"
      style={{
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "saturate(180%) blur(20px)",
        WebkitBackdropFilter: "saturate(180%) blur(20px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Link
              href="/runs"
              className="text-sm transition-colors"
              style={{ color: "var(--link)", letterSpacing: "-0.016em" }}
            >
              &larr; 一覧
            </Link>
          {typeLabel && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: "var(--link)", background: "rgba(41, 151, 255, 0.1)" }}
            >
              {typeLabel}
            </span>
          )}
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{ color: status.color, background: status.bg }}
          >
            {status.label}
          </span>
          </div>
          <SyncButton />
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "21px",
            fontWeight: 600,
            lineHeight: 1.19,
            letterSpacing: "-0.01em",
          }}
        >
          {run.title}
        </h1>
        <PhaseIndicator currentPhase={run.current_phase} />
      </div>
    </header>
  );
}
