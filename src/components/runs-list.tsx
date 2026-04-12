"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PipelineRun } from "@/lib/types";
import { RunCard } from "./run-card";

export function RunsList({ initialRuns }: { initialRuns: PipelineRun[] }) {
  const [runs, setRuns] = useState(initialRuns);

  useEffect(() => {
    const channel = supabase
      .channel("runs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bdp_runs" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRuns((prev) => [payload.new as PipelineRun, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setRuns((prev) =>
              prev.map((r) =>
                r.id === (payload.new as PipelineRun).id
                  ? (payload.new as PipelineRun)
                  : r
              )
            );
          } else if (payload.eventType === "DELETE") {
            setRuns((prev) =>
              prev.filter((r) => r.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (runs.length === 0) {
    return (
      <div className="text-center py-20 text-foreground/30">
        <p className="text-lg">パイプライン実行なし</p>
        <p className="text-sm mt-2">
          /publish でパイプラインを開始するとここに表示されます
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {runs.map((run) => (
        <RunCard key={run.id} run={run} />
      ))}
    </div>
  );
}
