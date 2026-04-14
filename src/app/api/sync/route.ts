import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readdir, readFile, stat } from "fs/promises";
import { join, basename } from "path";
import { createClient } from "@supabase/supabase-js";

const DRAFTS_DIR =
  process.env.DRAFTS_DIR ??
  join(
    process.env.HOME ?? "/tmp",
    "Projects/braindump-workspace/braindump/NotePublishing/Drafts"
  );

const IDEAS_DIR =
  process.env.IDEAS_DIR ??
  join(
    process.env.HOME ?? "/tmp",
    "Projects/braindump-workspace/braindump/NotePublishing/Ideas"
  );

const ARTIFACT_PHASE: Record<string, string> = {
  "phase1-melchior": "phase1",
  "phase1-balthasar": "phase1",
  "phase1-caspar": "phase1",
  "phase1-raziel": "phase1",
  "phase1-samael": "phase1",
  "divergence-report": "phase1_5",
  "material-picks": "phase1_5",
  structure: "phase2",
  enriched: "phase2_5",
  "chapter-selections": "phase3",
  draft: "phase4",
  draft_edit: "phase4",
  "density-review": "phase5",
  "voice-review": "phase5",
  "structure-review": "phase5",
  convergence: "phase5",
  "reader-feedback": "phase6",
  "reader-zero": "phase6",
  "reader-context": "phase6",
  output: "phase7",
  meta: "phase7",
  "pipeline-trace": "phase7",
};

const PHASE_ORDER = [
  "phase1", "phase1_5", "phase2", "phase2_5", "phase3",
  "phase4", "phase5", "phase6", "phase7",
];

const DECISION_PHASE: Record<string, number> = {
  phase1_5: 1, phase2: 2, phase3: 3, phase4: 4, phase5: 5,
};

function fileToArtifactType(filename: string, runId: string): string | null {
  const name = basename(filename, ".md");
  const suffix = name.replace(`-${runId}`, "").replace(`_${runId}`, "");
  const mappings: [RegExp, string][] = [
    [/^phase1-melchior/, "phase1-melchior"],
    [/^phase1-balthasar/, "phase1-balthasar"],
    [/^phase1-caspar/, "phase1-caspar"],
    [/^phase1-raziel/, "phase1-raziel"],
    [/^phase1-samael/, "phase1-samael"],
    [/^material-picks/, "material-picks"],
    [/^divergence-report/, "divergence-report"],
    [/^structure/, "structure"],
    [/^enriched/, "enriched"],
    [/^chapter-selections/, "chapter-selections"],
    [/^draft.*_edit$/, "draft_edit"],
    [/^draft/, "draft"],
    [/^density-review/, "density-review"],
    [/^voice-review/, "voice-review"],
    [/^structure-review/, "structure-review"],
    [/^convergence/, "convergence"],
    [/^reader-feedback/, "reader-feedback"],
    [/^reader-zero/, "reader-zero"],
    [/^reader-context/, "reader-context"],
    [/^pipeline-trace/, "pipeline-trace"],
    [/^output/, "output"],
    [/^meta/, "meta"],
  ];
  for (const [pattern, type] of mappings) {
    if (pattern.test(suffix)) return type;
  }
  return null;
}

async function findTitle(runId: string): Promise<string> {
  try {
    const files = await readdir(IDEAS_DIR);
    const datePrefix = runId.slice(0, 8);
    const formatted = `${datePrefix.slice(0, 4)}-${datePrefix.slice(4, 6)}-${datePrefix.slice(6, 8)}`;
    for (const f of files) {
      if (f.includes(formatted) && f.endsWith(".md")) {
        const content = await readFile(join(IDEAS_DIR, f), "utf-8");
        const summaryMatch = content.match(/## 要約\s*\n+[-•]\s*(.+)/);
        if (summaryMatch) return summaryMatch[1].trim();
        const headingMatch = content.match(/^#\s+(.+)/m);
        if (headingMatch) return headingMatch[1].trim();
      }
    }
  } catch { /* ignore */ }
  const slug = runId.replace(/^\d{8}-/, "");
  return slug.replace(/-/g, " ");
}

function detectArticleType(content: string): 1 | 2 | 3 | null {
  if (/型[1１]|構造を暴く/.test(content)) return 1;
  if (/型[2２]|実測で語る/.test(content)) return 2;
  if (/型[3３]|考えが変わった/.test(content)) return 3;
  return null;
}

export async function POST() {
  // Auth check
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");
  if (token?.value !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase 未設定" }, { status: 500 });
  }

  const db = createClient(supabaseUrl, supabaseKey);

  try {
    await stat(DRAFTS_DIR);
  } catch {
    return NextResponse.json(
      { error: "Drafts フォルダにアクセスできません。ローカル環境で npm run sync を実行してください。" },
      { status: 503 }
    );
  }

  const results: { id: string; status: string; phase: string; artifacts: number }[] = [];

  const entries = await readdir(DRAFTS_DIR);
  for (const entry of entries) {
    if (entry.startsWith(".") || entry === "ng-examples") continue;
    const dirPath = join(DRAFTS_DIR, entry);
    const s = await stat(dirPath);
    if (!s.isDirectory()) continue;

    const runId = entry;
    const files = await readdir(dirPath);
    const mdFiles = files.filter((f) => f.endsWith(".md"));
    if (mdFiles.length === 0) continue;

    const artifacts: { type: string; phase: string; content: string; mtime: Date }[] = [];
    let latestPhase = "phase1";
    let articleType: 1 | 2 | 3 | null = null;

    for (const f of mdFiles) {
      const type = fileToArtifactType(f, runId);
      if (!type) continue;
      const filePath = join(dirPath, f);
      const content = await readFile(filePath, "utf-8");
      const fileStat = await stat(filePath);
      const phase = ARTIFACT_PHASE[type] ?? "phase1";
      artifacts.push({ type, phase, content, mtime: fileStat.mtime });
      if (PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf(latestPhase)) {
        latestPhase = phase;
      }
      if (!articleType && (type === "structure" || type === "draft")) {
        articleType = detectArticleType(content);
      }
    }

    const nextPhaseIdx = PHASE_ORDER.indexOf(latestPhase) + 1;
    const nextPhase = PHASE_ORDER[nextPhaseIdx];
    const decisionPoint = DECISION_PHASE[latestPhase];
    const hasNextPhaseArtifact = artifacts.some(
      (a) => nextPhase && PHASE_ORDER.indexOf(a.phase) >= nextPhaseIdx
    );

    let runStatus: string;
    if (latestPhase === "phase7") {
      runStatus = "completed";
    } else if (decisionPoint && !hasNextPhaseArtifact) {
      runStatus = "waiting_decision";
    } else {
      runStatus = "running";
    }

    const title = await findTitle(runId);
    const latestMtime = artifacts.reduce(
      (max, a) => (a.mtime > max ? a.mtime : max),
      artifacts[0]?.mtime ?? new Date()
    );

    await db.from("bdp_runs").upsert(
      {
        id: runId,
        title,
        article_type: articleType,
        current_phase: latestPhase,
        status: runStatus,
        updated_at: latestMtime.toISOString(),
      },
      { onConflict: "id" }
    );

    for (const a of artifacts) {
      await db.from("bdp_artifacts").upsert(
        {
          run_id: runId,
          artifact_type: a.type,
          phase: a.phase,
          content: a.content,
          updated_at: a.mtime.toISOString(),
        },
        { onConflict: "run_id,artifact_type" }
      );
    }

    results.push({ id: runId, status: runStatus, phase: latestPhase, artifacts: artifacts.length });
  }

  return NextResponse.json({ ok: true, synced: results.length, runs: results });
}
