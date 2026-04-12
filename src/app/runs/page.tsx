import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PipelineRun } from "@/lib/types";
import { LogoutButton } from "@/components/logout-button";
import { RunsList } from "@/components/runs-list";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }

  const db = getSupabaseAdmin();
  const { data: runs } = await db
    .from("bdp_runs")
    .select("*")
    .order("updated_at", { ascending: false });

  const typedRuns = (runs ?? []) as PipelineRun[];

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold">パイプライン</h1>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <RunsList initialRuns={typedRuns} />
      </main>
    </div>
  );
}
