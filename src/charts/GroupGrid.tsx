import { STAGES, STAGE_LABEL, type Stage } from "../lib/types";
import { useTooltip } from "./Tooltip";

export interface GroupStat {
  group: number;
  counts: Record<Stage, number>;
  total: number;
}

const WEIGHT: Record<Stage, number> = { new: 0, learning: 0.25, young: 0.6, mastered: 1 };

function masteryScore(g: GroupStat) {
  return STAGES.reduce((s, k) => s + g.counts[k] * WEIGHT[k], 0) / (g.total || 1);
}

/** Heatmap of the 38 groups: darker blue means more of the group is mastered. */
export function GroupGrid({ stats, onPick }: { stats: GroupStat[]; onPick: (g: number) => void }) {
  const { ref, show, hide, node } = useTooltip();
  const describe = (g: GroupStat) => (
    <>
      <strong>Group {g.group}</strong> · {Math.round(masteryScore(g) * 100)}% mastery
      <br />
      {STAGES.filter((s) => g.counts[s]).map((s) => `${g.counts[s]} ${STAGE_LABEL[s].toLowerCase()}`).join(" · ")}
    </>
  );
  return (
    <div className="group-grid-wrap" ref={ref}>
      <div className="group-grid">
        {stats.map((g) => {
          const score = masteryScore(g);
          const step = score === 0 ? 0 : Math.min(6, 1 + Math.floor(score * 6));
          return (
            <button
              key={g.group}
              className={`tile seq-${step}`}
              onClick={() => onPick(g.group)}
              onPointerMove={(e) => show(e, describe(g))}
              onPointerLeave={hide}
              onFocus={(e) => show(e, describe(g))}
              onBlur={hide}
              aria-label={`Group ${g.group}, ${Math.round(score * 100)} percent mastery`}
            >
              {g.group}
            </button>
          );
        })}
      </div>
      <div className="scale-legend" aria-hidden>
        <span>0%</span>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span key={i} className={`scale-cell seq-${i}`} />
        ))}
        <span>100% mastered</span>
      </div>
      {node}
    </div>
  );
}
