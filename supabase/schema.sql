-- braindump pipeline tables (bdp_ prefix)

CREATE TABLE bdp_runs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  idea_file TEXT,
  article_type INTEGER CHECK (article_type IN (1, 2, 3)),
  current_phase TEXT NOT NULL DEFAULT 'phase1',
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'waiting_decision', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bdp_artifacts (
  id SERIAL PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES bdp_runs(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  content TEXT NOT NULL,
  phase TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(run_id, artifact_type)
);

CREATE TABLE bdp_decisions (
  id SERIAL PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES bdp_runs(id) ON DELETE CASCADE,
  decision_point INTEGER NOT NULL CHECK (decision_point BETWEEN 1 AND 5),
  decision_type TEXT,
  content TEXT,
  chapter_selections JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(run_id, decision_point)
);

CREATE INDEX idx_bdp_runs_status ON bdp_runs(status);
CREATE INDEX idx_bdp_artifacts_run ON bdp_artifacts(run_id);
CREATE INDEX idx_bdp_decisions_run ON bdp_decisions(run_id);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE bdp_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE bdp_artifacts;
ALTER PUBLICATION supabase_realtime ADD TABLE bdp_decisions;
