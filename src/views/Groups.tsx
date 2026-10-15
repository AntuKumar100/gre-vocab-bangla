import { Icon } from "../components/Icon";
import { MiniStageBar } from "../components/MiniStageBar";
import { useApp } from "../lib/context";
import { go } from "../lib/router";
import { stageOf, useProgress } from "../lib/store";
import { STAGES, type Stage } from "../lib/types";

/** Horizontal offsets (in node widths) that make the path snake left and right. */
const WAVE = [0, 0.7, 1.1, 0.7, 0, -0.7, -1.1, -0.7];

export function Groups() {
  const { index } = useApp();
  const { cards } = useProgress();
  const stats = index.groups.map((g) => {
    const words = index.byGroup.get(g)!;
    const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
    words.forEach((w) => counts[stageOf(cards[w.id])]++);
    return { g, words, counts, started: words.length - counts.new };
  });
  const current = stats.find((s) => s.counts.new > 0)?.g;

  return (
    <div className="page">
      <div className="page-hero groups">
        <div>
          <h1>Your quest</h1>
          <p>38 groups from GregMAT's list. Clear one group at a time; the ring fills as you learn and turns gold as words are mastered.</p>
        </div>
        <Icon name="crown" size={64} />
      </div>
      <ol className="quest-path">
        {stats.map(({ g, words, counts, started }, k) => {
          const learnedFrac = started / words.length;
          const masteredFrac = counts.mastered / words.length;
          const state = masteredFrac === 1 ? "mastered" : g === current ? "current" : started === words.length ? "cleared" : started > 0 ? "started" : "todo";
          const C = 2 * Math.PI * 44;
          return (
            <li key={g} className={`quest-step ${state}`} style={{ ["--x" as string]: WAVE[k % WAVE.length] }}>
              <button className="quest-node" onClick={() => go(`/group/${g}`)} aria-label={`Group ${g}: ${started} of ${words.length} started`}>
                <svg viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r="44" className="qn-track" />
                  {learnedFrac > 0 && <circle cx="50" cy="50" r="44" className="qn-learned" strokeDasharray={C} strokeDashoffset={C * (1 - learnedFrac)} />}
                  {masteredFrac > 0 && <circle cx="50" cy="50" r="44" className="qn-mastered" strokeDasharray={C} strokeDashoffset={C * (1 - masteredFrac)} />}
                </svg>
                <span className="qn-face">{state === "mastered" ? <Icon name="crown" size={28} /> : g}</span>
                {state === "current" && <span className="qn-start">{started ? "Continue" : "Start"}</span>}
              </button>
              <button className="quest-info" onClick={() => go(`/group/${g}`)} tabIndex={-1} aria-hidden>
                <span className="qi-title">Group {g}</span>
                <span className="qi-words">{words.slice(0, 3).map((w) => w.word).join(" · ")}</span>
                <MiniStageBar counts={counts} />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
