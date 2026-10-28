import { Fragment, useState } from "react";
import { cycleRate, rewindStory, seekStory, toggleStory, useStoryPlayer } from "../lib/audio";
import { wordPattern } from "../lib/data";
import { useT } from "../lib/i18n";
import { useProgress } from "../lib/store";
import type { Word } from "../lib/types";
import { Icon } from "./Icon";

/** Story text with the headword highlighted wherever it (or an inflection) appears. */
export function Highlighted({ text, word }: { text: string; word: string }) {
  const parts = text.split(wordPattern(word));
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

/**
 * The story text. Its closing self-test ("So, what do you call...? ... Ad hoc.")
 * keeps the answer hidden until it is tapped or the narration reaches it.
 */
export function StoryText({ w }: { w: Word }) {
  const [shown, setShown] = useState(false);
  const { progress } = useStoryPlayer(w);
  const t = useT();
  const cut = w.story.lastIndexOf("...");
  if (cut < 0) return <Highlighted text={w.story} word={w.word} />;
  const answer = w.story.slice(cut + 3).trim();
  return (
    <>
      <Highlighted text={w.story.slice(0, cut)} word={w.word} />{" "}
      {shown || progress > 0.95 ? (
        <mark className="self-test-answer">{answer}</mark>
      ) : (
        <button
          className="self-test-reveal"
          onClick={(e) => {
            e.stopPropagation();
            setShown(true);
          }}
        >
          {t("Tap to see the answer")}
        </button>
      )}
    </>
  );
}

export function StoryPlayer({ w, compact = false }: { w: Word; compact?: boolean }) {
  const { playing, progress, error } = useStoryPlayer(w);
  const rate = useProgress().settings.audioRate;
  const t = useT();
  if (!w.audio) return compact ? null : <p className="muted small">Audio for this story is not generated yet.</p>;
  return (
    <div className={`player${compact ? " compact" : ""}`}>
      <button
        className="play-btn"
        onClick={(e) => {
          e.stopPropagation();
          toggleStory(w);
        }}
        aria-label={playing ? "Pause story" : "Play story"}
      >
        <Icon name={playing ? "pause" : "play"} size={compact ? 18 : 22} />
      </button>
      {!compact && (
        <div
          className="track"
          role="slider"
          aria-label="Story position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            seekStory((e.clientX - r.left) / r.width);
          }}
        >
          <div className="fill" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      {!compact && (
        <>
          <button className="icon-btn small" onClick={(e) => {
              e.stopPropagation();
              rewindStory();
            }} disabled={!progress} aria-label={t("Back 5 seconds")} title={t("Back 5 seconds")}>
            <Icon name="replay" size={20} />
          </button>
          <button className="rate-btn" onClick={(e) => {
              e.stopPropagation();
              cycleRate();
            }} aria-label={`${t("Story speed")}: ${rate}×`} title={t("Story speed")}>
            {Number(rate.toFixed(2))}×
          </button>
        </>
      )}
      {error && <span className="muted small">Audio unavailable</span>}
    </div>
  );
}
