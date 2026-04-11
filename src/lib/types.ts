export type PipelineRun = {
  id: string;
  title: string;
  idea_file: string | null;
  article_type: 1 | 2 | 3 | null;
  current_phase: string;
  status: "running" | "waiting_decision" | "completed" | "failed";
  created_at: string;
  updated_at: string;
};

export type PipelineArtifact = {
  id: number;
  run_id: string;
  artifact_type: string;
  content: string;
  phase: string;
  created_at: string;
  updated_at: string;
};

export type PipelineDecision = {
  id: number;
  run_id: string;
  decision_point: 1 | 2 | 3 | 4 | 5;
  decision_type: string | null;
  content: string | null;
  chapter_selections: Record<string, string> | null;
  created_at: string;
};

export const PHASES = [
  { key: "phase1", label: "発散", description: "4体並行" },
  { key: "phase1_5", label: "統合", description: "divergence-report" },
  { key: "phase2", label: "構成", description: "structure" },
  { key: "phase2_5", label: "検証", description: "enriched" },
  { key: "phase3", label: "スケッチ", description: "chapter patterns" },
  { key: "phase4", label: "執筆", description: "draft" },
  { key: "phase5", label: "品質評価", description: "3体並行" },
  { key: "phase5_5", label: "統合判定", description: "convergence" },
  { key: "phase6", label: "読者", description: "reader feedback" },
  { key: "phase7", label: "出版", description: "publisher" },
] as const;

export const DECISION_PHASES: Record<number, string> = {
  1: "phase1_5",
  2: "phase2",
  3: "phase3",
  4: "phase4",
  5: "phase5_5",
};

export const ARTICLE_TYPES: Record<number, string> = {
  1: "構造を暴く",
  2: "実測で語る",
  3: "考えが変わった",
};
