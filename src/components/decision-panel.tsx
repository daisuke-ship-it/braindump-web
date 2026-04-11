"use client";

import { useState, useMemo } from "react";
import { PipelineRun } from "@/lib/types";
import { parseSections, SelectableItem } from "@/lib/parse-sections";
import { SelectableItems } from "./selectable-items";

type DecisionPanelProps = {
  run: PipelineRun;
  decisionPoint: number;
  existingDecision: boolean;
  artifactContent?: string;
};

const DECISION_CONFIG: Record<
  number,
  {
    title: string;
    globalPlaceholder: string;
    hasButtons?: { label: string; value: string }[];
  }
> = {
  1: {
    title: "素材・角度の選択",
    globalPlaceholder: "全体への補��コメント（任意）",
  },
  2: {
    title: "構成の選択",
    globalPlaceholder: "構成全体への補足コメント（任意）",
  },
  3: {
    title: "章別パターンの選択",
    globalPlaceholder: "全体への補足コメント（任意）",
  },
  4: {
    title: "加筆・修正指示",
    globalPlaceholder: "ドラフト全体への指示（任意）",
  },
  5: {
    title: "品質判定",
    globalPlaceholder: "判定の補足コメント（任意）",
    hasButtons: [
      { label: "PUBLISH", value: "PUBLISH" },
      { label: "MINOR FIX", value: "MINOR_FIX" },
      { label: "REVISE (執筆)", value: "REVISE_WRITE" },
      { label: "REVISE (構成)", value: "REVISE_SKETCH" },
    ],
  },
};

export function DecisionPanel({
  run,
  decisionPoint,
  existingDecision,
  artifactContent,
}: DecisionPanelProps) {
  const [globalComment, setGlobalComment] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(existingDecision);
  const config = DECISION_CONFIG[decisionPoint];

  const items: SelectableItem[] = useMemo(() => {
    if (!artifactContent) return [];
    return parseSections(artifactContent);
  }, [artifactContent]);

  if (!config) return null;

  function toggleItem(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setComment(id: string, text: string) {
    setComments((prev) => ({ ...prev, [id]: text }));
  }

  function buildDecisionContent(): string {
    const parts: string[] = [];

    if (items.length > 0 && selected.size > 0) {
      parts.push("## 採用項目");
      for (const item of items) {
        if (selected.has(item.id)) {
          parts.push(`\n### [${item.agent}] ${item.title}`);
          if (comments[item.id]?.trim()) {
            parts.push(`> ${comments[item.id].trim()}`);
          }
        }
      }
    }

    // Items with comments but not selected (feedback without adoption)
    const commentedNotSelected = items.filter(
      (item) => !selected.has(item.id) && comments[item.id]?.trim()
    );
    if (commentedNotSelected.length > 0) {
      parts.push("\n## コメント（不採用項目）");
      for (const item of commentedNotSelected) {
        parts.push(`\n### [${item.agent}] ${item.title}`);
        parts.push(`> ${comments[item.id].trim()}`);
      }
    }

    if (globalComment.trim()) {
      parts.push("\n## 全体コメント");
      parts.push(globalComment.trim());
    }

    return parts.join("\n");
  }

  async function submit(decisionType?: string) {
    setSubmitting(true);
    const decisionContent = buildDecisionContent();

    const res = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: run.id,
        decision_point: decisionPoint,
        decision_type: decisionType ?? null,
        content: decisionContent || null,
      }),
    });
    if (res.ok) {
      setSubmitted(true);
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
        判断を送信済み。パイプラインが次のPhaseに進みます。
      </div>
    );
  }

  const hasSelection = selected.size > 0;
  const hasComment = globalComment.trim().length > 0;
  const hasItemComments = Object.values(comments).some((c) => c.trim());
  const canSubmit = hasSelection || hasComment || hasItemComments;

  return (
    <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
      <h3 className="text-sm font-semibold text-accent mb-1">
        判断 {decisionPoint}: {config.title}
      </h3>
      <p className="text-xs text-foreground/40 mb-3">
        項目をチェック��て採用。各項目にコメントも残せます。
      </p>

      {/* Selectable items */}
      {items.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-foreground/40">
              {items.length}件の項目
            </span>
            {selected.size > 0 && (
              <span className="text-xs text-accent font-medium">
                {selected.size}件 採用
              </span>
            )}
          </div>
          <SelectableItems
            items={items}
            selected={selected}
            onToggle={toggleItem}
            comments={comments}
            onComment={setComment}
          />
        </div>
      )}

      {/* Global comment */}
      <textarea
        value={globalComment}
        onChange={(e) => setGlobalComment(e.target.value)}
        placeholder={config.globalPlaceholder}
        rows={3}
        className="w-full px-3 py-2 rounded-lg bg-background border border-border focus:border-accent focus:outline-none text-sm text-foreground resize-y"
      />

      {/* Submit buttons */}
      <div className="mt-3 flex flex-wrap gap-2">
        {config.hasButtons ? (
          config.hasButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => submit(btn.value)}
              disabled={submitting}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                btn.value === "PUBLISH"
                  ? "bg-green-600 text-white hover:bg-green-500"
                  : btn.value.startsWith("REVISE")
                    ? "bg-yellow-600/80 text-white hover:bg-yellow-500"
                    : "bg-surface border border-border text-foreground hover:border-accent/40"
              }`}
            >
              {btn.label}
            </button>
          ))
        ) : (
          <button
            onClick={() => submit()}
            disabled={submitting || !canSubmit}
            className="px-6 py-2 rounded-lg bg-accent text-black text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {submitting ? "送信中..." : "送信"}
          </button>
        )}
      </div>
    </div>
  );
}
