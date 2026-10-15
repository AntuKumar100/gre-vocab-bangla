import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { Meanings, WordBody, WordHeader } from "../components/WordDetail";
import { playStory, speak, stopStory, toggleStory } from "../lib/audio";
import { useApp } from "../lib/context";
import { go } from "../lib/router";
import { dueIds, getProgress, grade, previewIntervals, Rating, useProgress, type Grade } from "../lib/store";

const RATINGS: { r: Grade; label: string; cls: string }[] = [
  { r: Rating.Again, label: "Forgot", cls: "again" },
  { r: Rating.Hard, label: "Hard", cls: "hard" },
  { r: Rating.Good, label: "Good", cls: "good" },
  { r: Rating.Easy, label: "Easy", cls: "easy" },
];

/** Spaced-repetition review: recall first, then reveal and rate. */
export function Review() {
  const { index } = useApp();
  const { settings } = useProgress();
  const [queue, setQueue] = useState<string[]>(() => dueIds());
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const w = queue.length ? index.byId.get(queue[0]) : undefined;

  useEffect(() => {
    if (w && !settings.reverse) speak(w.word);
    return () => stopStory();
  }, [w, settings.reverse]);

  const reveal = () => {
    setRevealed(true);
    if (w && settings.autoplay && w.audio) playStory(w);
  };

  const answer = (r: Grade) => {
    if (!w) return;
    stopStory();
    grade(w.id, r);
    setDone((d) => d + 1);
    setRevealed(false);
    // Cards rated "Forgot" come back within minutes; pick up anything now due.
    const due = dueIds().filter((id) => id !== w.id);
    setQueue(due.length ? due : dueIds());
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!w) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) reveal();
        else toggleStory(w);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        answer(Number(e.key) as Grade);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!w) {
    const learning = Object.values(getProgress().cards).filter((c) => c.due.getTime() - Date.now() < 30 * 60000).length;
    return (
      <div className="page center-page">
        <div className="done-card">
          <Icon name="check" size={40} />
          <h1>{done ? `Done: ${done} reviews` : "Nothing due right now"}</h1>
          <p className="muted">
            {learning
              ? `${learning} word${learning > 1 ? "s" : ""} you just practised will be due again within half an hour.`
              : "Come back tomorrow. Short daily reviews are what move words into long-term memory."}
          </p>
          <div className="actions-row center">
            {learning > 0 && (
              <button className="btn" onClick={() => setQueue(dueIds())}>
                Check again
              </button>
            )}
            <button className="btn primary" onClick={() => go("/")}>
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const intervals = revealed ? previewIntervals(w.id) : null;
  return (
    <div className="page review">
      <div className="session-head">
        <button className="icon-btn" onClick={() => go("/")} aria-label="Leave review">
          <Icon name="close" />
        </button>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(done / (done + queue.length)) * 100}%` }} />
        </div>
        <span className="muted small">{queue.length} left</span>
      </div>

      <article className="flashcard">
        {settings.reverse ? (
          <div className="front reverse">
            <span className="muted small">Which word means…</span>
            <Meanings w={w} />
          </div>
        ) : (
          !revealed && (
            <div className="front">
              <h2 className="headword big">{w.word}</h2>
              <span className="pos">{w.pos}</span>
              <p className="muted small">Say the meaning out loud (English or Bangla), then check.</p>
            </div>
          )
        )}
        {revealed ? (
          <div className={settings.reverse ? "back" : ""}>
            <WordHeader w={w} big />
            <WordBody w={w} />
          </div>
        ) : (
          <button className="btn primary reveal" onClick={reveal}>
            Show answer <kbd>Space</kbd>
          </button>
        )}
      </article>

      {revealed && intervals && (
        <div className="answer-bar four">
          {RATINGS.map(({ r, label, cls }) => (
            <button key={r} className={`btn rate ${cls}`} onClick={() => answer(r)}>
              <span>{label}</span>
              <span className="interval">{intervals[r]}</span>
              <kbd>{r}</kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
