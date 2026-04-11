import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");
  if (token?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { run_id, decision_point, decision_type, content, chapter_selections } = body;

  const db = getSupabaseAdmin();

  // Upsert decision
  const { error } = await db.from("bdp_decisions").upsert(
    {
      run_id,
      decision_point,
      decision_type,
      content,
      chapter_selections: chapter_selections ?? null,
    },
    { onConflict: "run_id,decision_point" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update run status to running (pipeline will pick it up)
  await db.from("bdp_runs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", run_id);

  return NextResponse.json({ ok: true });
}
