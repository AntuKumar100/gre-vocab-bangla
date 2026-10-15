import { useDeferredValue, useMemo, useState } from "react";
import { StoryPlayer } from "../components/Story";
import { rowProps } from "../lib/a11y";
import { useApp } from "../lib/context";
import { stageOf, useProgress } from "../lib/store";
import { STAGES, STAGE_LABEL, type Stage } from "../lib/types";

export function Words() {
  const { index, openWord } = useApp();
  const { cards, starred } = useProgress();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Stage | "all" | "starred">("all");
  const query = useDeferredValue(q.trim().toLowerCase());

  const results = useMemo(() => {
    const inStage = index.words.filter((w) =>
      stage === "starred" ? starred.includes(w.id) : stage === "all" || stageOf(cards[w.id]) === stage,
    );
    if (!query) return inStage;
    // Headword matches first (exact, then prefix), then meaning or synonym matches.
    const rank = (w: (typeof inStage)[number]) => {
      if (w.word === query) return 0;
      if (w.word.startsWith(query)) return 1;
      if (w.word.includes(query)) return 2;
      if (w.en.toLowerCase().includes(query) || w.bn.includes(query) || w.synonyms.some((s) => s.includes(query))) return 3;
      return -1;
    };
    return inStage
      .map((w) => ({ w, r: rank(w) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r)
      .map((x) => x.w);
  }, [index, query, stage, cards, starred]);

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
          <li key={w.id} className="word-row" {...rowProps(() => openWord(w.id))}>
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
