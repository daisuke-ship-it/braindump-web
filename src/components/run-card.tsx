import Link from "next/link";
import { PipelineRun, ARTICLE_TYPES, PHASES } from "@/lib/types";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  running: { label: "実行中", color: "bg-green-500/20 text-green-400" },
  waiting_decision: { label: "判断待ち", color: "bg-yellow-500/20 text-yellow-400" },
  completed: { label: "完了", color: "bg-blue-500/20 text-blue-400" },
  failed: { label: "失敗", color: "bg-red-500/20 text-red-400" },
};

export function RunCard({ run }: { run: PipelineRun }) {
  const status = STATUS_LABELS[run.status] ?? STATUS_LABELS.running;
  const phase = PHASES.find((p) => p.key === run.current_phase);
  const typeLabel = run.article_type ? ARTICLE_TYPES[run.article_type] : null;

  return (
    <Link
      href={`/runs/${encodeURIComponent(run.id)}`}
      className="block p-4 rounded-xl bg-surface border border-border hover:border-accent/40 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-base truncate">{run.title}</h2>
          <div className="flex items-center gap-2 mt-1.5 text-sm text-foreground/50">
            {typeLabel && (
              <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-xs">
                {typeLabel}
              </span>
            )}
            {phase && <span>{phase.label}</span>}
          </div>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>
      <div className="mt-2 text-xs text-foreground/30">
        {new Date(run.updated_at).toLocaleDateString("ja-JP")}
      </div>
    </Link>
  );
}
