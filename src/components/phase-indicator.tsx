import { PHASES } from "@/lib/types";

export function PhaseIndicator({ currentPhase }: { currentPhase: string }) {
  const currentIdx = PHASES.findIndex((p) => p.key === currentPhase);

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2">
      {PHASES.map((phase, i) => {
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <div key={phase.key} className="flex items-center gap-1 shrink-0">
            <div
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                background: isActive
                  ? "var(--accent)"
                  : isDone
                    ? "rgba(0, 113, 227, 0.4)"
                    : "rgba(255, 255, 255, 0.1)",
                boxShadow: isActive ? "0 0 8px rgba(0, 113, 227, 0.5)" : "none",
              }}
              title={phase.label}
            />
            {i < PHASES.length - 1 && (
              <div
                className="w-3 h-px"
                style={{
                  background: isDone
                    ? "rgba(0, 113, 227, 0.3)"
                    : "rgba(255, 255, 255, 0.1)",
                }}
              />
            )}
          </div>
        );
      })}
      <span
        className="ml-2 text-xs"
        style={{ color: "var(--text-tertiary)", letterSpacing: "-0.01em" }}
      >
        {PHASES[currentIdx]?.label ?? currentPhase}
      </span>
    </div>
  );
}
