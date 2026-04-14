"use client";

import { useState, useRef } from "react";
import { PipelineRun, ARTICLE_TYPES } from "@/lib/types";
import { GripVertical, Plus, X, Check } from "lucide-react";
import Link from "next/link";

type Props = {
  initialQueued: PipelineRun[];
  initialUnqueued: PipelineRun[];
};

export function PublishQueue({ initialQueued, initialUnqueued }: Props) {
  const [queued, setQueued] = useState(initialQueued);
  const [unqueued, setUnqueued] = useState(initialUnqueued);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  function addToQueue(run: PipelineRun) {
    setUnqueued((prev) => prev.filter((r) => r.id !== run.id));
    setQueued((prev) => [...prev, run]);
    setDirty(true);
  }

  function removeFromQueue(run: PipelineRun) {
    setQueued((prev) => prev.filter((r) => r.id !== run.id));
    setUnqueued((prev) => [...prev, run]);
    setDirty(true);
  }

  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const items = [...queued];
    const [dragged] = items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, dragged);
    setQueued(items);
    dragItem.current = null;
    dragOverItem.current = null;
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    const order = queued.map((r) => r.id);
    const clear = unqueued
      .filter((r) => r.publish_order != null)
      .map((r) => r.id);

    const res = await fetch("/api/publish-order", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, clear }),
    });

    if (res.ok) {
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Queued */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-xs font-medium uppercase"
            style={{ color: "var(--text-tertiary)", letterSpacing: "0.05em" }}
          >
            投稿順（上から順に投稿）
          </h2>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs flex items-center gap-1" style={{ color: "#30d158" }}>
                <Check className="w-3 h-3" />
                保存済み
              </span>
            )}
            {dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-opacity disabled:opacity-50"
                style={{ background: "var(--accent)", color: "#ffffff" }}
              >
                {saving ? "保存中..." : "保存"}
              </button>
            )}
          </div>
        </div>

        {queued.length === 0 ? (
          <div
            className="rounded-xl py-8 text-center text-sm"
            style={{
              background: "var(--surface)",
              color: "var(--text-tertiary)",
              border: "1px dashed var(--border-light)",
            }}
          >
            下の完了記事を追加してください
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {queued.map((run, index) => (
              <div
                key={run.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-3 rounded-xl cursor-grab active:cursor-grabbing transition-all"
                style={{
                  background: "var(--surface)",
                  padding: "12px 16px",
                }}
              >
                <span
                  className="text-sm font-medium shrink-0 w-6 text-center"
                  style={{ color: "var(--accent)" }}
                >
                  {index + 1}
                </span>
                <GripVertical
                  className="w-4 h-4 shrink-0"
                  style={{ color: "var(--text-tertiary)" }}
                />
                <Link
                  href={`/runs/${encodeURIComponent(run.id)}`}
                  className="flex-1 min-w-0"
                >
                  <span
                    className="block truncate"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.016em",
                    }}
                  >
                    {run.title}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {run.article_type ? ARTICLE_TYPES[run.article_type] : ""}{" "}
                    {new Date(run.updated_at).toLocaleDateString("ja-JP")}
                  </span>
                </Link>
                <button
                  onClick={() => removeFromQueue(run)}
                  className="shrink-0 p-1 rounded-full transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  title="キューから外す"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Unqueued completed runs */}
      {unqueued.length > 0 && (
        <section>
          <h2
            className="text-xs font-medium uppercase mb-3"
            style={{ color: "var(--text-tertiary)", letterSpacing: "0.05em" }}
          >
            完了（未キュー）
          </h2>
          <div className="flex flex-col gap-1.5">
            {unqueued.map((run) => (
              <div
                key={run.id}
                className="flex items-center gap-3 rounded-xl"
                style={{
                  background: "var(--surface-2)",
                  padding: "12px 16px",
                }}
              >
                <Link
                  href={`/runs/${encodeURIComponent(run.id)}`}
                  className="flex-1 min-w-0"
                >
                  <span
                    className="block truncate"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "15px",
                      fontWeight: 600,
                      letterSpacing: "-0.016em",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {run.title}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    {run.article_type ? ARTICLE_TYPES[run.article_type] : ""}{" "}
                    {new Date(run.updated_at).toLocaleDateString("ja-JP")}
                  </span>
                </Link>
                <button
                  onClick={() => addToQueue(run)}
                  className="shrink-0 p-1.5 rounded-full transition-colors"
                  style={{ color: "var(--accent)" }}
                  title="キューに追加"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
