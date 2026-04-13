#!/usr/bin/env npx tsx
/**
 * Drafts フォルダを監視し、変更があれば自動で Supabase に同期する。
 * 使い方: npm run sync:watch
 */

import { readFileSync, watch, statSync } from "fs";
import { readdir, readFile, stat } from "fs/promises";
import { join, basename, resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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
} catch { /* .env.local not found */ }

const DRAFTS_DIR =
  process.env.DRAFTS_DIR ??
  join(process.env.HOME!, "Projects/braindump-workspace/braindump/NotePublishing/Drafts");

const IDEAS_DIR =
  process.env.IDEAS_DIR ??
  join(process.env.HOME!, "Projects/braindump-workspace/braindump/NotePublishing/Ideas");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_KEY);

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

const PHASE_ORDER = [
  "phase1", "phase1_5", "phase2", "phase2_5", "phase3",
  "phase4", "phase5", "phase5_5", "phase6", "phase7",
];

const DECISION_PHASE: Record<string, number> = {
  phase1_5: 1, phase2: 2, phase3: 3, phase4: 4, phase5_5: 5,
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

async function syncRun(runId: string) {
  const runDir = join(DRAFTS_DIR, runId);
  try {
    const s = await stat(runDir);
    if (!s.isDirectory()) return;
  } catch { return; }

  const files = await readdir(runDir);
  const mdFiles = files.filter((f) => f.endsWith(".md"));
  if (mdFiles.length === 0) return;

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
    if (PHASE_ORDER.indexOf(phase) > PHASE_ORDER.indexOf(latestPhase)) latestPhase = phase;
    if (!articleType && (type === "structure" || type === "draft")) articleType = detectArticleType(content);
  }

  const nextPhaseIdx = PHASE_ORDER.indexOf(latestPhase) + 1;
  const nextPhase = PHASE_ORDER[nextPhaseIdx];
  const decisionPoint = DECISION_PHASE[latestPhase];
  const hasNextPhaseArtifact = artifacts.some(
    (a) => nextPhase && PHASE_ORDER.indexOf(a.phase) >= nextPhaseIdx
  );

  let runStatus: string;
  if (latestPhase === "phase7") runStatus = "completed";
  else if (decisionPoint && !hasNextPhaseArtifact) runStatus = "waiting_decision";
  else runStatus = "running";

  const title = await findTitle(runId);
  const latestMtime = artifacts.reduce(
    (max, a) => (a.mtime > max ? a.mtime : max),
    artifacts[0]?.mtime ?? new Date()
  );

  await db.from("bdp_runs").upsert(
    { id: runId, title, article_type: articleType, current_phase: latestPhase, status: runStatus, updated_at: latestMtime.toISOString() },
    { onConflict: "id" }
  );

  for (const a of artifacts) {
    await db.from("bdp_artifacts").upsert(
      { run_id: runId, artifact_type: a.type, phase: a.phase, content: a.content, updated_at: a.mtime.toISOString() },
      { onConflict: "run_id,artifact_type" }
    );
  }

  return { id: runId, status: runStatus, phase: latestPhase, artifacts: artifacts.length };
}

async function syncAll() {
  const entries = await readdir(DRAFTS_DIR);
  let count = 0;
  for (const entry of entries) {
    if (entry.startsWith(".") || entry === "ng-examples") continue;
    const result = await syncRun(entry);
    if (result) {
      console.log(`  ${result.id}: ${result.status} @ ${result.phase} (${result.artifacts} artifacts)`);
      count++;
    }
  }
  return count;
}

// Debounce: wait for writes to settle before syncing
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 2000;

function scheduleSync(reason: string) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const time = new Date().toLocaleTimeString("ja-JP");
    console.log(`\n[${time}] 変更検知: ${reason}`);
    try {
      const count = await syncAll();
      console.log(`[${time}] ${count}件 同期完了`);
    } catch (e) {
      console.error(`[${time}] 同期エラー:`, e);
    }
  }, DEBOUNCE_MS);
}

// Watch for new run directories
function watchDrafts() {
  const watchers = new Map<string, ReturnType<typeof watch>>();

  function watchRunDir(runId: string) {
    if (watchers.has(runId)) return;
    const dir = join(DRAFTS_DIR, runId);
    try {
      const s = statSync(dir);
      if (!s.isDirectory()) return;
    } catch { return; }

    const w = watch(dir, (event, filename) => {
      if (filename && filename.endsWith(".md")) {
        scheduleSync(`${runId}/${filename}`);
      }
    });
    watchers.set(runId, w);
  }

  // Watch the Drafts root for new run directories
  const rootWatcher = watch(DRAFTS_DIR, (event, filename) => {
    if (!filename || filename.startsWith(".") || filename === "ng-examples") return;
    const fullPath = join(DRAFTS_DIR, filename);
    try {
      const s = statSync(fullPath);
      if (s.isDirectory() && !watchers.has(filename)) {
        console.log(`  新しいRun検知: ${filename}`);
        watchRunDir(filename);
        scheduleSync(`新規ディレクトリ: ${filename}`);
      }
    } catch { /* deleted */ }
  });

  // Watch existing run directories
  try {
    const entries = require("fs").readdirSync(DRAFTS_DIR) as string[];
    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "ng-examples") continue;
      watchRunDir(entry);
    }
  } catch { /* ignore */ }

  // Cleanup on exit
  process.on("SIGINT", () => {
    rootWatcher.close();
    for (const w of watchers.values()) w.close();
    console.log("\n監視を終了しました。");
    process.exit(0);
  });
}

async function main() {
  console.log(`braindump-web sync:watch`);
  console.log(`監視対象: ${DRAFTS_DIR}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log("");

  // Initial sync
  console.log("初回同期...");
  const count = await syncAll();
  console.log(`${count}件 同期完了\n`);

  // Start watching
  console.log("ファイル監視を開始... (Ctrl+C で終了)");
  watchDrafts();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
