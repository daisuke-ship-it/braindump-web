import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PipelineRun, PipelineArtifact, PipelineDecision, DECISION_PHASES, ARTICLE_TYPES } from "@/lib/types";
import { PhaseIndicator } from "@/components/phase-indicator";
import { RunDetail } from "./run-detail";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RunPage({ params }: Props) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  const { id } = await params;
  const db = getSupabaseAdmin();

  const [runRes, artifactsRes, decisionsRes] = await Promise.all([
    db.from("bdp_runs").select("*").eq("id", id).single(),
    db.from("bdp_artifacts").select("*").eq("run_id", id).order("created_at"),
    db.from("bdp_decisions").select("*").eq("run_id", id).order("decision_point"),
  ]);

  if (!runRes.data) {
    return (
      <div className="flex flex-1 items-center justify-center text-foreground/40">
        実行が見つかりません
      </div>
    );
  }

  const run = runRes.data as PipelineRun;
  const artifacts = (artifactsRes.data ?? []) as PipelineArtifact[];
  const decisions = (decisionsRes.data ?? []) as PipelineDecision[];

  // Determine which decision point is active
  const activeDecisionPoint = Object.entries(DECISION_PHASES).find(
    ([, phase]) => phase === run.current_phase
  );
  const decisionPoint = activeDecisionPoint ? Number(activeDecisionPoint[0]) : null;
  const isWaiting = run.status === "waiting_decision";

  const typeLabel = run.article_type ? ARTICLE_TYPES[run.article_type] : null;

  return (
    <div className="flex flex-col min-h-full">
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
          </div>
          <h1 className="text-lg font-semibold">{run.title}</h1>
          <PhaseIndicator currentPhase={run.current_phase} />
        </div>
      </header>
      <main className="flex-1 px-4 py-6 max-w-3xl mx-auto w-full">
        <RunDetail
          run={run}
          artifacts={artifacts}
          decisions={decisions}
          decisionPoint={decisionPoint}
          isWaiting={isWaiting}
        />
      </main>
    </div>
  );
}
