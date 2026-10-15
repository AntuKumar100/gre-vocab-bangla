import { useEffect } from "react";
import { Icon } from "../components/Icon";
import { StoryPlayer } from "../components/Story";
import { rowProps } from "../lib/a11y";
import { playAll, stopStory, usePlayerState } from "../lib/audio";
import { useApp } from "../lib/context";
import { go } from "../lib/router";
import { stageOf, useProgress } from "../lib/store";
import { STAGE_LABEL } from "../lib/types";

export function GroupView({ group }: { group: number }) {
  const { index, openWord } = useApp();
  const { cards } = useProgress();
  const player = usePlayerState();
  const words = index.byGroup.get(group);
  useEffect(() => {
    if (player.listening && player.id) document.getElementById(`row-${player.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [player.id, player.listening]);
  if (!words) return <div className="page">No such group.</div>;
  const newCount = words.filter((w) => !cards[w.id]).length;
  const prev = index.groups[index.groups.indexOf(group) - 1];
  const next = index.groups[index.groups.indexOf(group) + 1];
  return (
    <div className="page">
      <div className="page-head">
        <button className="icon-btn" onClick={() => go("/groups")} aria-label="All groups">
          <Icon name="arrowLeft" />
        </button>
        <h1>Group {group}</h1>
        <div className="spacer" />
        {prev !== undefined && (
          <button className="btn ghost" onClick={() => go(`/group/${prev}`)}>
            ‹ {prev}
          </button>
        )}
        {next !== undefined && (
          <button className="btn ghost" onClick={() => go(`/group/${next}`)}>
            {next} ›
          </button>
        )}
      </div>
      <div className="actions-row">
        <button className="btn primary" onClick={() => go(`/learn/${group}`)}>
          <Icon name="book" /> {newCount ? `Learn ${newCount} new words` : "Study again"}
        </button>
        <button className="btn" onClick={() => go(`/quiz/group/${group}`)}>
          <Icon name="quiz" /> Quiz this group
        </button>
        <button className="btn" onClick={() => go(`/map/${group}`)}>
          <Icon name="network" /> Synonym map
        </button>
        {player.listening > 0 ? (
          <button className="btn" onClick={stopStory}>
            <Icon name="pause" /> Stop listening ({player.listening} left)
          </button>
        ) : (
          <button className="btn" onClick={() => playAll(words)}>
            <Icon name="speaker" /> Listen to all stories
          </button>
        )}
      </div>
      <ul className="word-list">
        {words.map((w) => {
          const stage = stageOf(cards[w.id]);
          return (
            <li key={w.id} id={`row-${w.id}`} className={`word-row${player.id === w.id && player.listening ? " now-playing" : ""}`} {...rowProps(() => openWord(w.id))}>
              <div className="wr-main">
                <span className="wr-word">{w.word}</span>
                <span className="wr-en">{w.en}</span>
                <span className="wr-bn" lang="bn">
                  {w.bn}
                </span>
              </div>
              <span className={`stage-dot stage-fill-${stage}`} title={STAGE_LABEL[stage]} />
              <StoryPlayer w={w} compact />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
