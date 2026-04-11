"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PipelineRun, PipelineArtifact, PipelineDecision, PHASES } from "@/lib/types";
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
  // Phase 1: 個別エージェント出力
  "melchior-output": "MELCHIOR（逆張り）",
  "balthasar-output": "BALTHASAR（素材発掘）",
  "caspar-output": "CASPAR（切り口）",
  "raziel-output": "RAZIEL（外部リサーチ）",
  // Phase 1.5: 統合
  "divergence-report": "発散レポート（統合）",
  // Phase 2
  structure: "構成案",
  // Phase 2.5
  enriched: "検証済み構成",
  // Phase 3
  "chapter-selections": "章別パターン",
  // Phase 4
  draft: "ドラフト（AI版）",
  draft_edit: "ドラフト（加筆版）",
  // Phase 5: 個別レビュー
  "density-review": "MICHAEL（密度レビュー）",
  "voice-review": "SANDALPHON（声レビュー）",
  "structure-review": "METATRON（構成レビュー）",
  // Phase 5.5
  convergence: "品質統合判定（RAGUEL）",
  // Phase 6
  "reader-feedback": "読者フィードバック",
  "reader-zero": "AZRAEL（ゼロコンテキスト）",
  "reader-context": "AZRAEL（コンテキスト有）",
  // Phase 7
  output: "完成原稿",
  meta: "メタ情報",
  "pipeline-trace": "実行ログ",
};

// 判断ポイントに対応するアーティファクトの内容を取得
// 複数アーティファクトがある場合は結合（個別出力 + 統合レポート）
const DECISION_ARTIFACT_MAP: Record<number, string[]> = {
  1: ["melchior-output", "balthasar-output", "caspar-output", "raziel-output", "divergence-report"],
  2: ["structure"],
  3: ["chapter-selections"],
  4: ["draft"],
  5: ["density-review", "voice-review", "structure-review", "convergence"],
};

function getDecisionArtifactContent(
  decisionPoint: number,
  artifacts: PipelineArtifact[]
): string | undefined {
  const types = DECISION_ARTIFACT_MAP[decisionPoint];
  if (!types) return undefined;

  const parts: string[] = [];
  for (const type of types) {
    const artifact = artifacts.find((a) => a.artifact_type === type);
    if (artifact) {
      parts.push(artifact.content);
    }
  }
  return parts.length > 0 ? parts.join("\n\n---\n\n") : undefined;
}

export function RunDetail({
  run: initialRun,
  artifacts: initialArtifacts,
  decisions: initialDecisions,
  decisionPoint,
  isWaiting,
}: Props) {
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(
    // Auto-expand the latest artifact
    initialArtifacts.length > 0
      ? initialArtifacts[initialArtifacts.length - 1].artifact_type
      : null
  );

  // Realtime subscription for new artifacts
  useEffect(() => {
    const channel = supabase
      .channel(`run-${initialRun.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bdp_artifacts",
          filter: `run_id=eq.${initialRun.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setArtifacts((prev) => [...prev, payload.new as PipelineArtifact]);
          } else if (payload.eventType === "UPDATE") {
            setArtifacts((prev) =>
              prev.map((a) =>
                a.id === (payload.new as PipelineArtifact).id
                  ? (payload.new as PipelineArtifact)
                  : a
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialRun.id]);

  // Group artifacts by phase
  const groupedByPhase = PHASES.map((phase) => ({
    phase,
    artifacts: artifacts.filter((a) => a.phase === phase.key),
  })).filter((g) => g.artifacts.length > 0);

  const hasDecision = (dp: number) =>
    initialDecisions.some((d) => d.decision_point === dp);

  return (
    <div className="flex flex-col gap-4">
      {/* Artifacts by phase */}
      {groupedByPhase.map(({ phase, artifacts: phaseArtifacts }) => (
        <section key={phase.key} className="rounded-xl bg-surface border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-foreground/[0.02] border-b border-border">
            <span className="text-xs font-medium text-foreground/40 uppercase tracking-wider">
              {phase.label}
            </span>
          </div>
          {phaseArtifacts.map((artifact) => {
            const isExpanded = expandedArtifact === artifact.artifact_type;
            const label =
              ARTIFACT_LABELS[artifact.artifact_type] ?? artifact.artifact_type;

            return (
              <div key={artifact.id} className="border-b border-border last:border-b-0">
                <button
                  onClick={() =>
                    setExpandedArtifact(isExpanded ? null : artifact.artifact_type)
                  }
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-foreground/[0.02] transition"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-foreground/30 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
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

      {/* Decision panel */}
      {isWaiting && decisionPoint && (
        <DecisionPanel
          run={initialRun}
          decisionPoint={decisionPoint}
          existingDecision={hasDecision(decisionPoint)}
          artifactContent={getDecisionArtifactContent(decisionPoint, artifacts)}
        />
      )}

      {/* Past decisions */}
      {initialDecisions.length > 0 && (
        <section className="rounded-xl bg-surface border border-border overflow-hidden">
          <div className="px-4 py-2.5 bg-foreground/[0.02] border-b border-border">
            <span className="text-xs font-medium text-foreground/40 uppercase tracking-wider">
              判断履歴
            </span>
          </div>
          {initialDecisions.map((d) => (
            <div key={d.id} className="px-4 py-3 border-b border-border last:border-b-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-accent">
                  判断 {d.decision_point}
                </span>
                {d.decision_type && (
                  <span className="text-xs px-2 py-0.5 rounded bg-foreground/10">
                    {d.decision_type}
                  </span>
                )}
              </div>
              {d.content && (
                <p className="text-sm text-foreground/60 whitespace-pre-wrap">
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
