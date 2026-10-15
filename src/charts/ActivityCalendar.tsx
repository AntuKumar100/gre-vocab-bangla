import { today, type DayLog } from "../lib/store";
import { useTooltip } from "./Tooltip";

const WEEKS = 18;

/** GitHub-style calendar of reviews + quiz answers per day. */
export function ActivityCalendar({ days }: { days: Record<string, DayLog> }) {
  const { ref, show, hide, node } = useTooltip();
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - end.getDay() - (WEEKS - 1) * 7);
  const cells: { key: string; date: Date; count: number; future: boolean }[] = [];
  for (let d = new Date(start); cells.length < WEEKS * 7; d.setDate(d.getDate() + 1)) {
    const key = today(d);
    const log = days[key];
    cells.push({ key, date: new Date(d), count: log ? log.reviews + log.quiz : 0, future: d > end });
  }
  const max = Math.max(1, ...cells.map((c) => c.count));
  const label = (c: (typeof cells)[number]) => {
    const log = days[c.key];
    const date = c.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    if (!log) return `${date}: no study`;
    return `${date}: ${log.reviews} reviews, ${log.learned} new words, ${log.quiz} quiz answers`;
  };
  return (
    <div className="calendar-wrap" ref={ref}>
      <div className="calendar" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }} role="img" aria-label="Study activity over the last 18 weeks">
        {cells.map((c) => {
          const step = c.count === 0 ? 0 : Math.min(6, 1 + Math.floor((c.count / max) * 5.99));
          return (
            <span
              key={c.key}
              className={`day seq-${step}${c.future ? " future" : ""}`}
              onPointerMove={c.future ? undefined : (e) => show(e, label(c))}
              onPointerLeave={hide}
            />
          );
        })}
      </div>
      {node}
    </div>
  );
}
