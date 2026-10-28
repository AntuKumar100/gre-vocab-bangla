import { speak } from "../lib/audio";
import { reportUrl } from "../lib/brand";
import { useApp } from "../lib/context";
import { useT } from "../lib/i18n";
import { stageOf, toggleStar, useProgress } from "../lib/store";
import { STAGE_LABEL, type Word } from "../lib/types";
import { Icon } from "./Icon";
import { Highlighted, StoryPlayer, StoryText } from "./Story";

export function WordHeader({ w, big = false }: { w: Word; big?: boolean }) {
  const { cards, starred } = useProgress();
  const stage = stageOf(cards[w.id]);
  const isStarred = starred.includes(w.id);
  const t = useT();
  return (
    <div className="word-head">
      <div>
        <h2 className={big ? "headword big" : "headword"}>{w.word}</h2>
        <div className="meta">
          <span className="pos">{w.pos}</span>
          <span className={`stage-pill stage-${stage}`}>{STAGE_LABEL[stage]}</span>
          <span className="muted small">Set {w.group}</span>
        </div>
      </div>
      <div className="head-actions">
        <button className="icon-btn" onClick={() => speak(w)} aria-label={`Pronounce ${w.word}`} title="Pronounce">
          <Icon name="speaker" />
        </button>
        <button
          className={`icon-btn${isStarred ? " starred" : ""}`}
          onClick={() => toggleStar(w.id)}
          aria-label={isStarred ? "Remove from difficult words" : "Mark as difficult"}
          title={isStarred ? "Unmark" : "Mark as difficult"}
        >
          <Icon name={isStarred ? "star" : "starOutline"} />
        </button>
        <a
          className="icon-btn"
          href={reportUrl(w.word)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t("Report a mistake")}: ${w.word}`}
          title={t("Report a mistake")}
        >
          <Icon name="flag" />
        </a>
      </div>
    </div>
  );
}

export function Meanings({ w }: { w: Word }) {
  return (
    <div className="meanings">
      <p className="en">{w.en}</p>
      <p className="bn" lang="bn">
        {w.bn}
      </p>
    </div>
  );
}

export function WordBody({ w }: { w: Word }) {
  const { byWord, openWord } = useApp();
  const t = useT();
  return (
    <>
      <Meanings w={w} />
      <div className="hook">
        <Icon name="bulb" size={18} />
        <span>{w.hook}</span>
      </div>
      <section className="story">
        <div className="story-head">
          <h3>{t("Story")}</h3>
          <StoryPlayer w={w} />
        </div>
        <p>
          <StoryText w={w} key={w.id} />
        </p>
      </section>
      {w.synonyms.length > 0 && (
        <div className="syns">
          <span className="label">{t("Synonyms")}</span>
          {w.synonyms.map((s) => {
            const ids = byWord.get(s.toLowerCase());
            return ids ? (
              <button key={s} className="chip link" onClick={() => openWord(ids[0])} title="Also on the list">
                {s}
              </button>
            ) : (
              <span key={s} className="chip">
                {s}
              </span>
            );
          })}
        </div>
      )}
      {w.example && (
        <p className="example">
          <span className="label">{t("Example")}</span>
          <Highlighted text={w.example} word={w.word} />
        </p>
      )}
    </>
  );
}

export function WordDetail({ w }: { w: Word }) {
  return (
    <article className="word-detail">
      <WordHeader w={w} big />
      <WordBody w={w} />
    </article>
  );
}
