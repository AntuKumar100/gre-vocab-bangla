import { Fragment } from "react";
import { seekStory, toggleStory, useStoryPlayer } from "../lib/audio";
import { wordPattern } from "../lib/data";
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

export function StoryPlayer({ w, compact = false }: { w: Word; compact?: boolean }) {
  const { playing, progress, error } = useStoryPlayer(w);
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
      {error && <span className="muted small">Audio unavailable</span>}
    </div>
  );
}
