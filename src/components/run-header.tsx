"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PipelineRun, ARTICLE_TYPES, PHASES } from "@/lib/types";
import { PhaseIndicator } from "./phase-indicator";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  running: { label: "実行中", color: "bg-green-500/20 text-green-400" },
  waiting_decision: { label: "判断待ち", color: "bg-yellow-500/20 text-yellow-400" },
  completed: { label: "完了", color: "bg-blue-500/20 text-blue-400" },
  failed: { label: "失敗", color: "bg-red-500/20 text-red-400" },
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
    <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/runs"
            className="text-foreground/40 hover:text-foreground/60 text-sm"
          >
            &larr; 一覧
          </Link>
          {typeLabel && (
            <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-xs">
              {typeLabel}
            </span>
          )}
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
        <h1 className="text-lg font-semibold">{run.title}</h1>
        <PhaseIndicator currentPhase={run.current_phase} />
      </div>
    </header>
  );
}
