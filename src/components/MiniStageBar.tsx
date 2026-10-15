import { STAGES, type Stage } from "../lib/types";

export function MiniStageBar({ counts }: { counts: Record<Stage, number> }) {
  return (
    <div className="mini-bar" aria-hidden>
      {STAGES.map((s) => (counts[s] ? <span key={s} className={`stage-fill-${s}`} style={{ flexGrow: counts[s] }} /> : null))}
    </div>
  );
}
