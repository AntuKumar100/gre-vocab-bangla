import { STAGES, STAGE_LABEL, type Stage } from "../lib/types";
import { useTooltip } from "./Tooltip";

/** Stacked bar of how many words sit in each learning stage. */
export function StageBar({ counts }: { counts: Record<Stage, number> }) {
  const total = STAGES.reduce((s, k) => s + counts[k], 0) || 1;
  const { ref, show, hide, node } = useTooltip();
  return (
    <div className="stage-bar-wrap" ref={ref}>
      <div className="stage-bar" role="img" aria-label="Words by learning stage">
        {STAGES.map((s) =>
          counts[s] > 0 ? (
            <div
              key={s}
              className={`seg stage-fill-${s}`}
              style={{ flexGrow: counts[s] }}
              tabIndex={0}
              onPointerMove={(e) => show(e, `${STAGE_LABEL[s]}: ${counts[s]} words (${Math.round((counts[s] / total) * 100)}%)`)}
              onPointerLeave={hide}
              onFocus={(e) => show(e, `${STAGE_LABEL[s]}: ${counts[s]} words`)}
              onBlur={hide}
            />
          ) : null,
        )}
      </div>
      <ul className="legend">
        {STAGES.map((s) => (
          <li key={s}>
            <span className={`swatch stage-fill-${s}`} />
            {STAGE_LABEL[s]} <strong>{counts[s]}</strong>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}
