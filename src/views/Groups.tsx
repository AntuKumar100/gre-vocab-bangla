import { MiniStageBar } from "../components/MiniStageBar";
import { useApp } from "../lib/context";
import { go } from "../lib/router";
import { stageOf, useProgress } from "../lib/store";
import { STAGES, type Stage } from "../lib/types";

export function Groups() {
  const { index } = useApp();
  const { cards } = useProgress();
  return (
    <div className="page">
      <h1>Word groups</h1>
      <p className="muted">
        The list follows GregMAT's groups. Learn one group at a time, then let daily reviews keep it fresh.
      </p>
      <div className="group-cards">
        {index.groups.map((g) => {
          const words = index.byGroup.get(g)!;
          const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
          words.forEach((w) => counts[stageOf(cards[w.id])]++);
          const started = words.length - counts.new;
          return (
            <button key={g} className="group-card" onClick={() => go(`/group/${g}`)}>
              <div className="gc-top">
                <span className="gc-num">Group {g}</span>
                <span className="muted small">
                  {started}/{words.length}
                </span>
              </div>
              <span className="gc-words">{words.slice(0, 4).map((w) => w.word).join(", ")}…</span>
              <MiniStageBar counts={counts} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
