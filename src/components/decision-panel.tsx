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
  1: { title: "素材・角度の選択", globalPlaceholder: "全体への補足コメント（任意）" },
  2: { title: "構成の選択", globalPlaceholder: "構成全体への補足コメント（任意）" },
  3: { title: "章別パターンの選択", globalPlaceholder: "全体への補足コメント（任意）" },
  4: { title: "加筆・修正指示", globalPlaceholder: "ドラフト全体への指示（任意）" },
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

export function DecisionPanel({ run, decisionPoint, existingDecision, artifactContent }: DecisionPanelProps) {
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
          if (comments[item.id]?.trim()) parts.push(`> ${comments[item.id].trim()}`);
        }
      }
    }
    const commentedNotSelected = items.filter((item) => !selected.has(item.id) && comments[item.id]?.trim());
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
    const res = await fetch("/api/decisions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        run_id: run.id,
        decision_point: decisionPoint,
        decision_type: decisionType ?? null,
        content: buildDecisionContent() || null,
      }),
    });
    if (res.ok) setSubmitted(true);
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div
        className="p-4 rounded-xl text-sm"
        style={{
          background: "rgba(48, 209, 88, 0.08)",
          border: "1px solid rgba(48, 209, 88, 0.2)",
          color: "#30d158",
        }}
      >
        判断を送信済み。パイプラインが次のPhaseに進みます。
      </div>
    );
  }

  const canSubmit = selected.size > 0 || globalComment.trim().length > 0 || Object.values(comments).some((c) => c.trim());

  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "rgba(0, 113, 227, 0.04)",
        border: "1px solid rgba(0, 113, 227, 0.15)",
      }}
    >
      <h3
        className="text-sm font-semibold mb-1"
        style={{ color: "var(--accent)" }}
      >
        判断 {decisionPoint}: {config.title}
      </h3>
      <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
        項目をチェックして採用。各項目にコメントも残せます。
      </p>

      {items.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {items.length}件の項目
            </span>
            {selected.size > 0 && (
              <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>
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

      <textarea
        value={globalComment}
        onChange={(e) => setGlobalComment(e.target.value)}
        placeholder={config.globalPlaceholder}
        rows={3}
        className="w-full px-3 py-2 rounded-lg text-sm resize-y focus:outline-none"
        style={{
          background: "rgba(0, 0, 0, 0.3)",
          border: "1px solid var(--border-light)",
          color: "var(--foreground)",
          fontSize: "14px",
          letterSpacing: "-0.016em",
        }}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {config.hasButtons ? (
          config.hasButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => submit(btn.value)}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
              style={{
                background:
                  btn.value === "PUBLISH"
                    ? "#30d158"
                    : btn.value.startsWith("REVISE")
                      ? "#ffd60a"
                      : "var(--surface)",
                color:
                  btn.value === "PUBLISH" || btn.value.startsWith("REVISE")
                    ? "#000000"
                    : "var(--foreground)",
                border: btn.value === "MINOR_FIX" ? "1px solid var(--border-light)" : "none",
              }}
            >
              {btn.label}
            </button>
          ))
        ) : (
          <button
            onClick={() => submit()}
            disabled={submitting || !canSubmit}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              background: "var(--accent)",
              color: "#ffffff",
            }}
          >
            {submitting ? "送信中..." : "送信"}
          </button>
        )}
      </div>
    </div>
  );
}
