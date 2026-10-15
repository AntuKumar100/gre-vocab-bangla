import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { StoryPlayer } from "../components/Story";
import { speak, stopStory } from "../lib/audio";
import { useApp } from "../lib/context";
import { shuffle } from "../lib/data";
import { go } from "../lib/router";
import { getProgress, recordQuiz } from "../lib/store";
import type { Word } from "../lib/types";

type QType = "en" | "bn" | "reverse" | "synonym" | "spell";
type Mode = QType | "mixed";

const MODES: { id: Mode; label: string }[] = [
  { id: "mixed", label: "Mixed" },
  { id: "en", label: "Word → meaning" },
  { id: "bn", label: "Word → বাংলা" },
  { id: "reverse", label: "Meaning → word" },
  { id: "synonym", label: "Pick the synonym" },
  { id: "spell", label: "Spell it" },
];

interface Question {
  w: Word;
  type: QType;
  options: string[];
  answer: string;
}

function buildQuestions(pool: Word[], all: Word[], mode: Mode, length: number): Question[] {
  const picked = shuffle(pool).slice(0, length);
  const others = (w: Word) => {
    const sameGroup = all.filter((x) => x.group === w.group && x.id !== w.id);
    return shuffle(sameGroup.length >= 6 ? sameGroup : all.filter((x) => x.id !== w.id));
  };
  const fill = (correct: string, candidates: string[]) => {
    const opts = [correct];
    for (const c of candidates) {
      if (opts.length === 4) break;
      if (c && !opts.includes(c)) opts.push(c);
    }
    return shuffle(opts);
  };
  return picked.map((w) => {
    let type: QType = mode === "mixed" ? (["en", "bn", "reverse", "synonym", "spell"] as QType[])[Math.floor(Math.random() * 5)] : mode;
    if (type === "synonym" && w.synonyms.length === 0) type = "en";
    const pool = others(w);
    switch (type) {
      case "en":
        return { w, type, answer: w.en, options: fill(w.en, pool.map((x) => x.en)) };
      case "bn":
        return { w, type, answer: w.bn, options: fill(w.bn, pool.map((x) => x.bn)) };
      case "reverse":
        return { w, type, answer: w.word, options: fill(w.word, pool.map((x) => x.word)) };
      case "synonym": {
        const answer = shuffle(w.synonyms)[0];
        const own = new Set(w.synonyms);
        const wrong = pool.flatMap((x) => x.synonyms).filter((s) => !own.has(s) && s !== w.word);
        return { w, type, answer, options: fill(answer, shuffle(wrong)) };
      }
      case "spell":
        return { w, type, answer: w.word, options: [] };
    }
  });
}

function usePool(source: string[]): { title: string; pool: Word[] } {
  const { index } = useApp();
  return useMemo(() => {
    const [kind, arg] = source;
    const { cards, starred, misses } = getProgress();
    if (kind === "group") {
      const g = Number(arg);
      return { title: `Group ${g}`, pool: index.byGroup.get(g) ?? [] };
    }
    if (kind === "ids") return { title: "Just learned", pool: (arg ?? "").split(",").map((id) => index.byId.get(id)!).filter(Boolean) };
    if (kind === "starred") return { title: "Difficult words", pool: index.words.filter((w) => starred.includes(w.id)) };
    if (kind === "trouble") {
      const ids = Object.entries(misses).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([id]) => id);
      return { title: "Most missed", pool: ids.map((id) => index.byId.get(id)!).filter(Boolean) };
    }
    if (kind === "learned") return { title: "Words you've started", pool: index.words.filter((w) => cards[w.id]) };
    return { title: "All words", pool: index.words };
  }, [index, source]);
}

export function Quiz({ source }: { source: string[] }) {
  const { index } = useApp();
  const { title, pool } = usePool(source);
  const [mode, setMode] = useState<Mode>("mixed");
  const [length, setLength] = useState(10);
  const [questions, setQuestions] = useState<Question[] | null>(null);

  const start = (words: Word[] = pool) => setQuestions(buildQuestions(words, index.words, mode, Math.min(length, words.length)));

  if (questions) return <QuizRun questions={questions} title={title} onRestart={(missed) => start(missed.length ? missed : pool)} onExit={() => setQuestions(null)} />;

  const sources: [string, string][] = [
    ["/quiz/learned", "Words you've started"],
    ["/quiz/starred", "Difficult (starred)"],
    ["/quiz/trouble", "Most missed"],
    ["/quiz/all", "All words"],
    ...index.groups.map((g): [string, string] => [`/quiz/group/${g}`, `Group ${g}`]),
  ];
  const current = source[0] ? `/quiz/${source.filter(Boolean).join("/")}` : "/quiz/all";
  const known = sources.some(([href]) => href === current);
  return (
    <div className="page">
      <h1>Quiz</h1>
      <p className="muted">Testing yourself is the fastest way to lock words in. Wrong answers show the memory hook so you can fix them on the spot.</p>
      <section className="panel quiz-setup">
        <label className="field">
          <span>Words</span>
          <select value={known ? current : "custom"} onChange={(e) => go(e.target.value)}>
            {!known && <option value="custom">{title}</option>}
            {sources.map(([href, label]) => (
              <option key={href} value={href}>
                {label}
              </option>
            ))}
          </select>
          <span className="muted small">{pool.length} words</span>
        </label>
        <div className="field">
          <span>Question type</span>
          <div className="seg-control">
            {MODES.map((m) => (
              <button key={m.id} className={mode === m.id ? "on" : ""} onClick={() => setMode(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>Questions</span>
          <div className="seg-control">
            {[10, 20, 30].map((n) => (
              <button key={n} className={length === n ? "on" : ""} onClick={() => setLength(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <button className="btn primary big" disabled={pool.length === 0} onClick={() => start()}>
          {pool.length ? "Start quiz" : "No words here yet"}
        </button>
      </section>
    </div>
  );
}

function QuizRun({
  questions,
  title,
  onRestart,
  onExit,
}: {
  questions: Question[];
  title: string;
  onRestart: (missed: Word[]) => void;
  onExit: () => void;
}) {
  const { openWord } = useApp();
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [missed, setMissed] = useState<Word[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const q = questions[i];

  useEffect(() => {
    setChosen(null);
    setTyped("");
    if (q?.type === "spell") inputRef.current?.focus();
    return () => stopStory();
  }, [i, q]);

  const submit = (value: string) => {
    if (chosen !== null) return;
    const ok = value.trim().toLowerCase() === q.answer.toLowerCase();
    setChosen(value || "—");
    recordQuiz(q.w.id, ok);
    if (!ok) setMissed((m) => [...m, q.w]);
    if (q.type !== "spell") speak(q.w.word);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      if (chosen !== null && e.key === "Enter") {
        e.preventDefault();
        setI((n) => n + 1);
      } else if (chosen === null && q.type !== "spell" && ["1", "2", "3", "4"].includes(e.key)) {
        submit(q.options[Number(e.key) - 1]);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  if (!q) {
    const score = questions.length - missed.length;
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="page center-page">
        <div className="done-card">
          <div className="score-ring" style={{ ["--pct" as string]: pct }}>
            <span>{pct}%</span>
          </div>
          <h1>
            {score} / {questions.length} correct
          </h1>
          {missed.length > 0 && (
            <>
              <p className="muted">Words to look at again:</p>
              <div className="syns center">
                {missed.map((w) => (
                  <button key={w.id} className="chip link" onClick={() => openWord(w.id)}>
                    {w.word}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="actions-row center">
            <button className="btn primary" onClick={() => onRestart(missed)}>
              {missed.length ? "Retry missed words" : "New round"}
            </button>
            <button className="btn" onClick={onExit}>
              Change quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const correct = chosen !== null && chosen.trim().toLowerCase() === q.answer.toLowerCase();
  const prompt = {
    en: <>What does <strong className="q-word">{q.w.word}</strong> mean?</>,
    bn: <><strong className="q-word">{q.w.word}</strong> শব্দটির অর্থ কী?</>,
    reverse: (
      <>
        Which word means <em>“{q.w.en}”</em>
        <span className="bn block" lang="bn">{q.w.bn}</span>
      </>
    ),
    synonym: <>Which is a synonym of <strong className="q-word">{q.w.word}</strong>?</>,
    spell: (
      <>
        Type the word that means <em>“{q.w.en}”</em>
        <span className="bn block" lang="bn">{q.w.bn}</span>
        <span className="muted small block">Starts with “{q.w.word[0]}”, {q.w.word.length} letters</span>
      </>
    ),
  }[q.type];

  return (
    <div className="page quiz">
      <div className="session-head">
        <button className="icon-btn" onClick={onExit} aria-label="Leave quiz">
          <Icon name="close" />
        </button>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <span className="muted small">
          {title} · {i + 1}/{questions.length}
        </span>
      </div>
      <article className="flashcard">
        <p className="q-prompt">{prompt}</p>
        {q.type === "spell" ? (
          <form
            className="spell"
            onSubmit={(e) => {
              e.preventDefault();
              submit(typed);
            }}
          >
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={chosen !== null}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-label="Your answer"
            />
            {chosen === null && <button className="btn primary">Check</button>}
          </form>
        ) : (
          <div className="options">
            {q.options.map((o, k) => {
              const state = chosen === null ? "" : o === q.answer ? "right" : o === chosen ? "wrong" : "dim";
              return (
                <button key={o} className={`option ${state}`} onClick={() => submit(o)} disabled={chosen !== null} lang={q.type === "bn" ? "bn" : undefined}>
                  <kbd>{k + 1}</kbd>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
        )}
        {chosen !== null && (
          <div className={`feedback ${correct ? "ok" : "bad"}`}>
            <strong>{correct ? "Correct!" : q.type === "spell" ? `It's “${q.w.word}”` : "Not quite."}</strong>
            <div className="fb-word">
              <button className="link-btn" onClick={() => openWord(q.w.id)}>
                {q.w.word}
              </button>
              <span className="muted"> · {q.w.en}</span>
            </div>
            <div className="hook">
              <Icon name="bulb" size={18} />
              <span>{q.w.hook}</span>
            </div>
            <StoryPlayer w={q.w} />
            <button className="btn primary" onClick={() => setI(i + 1)} autoFocus>
              Next <kbd>Enter</kbd>
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
