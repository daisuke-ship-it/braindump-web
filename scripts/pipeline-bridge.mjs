#!/usr/bin/env node
/**
 * pipeline-bridge.mjs — パイプライン ↔ Supabase 連携CLI
 *
 * Usage:
 *   node scripts/pipeline-bridge.mjs create-run --id "20260411-タイトル" --title "タイトル" --type 1
 *   node scripts/pipeline-bridge.mjs write-artifact --run-id "..." --type divergence-report --phase phase1_5 --file path/to/file.md
 *   node scripts/pipeline-bridge.mjs write-artifact --run-id "..." --type divergence-report --phase phase1_5 --content "markdown..."
 *   node scripts/pipeline-bridge.mjs set-waiting --run-id "..." --phase phase1_5 --decision-point 1
 *   node scripts/pipeline-bridge.mjs wait-decision --run-id "..." --decision-point 1
 *   node scripts/pipeline-bridge.mjs complete-run --run-id "..."
 *   node scripts/pipeline-bridge.mjs update-phase --run-id "..." --phase phase3
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env from braindump-web/.env.local
const envPath = resolve(new URL(".", import.meta.url).pathname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Parse args
const args = process.argv.slice(2);
const command = args[0];
const flags = {};
for (let i = 1; i < args.length; i += 2) {
  if (args[i].startsWith("--")) {
    flags[args[i].slice(2)] = args[i + 1];
  }
}

async function main() {
  switch (command) {
    case "create-run": {
      const { id, title, type } = flags;
      if (!id || !title) {
        console.error("Required: --id, --title");
        process.exit(1);
      }
      const { error } = await supabase.from("bdp_runs").insert({
        id,
        title,
        article_type: type ? Number(type) : null,
        current_phase: "phase1",
        status: "running",
      });
      if (error) throw error;
      console.log(`Created run: ${id}`);
      break;
    }

    case "write-artifact": {
      const { "run-id": runId, type, phase, file, content: rawContent } = flags;
      if (!runId || !type || !phase) {
        console.error("Required: --run-id, --type, --phase, and --file or --content");
        process.exit(1);
      }
      const content = file ? readFileSync(resolve(file), "utf-8") : rawContent;
      if (!content) {
        console.error("Provide --file or --content");
        process.exit(1);
      }
      const { error } = await supabase.from("bdp_artifacts").upsert(
        {
          run_id: runId,
          artifact_type: type,
          phase,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "run_id,artifact_type" }
      );
      if (error) throw error;
      console.log(`Wrote artifact: ${type} (${phase})`);
      break;
    }

    case "set-waiting": {
      const { "run-id": runId, phase, "decision-point": dp } = flags;
      if (!runId || !dp) {
        console.error("Required: --run-id, --decision-point");
        process.exit(1);
      }
      const update = {
        status: "waiting_decision",
        updated_at: new Date().toISOString(),
      };
      if (phase) update.current_phase = phase;
      const { error } = await supabase
        .from("bdp_runs")
        .update(update)
        .eq("id", runId);
      if (error) throw error;
      console.log(`Run ${runId} waiting for decision ${dp}`);
      break;
    }

    case "wait-decision": {
      const { "run-id": runId, "decision-point": dp, timeout: timeoutStr } = flags;
      if (!runId || !dp) {
        console.error("Required: --run-id, --decision-point");
        process.exit(1);
      }
      const timeoutMs = timeoutStr ? Number(timeoutStr) * 1000 : 3600000; // default 1h
      const start = Date.now();
      const point = Number(dp);

      process.stderr.write(`Waiting for decision ${dp}...`);
      while (Date.now() - start < timeoutMs) {
        const { data } = await supabase
          .from("bdp_decisions")
          .select("*")
          .eq("run_id", runId)
          .eq("decision_point", point)
          .single();

        if (data) {
          // Output decision as JSON to stdout
          console.log(JSON.stringify(data));
          return;
        }
        await new Promise((r) => setTimeout(r, 5000));
        process.stderr.write(".");
      }
      console.error("\nTimeout waiting for decision");
      process.exit(1);
    }

    case "update-phase": {
      const { "run-id": runId, phase } = flags;
      if (!runId || !phase) {
        console.error("Required: --run-id, --phase");
        process.exit(1);
      }
      const { error } = await supabase
        .from("bdp_runs")
        .update({
          current_phase: phase,
          status: "running",
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);
      if (error) throw error;
      console.log(`Updated phase: ${phase}`);
      break;
    }

    case "complete-run": {
      const { "run-id": runId } = flags;
      if (!runId) {
        console.error("Required: --run-id");
        process.exit(1);
      }
      const { error } = await supabase
        .from("bdp_runs")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", runId);
      if (error) throw error;
      console.log(`Completed run: ${runId}`);
      break;
    }

    default:
      console.error(
        "Commands: create-run, write-artifact, set-waiting, wait-decision, update-phase, complete-run"
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
