import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PipelineRun } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";
import { PublishQueue } from "@/components/publish-queue";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  const db = getSupabaseAdmin();
  const { data: runs } = await db
    .from("bdp_runs")
    .select("*")
    .eq("status", "completed")
    .order("publish_order", { ascending: true, nullsFirst: false });

  const typedRuns = (runs ?? []) as PipelineRun[];

  // Split into queued (has publish_order) and unqueued
  const queued = typedRuns
    .filter((r) => r.publish_order != null)
    .sort((a, b) => a.publish_order! - b.publish_order!);
  const unqueued = typedRuns.filter((r) => r.publish_order == null);

  return (
    <div className="flex flex-col min-h-full">
      <header
        className="sticky top-0 z-10 px-4 py-3"
        style={{
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/runs"
              className="text-sm transition-colors"
              style={{ color: "var(--link)", letterSpacing: "-0.016em" }}
            >
              &larr; 一覧
            </Link>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "21px",
                fontWeight: 600,
                lineHeight: 1.19,
                letterSpacing: "-0.01em",
              }}
            >
              投稿キュー
            </h1>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <PublishQueue initialQueued={queued} initialUnqueued={unqueued} />
      </main>
    </div>
  );
}
