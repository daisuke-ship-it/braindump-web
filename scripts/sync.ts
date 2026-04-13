#!/usr/bin/env npx tsx
/**
 * Drafts フォルダを読み取り、Supabase の bdp_runs / bdp_artifacts に同期する。
 * 使い方: npm run sync
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "fs/promises";
import { join, basename, resolve } from "path";

// Load .env.local
const envPath = resolve(new URL(".", import.meta.url).pathname, "../.env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
} catch {
  // .env.local not found, rely on existing env
}

const DRAFTS_DIR =
  process.env.DRAFTS_DIR ??
  join(
    process.env.HOME!,
    "Projects/braindump-workspace/braindump/NotePublishing/Drafts"
  );

const IDEAS_DIR =
  process.env.IDEAS_DIR ??
  join(
    process.env.HOME!,
    "Projects/braindump-workspace/braindump/NotePublishing/Ideas"
  );

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY. Run from project root (reads .env.local).");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Artifact type → phase mapping
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
  convergence: "phase5_5",
  "reader-feedback": "phase6",
  "reader-zero": "phase6",
  "reader-context": "phase6",
  output: "phase7",
  meta: "phase7",
  "pipeline-trace": "phase7",
};

// Phase ordering for determining current phase
const PHASE_ORDER = [
  "phase1",
  "phase1_5",
  "phase2",
  "phase2_5",
  "phase3",
  "phase4",
  "phase5",
  "phase5_5",
  "phase6",
  "phase7",
];

// Decision points that require human input
const DECISION_PHASE: Record<string, number> = {
  phase1_5: 1,
  phase2: 2,
  phase3: 3,
  phase4: 4,
  phase5_5: 5,
};

// Map filename pattern to artifact type
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

// Try to find the idea file and extract title
async function findTitle(runId: string): Promise<string> {
  try {
    const files = await readdir(IDEAS_DIR);
    // Look for idea files that might match the run date
    const datePrefix = runId.slice(0, 8); // e.g. "20260413"
    const formatted = `${datePrefix.slice(0, 4)}-${datePrefix.slice(4, 6)}-${datePrefix.slice(6, 8)}`;

    for (const f of files) {
      if (f.includes(formatted) && f.endsWith(".md")) {
        const content = await readFile(join(IDEAS_DIR, f), "utf-8");
        // Extract title from ## 要約 or first heading
        const summaryMatch = content.match(/## 要約\s*\n+[-•]\s*(.+)/);
        if (summaryMatch) return summaryMatch[1].trim();
        const headingMatch = content.match(/^#\s+(.+)/m);
        if (headingMatch) return headingMatch[1].trim();
      }
    }
  } catch {
    // ignore
  }

  // Fallback: use the run ID slug
  const slug = runId.replace(/^\d{8}-/, "");
  return slug.replace(/-/g, " ");
}

// Determine article type from structure/draft content
function detectArticleType(content: string): 1 | 2 | 3 | null {
  if (/型[1１]|構造を暴く/.test(content)) return 1;
  if (/型[2２]|実測で語る/.test(content)) return 2;
  if (/型[3３]|考えが変わった/.test(content)) return 3;
  return null;
}

async function syncRun(runDir: string) {
  const runId = basename(runDir);

  // Skip non-run directories
  if (runId.startsWith(".") || runId === "ng-examples") return;

  const files = await readdir(runDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));

  if (mdFiles.length === 0) return;

  // Parse artifacts
  const artifacts: { type: string; phase: string; content: string; mtime: Date }[] = [];
  let latestPhase = "phase1";
  let articleType: 1 | 2 | 3 | null = null;

  for (const f of mdFiles) {
    const type = fileToArtifactType(f, runId);
    if (!type) continue;

    const filePath = join(runDir, f);
    const content = await readFile(filePath, "utf-8");
    const fileStat = await stat(filePath);
    const phase = ARTIFACT_PHASE[type] ?? "phase1";

    artifacts.push({ type, phase, content, mtime: fileStat.mtime });

    // Track latest phase
    if (PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf(latestPhase)) {
      latestPhase = phase;
    }

    // Detect article type
    if (!articleType && (type === "structure" || type === "draft")) {
      articleType = detectArticleType(content);
    }
  }

  // Determine status
  const nextPhaseIdx = PHASE_ORDER.indexOf(latestPhase) + 1;
  const nextPhase = PHASE_ORDER[nextPhaseIdx];
  const decisionPoint = DECISION_PHASE[latestPhase];
  // If current phase has a decision point and next phase artifacts don't exist yet
  const hasNextPhaseArtifact = artifacts.some(
    (a) => nextPhase && PHASE_ORDER.indexOf(a.phase) >= nextPhaseIdx
  );

  let status: string;
  let currentPhase: string;

  if (latestPhase === "phase7") {
    status = "completed";
    currentPhase = "phase7";
  } else if (decisionPoint && !hasNextPhaseArtifact) {
    status = "waiting_decision";
    currentPhase = latestPhase;
  } else {
    status = "running";
    currentPhase = latestPhase;
  }

  const title = await findTitle(runId);
  const latestMtime = artifacts.reduce(
    (max, a) => (a.mtime > max ? a.mtime : max),
    artifacts[0]?.mtime ?? new Date()
  );

  // Upsert run
  const { error: runError } = await db.from("bdp_runs").upsert(
    {
      id: runId,
      title,
      article_type: articleType,
      current_phase: currentPhase,
      status,
      updated_at: latestMtime.toISOString(),
    },
    { onConflict: "id" }
  );

  if (runError) {
    console.error(`  [ERROR] bdp_runs upsert: ${runError.message}`);
    return;
  }

  // Sync artifacts via upsert (unique constraint: run_id + artifact_type)
  let synced = 0;
  for (const a of artifacts) {
    const { error } = await db.from("bdp_artifacts").upsert(
      {
        run_id: runId,
        artifact_type: a.type,
        phase: a.phase,
        content: a.content,
        updated_at: a.mtime.toISOString(),
      },
      { onConflict: "run_id,artifact_type" }
    );
    if (error) {
      console.error(`  [ERROR] artifact ${a.type}: ${error.message}`);
    } else {
      synced++;
    }
  }

  console.log(
    `  ${runId}: ${status} @ ${currentPhase} (${synced}/${artifacts.length} artifacts)`
  );
}

async function main() {
  console.log(`Syncing from ${DRAFTS_DIR}`);

  const entries = await readdir(DRAFTS_DIR);
  for (const entry of entries) {
    const dirPath = join(DRAFTS_DIR, entry);
    const s = await stat(dirPath);
    if (s.isDirectory()) {
      await syncRun(dirPath);
    }
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
