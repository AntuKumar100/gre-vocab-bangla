import { useTooltip } from "./Tooltip";

/** Reviews coming due on each of the next days (day 0 includes anything overdue). */
export function ForecastBars({ counts }: { counts: number[] }) {
  const { ref, show, hide, node } = useTooltip();
  const max = Math.max(1, ...counts);
  const W = 320;
  const H = 120;
  const pad = { l: 4, r: 4, t: 8, b: 20 };
  const bw = (W - pad.l - pad.r) / counts.length;
  const dayName = (i: number) => {
    if (i === 0) return "Today";
    if (i === 1) return "Tomorrow";
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  };
  return (
    <div className="forecast-wrap" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="forecast" role="img" aria-label="Reviews due over the next two weeks">
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="axis" />
        {counts.map((c, i) => {
          const h = ((H - pad.t - pad.b) * c) / max;
          const x = pad.l + i * bw + 1;
          const w = Math.max(2, bw - 2);
          const y = H - pad.b - h;
          const r = Math.min(4, w / 2, h);
          return (
            <g key={i}>
              {c > 0 && (
                <path
                  className="bar"
                  d={`M${x},${H - pad.b} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${H - pad.b} Z`}
                />
              )}
              <rect
                x={pad.l + i * bw}
                y={pad.t}
                width={bw}
                height={H - pad.t - pad.b}
                fill="transparent"
                onPointerMove={(e) => show(e, `${dayName(i)}: ${c} reviews due`)}
                onPointerLeave={hide}
              />
              {(i === 0 || i % 7 === 0) && (
                <text x={x + w / 2} y={H - 6} className="tick" textAnchor="middle">
                  {i === 0 ? "Today" : `+${i}d`}
                </text>
              )}
            </g>
          );
        })}
        <text x={W - pad.r} y={pad.t + 2} className="tick" textAnchor="end">
          max {max}
        </text>
      </svg>
      {node}
    </div>
  );
}
