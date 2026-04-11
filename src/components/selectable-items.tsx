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

export function SelectableItems({
  items,
  selected,
  onToggle,
  comments,
  onComment,
}: Props) {
  // Group items by agent
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
          <div className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1.5 px-1">
            {group.agent}
          </div>
          <div className="flex flex-col gap-1.5">
            {group.items.map((item) => {
              const isSelected = selected.has(item.id);
              return (
                <ItemCard
                  key={item.id}
                  item={item}
                  isSelected={isSelected}
                  onToggle={() => onToggle(item.id)}
                  comment={comments[item.id] ?? ""}
                  onComment={(text) => onComment(item.id, text)}
                />
              );
            })}
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
      className={`rounded-lg border transition ${
        isSelected
          ? "border-accent/50 bg-accent/8"
          : "border-border bg-surface hover:border-foreground/15"
      }`}
    >
      {/* Header: checkbox + title */}
      <div
        className="flex items-start gap-3 px-3 py-2.5 cursor-pointer"
        onClick={onToggle}
      >
        <div
          className={`mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center border transition ${
            isSelected
              ? "bg-accent border-accent"
              : "border-foreground/20 bg-transparent"
          }`}
        >
          {isSelected && <Check className="w-3.5 h-3.5 text-black" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{item.title}</div>
          {!expanded && (
            <div className="text-xs text-foreground/40 mt-0.5 line-clamp-2">
              {item.content.split("\n").filter(Boolean).slice(0, 2).join(" ")}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 px-3 pb-2">
        {item.content.split("\n").filter(Boolean).length > 2 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent/70 hover:text-accent"
          >
            {expanded ? "閉じる" : "詳細を見る"}
          </button>
        )}
        <button
          onClick={() => setShowComment(!showComment)}
          className={`text-xs flex items-center gap-1 transition ${
            comment
              ? "text-accent"
              : "text-foreground/30 hover:text-foreground/50"
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          {comment ? "コメントあり" : "コメント"}
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 ml-8 border-t border-border/50 pt-2">
          <MarkdownViewer content={item.content} />
        </div>
      )}

      {/* Per-item comment */}
      {showComment && (
        <div className="px-3 pb-3">
          <textarea
            value={comment}
            onChange={(e) => onComment(e.target.value)}
            placeholder="この項目へのコメント・指示..."
            rows={2}
            className="w-full px-2.5 py-1.5 rounded-md bg-background border border-border focus:border-accent focus:outline-none text-xs text-foreground resize-y"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
