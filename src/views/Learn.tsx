import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { WordDetail } from "../components/WordDetail";
import { playStory, stopStory, toggleStory } from "../lib/audio";
import { useApp } from "../lib/context";
import { go } from "../lib/router";
import { getProgress, grade, Rating, useProgress, type Grade } from "../lib/store";

/**
 * Study a group's new words one at a time: read the meaning, hear the story,
 * then say how well it stuck. The answer schedules the first review.
 */
export function Learn({ group }: { group: number }) {
  const { index } = useApp();
  const { settings } = useProgress();
  const words = index.byGroup.get(group) ?? [];
  // Fix the session list on entry so grading doesn't reshuffle it.
  const session = useMemo(() => {
    const cards = getProgress().cards;
    const fresh = words.filter((w) => !cards[w.id]);
    return { list: fresh.length ? fresh : words, browsing: fresh.length === 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group]);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Record<string, Grade>>({});
  const w = session.list[i];

  useEffect(() => {
    if (w && settings.autoplay && w.audio) playStory(w);
    return () => stopStory();
  }, [w, settings.autoplay]);

  const answer = (r: Grade) => {
    if (!w) return;
    if (!session.browsing) {
      grade(w.id, r);
      setResults((x) => ({ ...x, [w.id]: r }));
    }
    setI((n) => n + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!w || e.target instanceof HTMLInputElement) return;
      if (e.key === " ") {
        e.preventDefault();
        toggleStory(w);
      } else if (session.browsing && e.key === "ArrowRight") setI((n) => n + 1);
      else if (session.browsing && e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
      else if (!session.browsing && e.key === "1") answer(Rating.Again);
      else if (!session.browsing && e.key === "2") answer(Rating.Good);
      else if (!session.browsing && e.key === "3") answer(Rating.Easy);
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!w) {
    const ids = session.list.map((x) => x.id);
    const again = Object.values(results).filter((r) => r === Rating.Again).length;
    return (
      <div className="page center-page">
        <div className="done-card">
          <Icon name="check" size={40} />
          <h1>{session.browsing ? "Group reviewed" : `Group ${group}: ${session.list.length} words learned`}</h1>
          {!session.browsing && (
            <p className="muted">
              {again > 0
                ? `${again} word${again > 1 ? "s" : ""} will come back in a few minutes in Review.`
                : "Every word is scheduled for review."}{" "}
              Test yourself now while the stories are fresh. Recalling a word strengthens it far more than rereading it.
            </p>
          )}
          <div className="actions-row center">
            <button className="btn primary" onClick={() => go(`/quiz/ids/${ids.join(",")}`)}>
              <Icon name="quiz" /> Quiz these words
            </button>
            <button className="btn" onClick={() => go(`/group/${group}`)}>
              Back to group
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page learn">
      <div className="session-head">
        <button className="icon-btn" onClick={() => go(`/group/${group}`)} aria-label="Leave session">
          <Icon name="close" />
        </button>
        <div className="progress-track" aria-label={`Word ${i + 1} of ${session.list.length}`}>
          <div className="progress-fill" style={{ width: `${(i / session.list.length) * 100}%` }} />
        </div>
        <span className="muted small">
          {i + 1}/{session.list.length}
        </span>
      </div>
      <WordDetail w={w} key={w.id} />
      <div className="answer-bar">
        {session.browsing ? (
          <>
            <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>
              <Icon name="arrowLeft" /> Previous
            </button>
            <button className="btn primary" onClick={() => setI(i + 1)}>
              Next <Icon name="arrowRight" />
            </button>
          </>
        ) : (
          <>
            <button className="btn rate again" onClick={() => answer(Rating.Again)}>
              Need practice <kbd>1</kbd>
            </button>
            <button className="btn rate good" onClick={() => answer(Rating.Good)}>
              Got it <kbd>2</kbd>
            </button>
            <button className="btn rate easy" onClick={() => answer(Rating.Easy)}>
              Already knew it <kbd>3</kbd>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
