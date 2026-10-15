import { useDeferredValue, useMemo, useState } from "react";
import { StoryPlayer } from "../components/Story";
import { useApp } from "../lib/context";
import { stageOf, useProgress } from "../lib/store";
import { STAGES, STAGE_LABEL, type Stage } from "../lib/types";

export function Words() {
  const { index, openWord } = useApp();
  const { cards, starred } = useProgress();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Stage | "all" | "starred">("all");
  const query = useDeferredValue(q.trim().toLowerCase());

  const results = useMemo(
    () =>
      index.words.filter((w) => {
        if (stage === "starred" ? !starred.includes(w.id) : stage !== "all" && stageOf(cards[w.id]) !== stage) return false;
        if (!query) return true;
        return (
          w.word.includes(query) ||
          w.en.toLowerCase().includes(query) ||
          w.bn.includes(query) ||
          w.synonyms.some((s) => s.includes(query))
        );
      }),
    [index, query, stage, cards, starred],
  );

  return (
    <div className="page">
      <h1>All words</h1>
      <div className="filters">
        <input
          type="search"
          placeholder="Search a word, meaning, বাংলা অর্থ or synonym…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search words"
        />
        <div className="seg-control">
          {(["all", ...STAGES, "starred"] as const).map((s) => (
            <button key={s} className={stage === s ? "on" : ""} onClick={() => setStage(s)}>
              {s === "all" ? "All" : s === "starred" ? "★ Difficult" : STAGE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">{results.length} words</p>
      <ul className="word-list">
        {results.slice(0, 300).map((w) => (
          <li key={w.id} className="word-row" onClick={() => openWord(w.id)}>
            <div className="wr-main">
              <span className="wr-word">{w.word}</span>
              <span className="wr-en">{w.en}</span>
              <span className="wr-bn" lang="bn">
                {w.bn}
              </span>
            </div>
            <span className="muted small">G{w.group}</span>
            <StoryPlayer w={w} compact />
          </li>
        ))}
      </ul>
      {results.length > 300 && <p className="muted small">Showing the first 300. Type to narrow down.</p>}
    </div>
  );
}
