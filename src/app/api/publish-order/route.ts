import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");
  if (token?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = (await request.json()) as { order: string[]; clear?: string[] };
  if (!Array.isArray(body.order)) {
    return NextResponse.json({ error: "invalid order" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  // Set publish_order for queued items
  for (let i = 0; i < body.order.length; i++) {
    await db
      .from("bdp_runs")
      .update({ publish_order: i + 1 })
      .eq("id", body.order[i]);
  }

  // Clear publish_order for removed items
  if (body.clear && body.clear.length > 0) {
    for (const id of body.clear) {
      await db
        .from("bdp_runs")
        .update({ publish_order: null })
        .eq("id", id);
    }
  }

  return NextResponse.json({ ok: true });
}
