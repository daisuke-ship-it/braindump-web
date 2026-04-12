import Link from "next/link";
import { PipelineRun, ARTICLE_TYPES, PHASES } from "@/lib/types";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  running: { label: "実行中", color: "#30d158", bg: "rgba(48, 209, 88, 0.12)" },
  waiting_decision: { label: "判断待ち", color: "#ffd60a", bg: "rgba(255, 214, 10, 0.12)" },
  completed: { label: "完了", color: "#0071e3", bg: "rgba(0, 113, 227, 0.12)" },
  failed: { label: "失敗", color: "#ff453a", bg: "rgba(255, 69, 58, 0.12)" },
};

export function RunCard({ run }: { run: PipelineRun }) {
  const status = STATUS_LABELS[run.status] ?? STATUS_LABELS.running;
  const phase = PHASES.find((p) => p.key === run.current_phase);
  const typeLabel = run.article_type ? ARTICLE_TYPES[run.article_type] : null;

  return (
    <Link
      href={`/runs/${encodeURIComponent(run.id)}`}
      className="block rounded-xl transition-all hover:scale-[1.01]"
      style={{
        background: "var(--surface)",
        padding: "20px",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "17px",
              fontWeight: 600,
              lineHeight: 1.24,
              letterSpacing: "-0.022em",
            }}
          >
            {run.title}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            {typeLabel && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{
                  color: "var(--link)",
                  background: "rgba(41, 151, 255, 0.1)",
                }}
              >
                {typeLabel}
              </span>
            )}
            {phase && (
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {phase.label}
              </span>
            )}
          </div>
        </div>
        <span
          className="shrink-0 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ color: status.color, background: status.bg }}
        >
          {status.label}
        </span>
      </div>
      <div
        className="mt-3 text-xs"
        style={{ color: "var(--text-tertiary)", letterSpacing: "-0.01em" }}
      >
        {new Date(run.updated_at).toLocaleDateString("ja-JP")}
      </div>
    </Link>
  );
}
