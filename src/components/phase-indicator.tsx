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
              className={`w-2.5 h-2.5 rounded-full transition ${
                isActive
                  ? "bg-accent shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                  : isDone
                    ? "bg-accent/40"
                    : "bg-foreground/10"
              }`}
              title={phase.label}
            />
            {i < PHASES.length - 1 && (
              <div
                className={`w-3 h-px ${isDone ? "bg-accent/30" : "bg-foreground/10"}`}
              />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-xs text-foreground/40">
        {PHASES[currentIdx]?.label ?? currentPhase}
      </span>
    </div>
  );
}
