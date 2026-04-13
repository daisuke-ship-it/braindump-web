"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PipelineRun, PipelineArtifact, PipelineDecision, PHASES, DECISION_PHASES } from "@/lib/types";
import { MarkdownViewer } from "@/components/markdown-viewer";
import { DecisionPanel } from "@/components/decision-panel";
import { ChevronDown } from "lucide-react";

type Props = {
  run: PipelineRun;
  artifacts: PipelineArtifact[];
  decisions: PipelineDecision[];
  decisionPoint: number | null;
  isWaiting: boolean;
};

const ARTIFACT_LABELS: Record<string, string> = {
  "phase1-melchior": "MELCHIOR（逆張り）",
  "phase1-balthasar": "BALTHASAR（素材発掘）",
  "phase1-caspar": "CASPAR（切り口）",
  "phase1-raziel": "RAZIEL（外部リサーチ）",
  "phase1-samael": "SAMAEL（異分野アナロジー）",
  "divergence-report": "発散レポート（全文結合）",
  "material-picks": "素材ピック（PICK/DROP）",
  structure: "構成案",
  enriched: "検証済み構成",
  "chapter-selections": "章別パターン",
  draft: "ドラフト（AI版）",
  draft_edit: "ドラフト（加筆版）",
  "density-review": "MICHAEL（密度レビュー）",
  "voice-review": "SANDALPHON（声レビュー）",
  "structure-review": "METATRON（構成レビュー）",
  convergence: "品質統合判定（RAGUEL）",
  "reader-feedback": "読者フィードバック",
  "reader-zero": "AZRAEL（ゼロコンテキスト）",
  "reader-context": "AZRAEL（コンテキスト有）",
  output: "完成原稿",
  meta: "メタ情報",
  "pipeline-trace": "実行ログ",
};

const DECISION_ARTIFACT_MAP: Record<number, string[]> = {
  1: ["phase1-melchior", "phase1-balthasar", "phase1-caspar", "phase1-raziel", "phase1-samael", "divergence-report", "material-picks"],
  2: ["structure"],
  3: ["chapter-selections"],
  4: ["draft"],
  5: ["density-review", "voice-review", "structure-review", "convergence"],
};

function getDecisionArtifactContent(
  dp: number,
  artifacts: PipelineArtifact[]
): string | undefined {
  const types = DECISION_ARTIFACT_MAP[dp];
  if (!types) return undefined;
  const parts: string[] = [];
  for (const type of types) {
    const artifact = artifacts.find((a) => a.artifact_type === type);
    if (artifact) parts.push(artifact.content);
  }
  return parts.length > 0 ? parts.join("\n\n---\n\n") : undefined;
}

export function RunDetail({
  run: initialRun,
  artifacts: initialArtifacts,
  decisions: initialDecisions,
  decisionPoint: initialDecisionPoint,
  isWaiting: initialIsWaiting,
}: Props) {
  const [run, setRun] = useState(initialRun);
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [decisions, setDecisions] = useState(initialDecisions);
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(
    initialArtifacts.length > 0
      ? initialArtifacts[initialArtifacts.length - 1].artifact_type
      : null
  );

  const activeDecisionPoint = Object.entries(DECISION_PHASES).find(
    ([, phase]) => phase === run.current_phase
  );
  const decisionPoint = activeDecisionPoint ? Number(activeDecisionPoint[0]) : initialDecisionPoint;
  const isWaiting = run.status === "waiting_decision";

  useEffect(() => {
    const channel = supabase
      .channel(`run-${initialRun.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bdp_runs", filter: `id=eq.${initialRun.id}` },
        (payload) => setRun(payload.new as PipelineRun)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bdp_artifacts", filter: `run_id=eq.${initialRun.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newArtifact = payload.new as PipelineArtifact;
            setArtifacts((prev) => [...prev, newArtifact]);
            setExpandedArtifact(newArtifact.artifact_type);
          } else if (payload.eventType === "UPDATE") {
            setArtifacts((prev) =>
              prev.map((a) =>
                a.id === (payload.new as PipelineArtifact).id ? (payload.new as PipelineArtifact) : a
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bdp_decisions", filter: `run_id=eq.${initialRun.id}` },
        (payload) => setDecisions((prev) => [...prev, payload.new as PipelineDecision])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [initialRun.id]);

  const groupedByPhase = PHASES.map((phase) => ({
    phase,
    artifacts: artifacts.filter((a) => a.phase === phase.key),
  })).filter((g) => g.artifacts.length > 0);

  const hasDecision = (dp: number) => decisions.some((d) => d.decision_point === dp);

  return (
    <div className="flex flex-col gap-4">
      {groupedByPhase.map(({ phase, artifacts: phaseArtifacts }) => (
        <section
          key={phase.key}
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          <div
            className="px-4 py-2.5"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              className="text-xs font-medium uppercase"
              style={{ color: "var(--text-tertiary)", letterSpacing: "0.05em" }}
            >
              {phase.label}
            </span>
          </div>
          {phaseArtifacts.map((artifact) => {
            const isExpanded = expandedArtifact === artifact.artifact_type;
            const label = ARTIFACT_LABELS[artifact.artifact_type] ?? artifact.artifact_type;

            return (
              <div
                key={artifact.id}
                style={{ borderBottom: "1px solid var(--border)" }}
                className="last:border-b-0"
              >
                <button
                  onClick={() => setExpandedArtifact(isExpanded ? null : artifact.artifact_type)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left transition-colors"
                  style={{ fontSize: "14px", letterSpacing: "-0.016em" }}
                >
                  <span className="font-medium">{label}</span>
                  <ChevronDown
                    className="w-4 h-4 transition-transform"
                    style={{
                      color: "var(--text-tertiary)",
                      transform: isExpanded ? "rotate(180deg)" : "none",
                    }}
                  />
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <MarkdownViewer content={artifact.content} />
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}

      {isWaiting && decisionPoint && (
        <DecisionPanel
          run={run}
          decisionPoint={decisionPoint}
          existingDecision={hasDecision(decisionPoint)}
          artifactContent={getDecisionArtifactContent(decisionPoint, artifacts)}
        />
      )}

      {decisions.length > 0 && (
        <section className="rounded-xl overflow-hidden" style={{ background: "var(--surface)" }}>
          <div
            className="px-4 py-2.5"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              className="text-xs font-medium uppercase"
              style={{ color: "var(--text-tertiary)", letterSpacing: "0.05em" }}
            >
              判断履歴
            </span>
          </div>
          {decisions.map((d) => (
            <div
              key={d.id}
              className="px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
                  判断 {d.decision_point}
                </span>
                {d.decision_type && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255, 255, 255, 0.06)" }}
                  >
                    {d.decision_type}
                  </span>
                )}
              </div>
              {d.content && (
                <p
                  className="text-sm whitespace-pre-wrap"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {d.content}
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
