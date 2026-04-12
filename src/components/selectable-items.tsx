"use client";

import { useState } from "react";
import { SelectableItem } from "@/lib/parse-sections";
import { MarkdownViewer } from "./markdown-viewer";
import { Check, MessageSquare } from "lucide-react";

type Props = {
  items: SelectableItem[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  comments: Record<string, string>;
  onComment: (id: string, text: string) => void;
};

export function SelectableItems({ items, selected, onToggle, comments, onComment }: Props) {
  const grouped: { agent: string; items: SelectableItem[] }[] = [];
  for (const item of items) {
    const last = grouped[grouped.length - 1];
    if (last && last.agent === item.agent) {
      last.items.push(item);
    } else {
      grouped.push({ agent: item.agent, items: [item] });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {grouped.map((group) => (
        <div key={group.agent}>
          <div
            className="text-xs font-semibold uppercase mb-1.5 px-1"
            style={{ color: "var(--text-tertiary)", letterSpacing: "0.05em" }}
          >
            {group.agent}
          </div>
          <div className="flex flex-col gap-1.5">
            {group.items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                isSelected={selected.has(item.id)}
                onToggle={() => onToggle(item.id)}
                comment={comments[item.id] ?? ""}
                onComment={(text) => onComment(item.id, text)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemCard({
  item,
  isSelected,
  onToggle,
  comment,
  onComment,
}: {
  item: SelectableItem;
  isSelected: boolean;
  onToggle: () => void;
  comment: string;
  onComment: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showComment, setShowComment] = useState(!!comment);

  return (
    <div
      className="rounded-lg transition-all"
      style={{
        background: isSelected ? "rgba(0, 113, 227, 0.06)" : "var(--surface-2)",
        border: isSelected ? "1px solid rgba(0, 113, 227, 0.3)" : "1px solid var(--border)",
      }}
    >
      <div className="flex items-start gap-3 px-3 py-2.5 cursor-pointer" onClick={onToggle}>
        <div
          className="mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all"
          style={{
            background: isSelected ? "var(--accent)" : "transparent",
            border: isSelected ? "1px solid var(--accent)" : "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          {isSelected && <Check className="w-3.5 h-3.5" style={{ color: "#ffffff" }} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium" style={{ letterSpacing: "-0.016em" }}>
            {item.title}
          </div>
          {!expanded && (
            <div
              className="text-xs mt-0.5 line-clamp-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              {item.content.split("\n").filter(Boolean).slice(0, 2).join(" ")}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 pb-2">
        {item.content.split("\n").filter(Boolean).length > 2 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs transition-colors"
            style={{ color: "var(--link)" }}
          >
            {expanded ? "閉じる" : "詳細を見る"}
          </button>
        )}
        <button
          onClick={() => setShowComment(!showComment)}
          className="text-xs flex items-center gap-1 transition-colors"
          style={{ color: comment ? "var(--accent)" : "var(--text-tertiary)" }}
        >
          <MessageSquare className="w-3 h-3" />
          {comment ? "コメントあり" : "コメント"}
        </button>
      </div>

      {expanded && (
        <div
          className="px-3 pb-3 ml-8 pt-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <MarkdownViewer content={item.content} />
        </div>
      )}

      {showComment && (
        <div className="px-3 pb-3">
          <textarea
            value={comment}
            onChange={(e) => onComment(e.target.value)}
            placeholder="この項目へのコメント・指示..."
            rows={2}
            className="w-full px-2.5 py-1.5 rounded-md text-xs resize-y focus:outline-none"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
