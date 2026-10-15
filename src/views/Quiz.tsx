import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "../components/Icon";
import { StoryPlayer } from "../components/Story";
import { speak, stopStory } from "../lib/audio";
import { useApp } from "../lib/context";
import { shuffle } from "../lib/data";
import { burstFrom, celebrate, replay, sfx } from "../lib/fx";
import { go } from "../lib/router";
import { getProgress, recordQuiz } from "../lib/store";
import type { Word } from "../lib/types";

type QType = "se" | "tc" | "en" | "bn" | "reverse" | "synonym" | "spell";
type Mode = QType | "gre" | "mixed";

const MODES: { id: Mode; label: string; sub: string; icon: IconName; gre?: boolean }[] = [
  { id: "gre", label: "GRE mix", sub: "Sentence Equivalence + Text Completion", icon: "sparkle", gre: true },
  { id: "se", label: "Sentence Equivalence", sub: "Pick the 2 words that give the same meaning", icon: "target", gre: true },
  { id: "tc", label: "Text Completion", sub: "Pick the 1 word that completes the sentence", icon: "pen", gre: true },
  { id: "mixed", label: "Everything", sub: "All question types shuffled", icon: "bolt" },
  { id: "en", label: "Word → meaning", sub: "Recall the English meaning", icon: "book" },
  { id: "bn", label: "Word → বাংলা", sub: "Recall the Bangla meaning", icon: "book" },
  { id: "reverse", label: "Meaning → word", sub: "Find the word from its meaning", icon: "repeat" },
  { id: "synonym", label: "Synonyms", sub: "Spot the synonym", icon: "network" },
  { id: "spell", label: "Spell it", sub: "Type the word from memory", icon: "pen" },
];

/** XP per correct answer; harder formats earn more. */
const XP: Record<QType, number> = { se: 20, tc: 15, spell: 12, en: 10, bn: 10, reverse: 10, synonym: 10 };
/** Seconds per question in timed mode (GRE pace is roughly a minute per blank). */
const TIME: Record<QType, number> = { se: 60, tc: 60, spell: 25, en: 20, bn: 20, reverse: 20, synonym: 20 };

interface Question {
  w: Word;
  type: QType;
  options: string[];
  /** Correct option(s): two for Sentence Equivalence, one otherwise. */
  answers: string[];
}

const primaryPos = (w: Word) => w.pos.split(" / ")[0];

/** Words that could not also fill the blank: same part of speech, not a synonym of the answer. */
function greDistractors(w: Word, all: Word[], exclude: string[]): string[] {
  const g = w.gre!;
  const banned = new Set([w.word, g.pair, g.trap, ...w.synonyms, ...exclude].map((x) => x.toLowerCase()));
  const pos = primaryPos(w);
  const ok = all.filter(
    (x) =>
      x.id !== w.id &&
      primaryPos(x) === pos &&
      !banned.has(x.word.toLowerCase()) &&
      !x.synonyms.some((s) => banned.has(s.toLowerCase())) &&
      x.gre?.pair.toLowerCase() !== g.pair.toLowerCase() &&
      !x.word.includes(" "),
  );
  return shuffle(ok).map((x) => x.word);
}

function buildQuestions(pool: Word[], all: Word[], mode: Mode, length: number): Question[] {
  const greMode = mode === "gre" || mode === "se" || mode === "tc";
  const withGre = pool.filter((w) => w.gre);
  const picked = shuffle(greMode && withGre.length ? withGre : pool).slice(0, length);
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
  const ALL: QType[] = ["se", "tc", "en", "bn", "reverse", "synonym", "spell"];
  return picked.map((w) => {
    let type: QType =
      mode === "mixed" ? ALL[Math.floor(Math.random() * ALL.length)] : mode === "gre" ? (Math.random() < 0.5 ? "se" : "tc") : mode;
    if ((type === "se" || type === "tc") && !w.gre) type = "en";
    if (type === "synonym" && w.synonyms.length === 0) type = "en";
    const pool = others(w);
    switch (type) {
      case "se": {
        const g = w.gre!;
        return { w, type, answers: [w.word, g.pair], options: shuffle([w.word, g.pair, g.trap, ...greDistractors(w, all, []).slice(0, 3)]) };
      }
      case "tc": {
        const g = w.gre!;
        return { w, type, answers: [w.word], options: shuffle([w.word, g.trap, ...greDistractors(w, all, []).slice(0, 3)]) };
      }
      case "en":
        return { w, type, answers: [w.en], options: fill(w.en, pool.map((x) => x.en)) };
      case "bn":
        return { w, type, answers: [w.bn], options: fill(w.bn, pool.map((x) => x.bn)) };
      case "reverse":
        return { w, type, answers: [w.word], options: fill(w.word, pool.map((x) => x.word)) };
      case "synonym": {
        const answer = shuffle(w.synonyms)[0];
        const own = new Set(w.synonyms);
        const wrong = pool.flatMap((x) => x.synonyms).filter((s) => !own.has(s) && s !== w.word);
        return { w, type, answers: [answer], options: fill(answer, shuffle(wrong)) };
      }
      case "spell":
        return { w, type, answers: [w.word], options: [] };
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
  const [mode, setMode] = useState<Mode>("gre");
  const [length, setLength] = useState(10);
  const [timed, setTimed] = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [round, setRound] = useState(0);

  const start = (words: Word[] = pool) => {
    setQuestions(buildQuestions(words, index.words, mode, Math.min(length, words.length)));
    setRound((r) => r + 1);
  };

  if (questions)
    return (
      <QuizRun
        key={round}
        questions={questions}
        title={title}
        timed={timed}
        onRestart={(missed) => start(missed.length ? missed : pool)}
        onExit={() => setQuestions(null)}
      />
    );

  const sources: [string, string][] = [
    ["/quiz/learned", "Words you've started"],
    ["/quiz/starred", "Difficult (starred)"],
    ["/quiz/trouble", "Most missed"],
    ["/quiz/all", "All words"],
    ...index.groups.map((g): [string, string] => [`/quiz/group/${g}`, `Group ${g}`]),
  ];
  const current = source[0] ? `/quiz/${source.filter(Boolean).join("/")}` : "/quiz/all";
  const known = sources.some(([href]) => href === current);
  const greReady = pool.filter((w) => w.gre).length;
  return (
    <div className="page">
      <div className="page-hero practice">
        <div>
          <h1>Practice arena</h1>
          <p>Real GRE question formats, built from your words. Every right answer earns XP; streaks of right answers build a combo.</p>
        </div>
        <Icon name="target" size={64} />
      </div>
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
          <span className="muted small">
            {pool.length} words{greReady < pool.length && ` · ${greReady} have GRE sentences so far`}
          </span>
        </label>
        <div className="field">
          <span>Question type</span>
          <div className="mode-grid">
            {MODES.map((m) => (
              <button key={m.id} className={`mode-card${mode === m.id ? " on" : ""}${m.gre ? " gre" : ""}`} onClick={() => setMode(m.id)}>
                <Icon name={m.icon} size={22} />
                <strong>{m.label}</strong>
                <span>{m.sub}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="setup-row">
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
          <label className="toggle">
            <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
            <span className="toggle-track" aria-hidden />
            <span>
              <Icon name="timer" size={16} /> Timed (GRE pace)
            </span>
          </label>
        </div>
        <button className="btn primary big" disabled={pool.length === 0} onClick={() => start()}>
          {pool.length ? (
            <>
              <Icon name="bolt" /> Start
            </>
          ) : (
            "No words here yet"
          )}
        </button>
      </section>
    </div>
  );
}

/** Splits a GRE sentence into text, clue and blank pieces; "a ____" reads "a(n) ____" so the article gives nothing away. */
function sentenceParts(s: string, clue: string) {
  const bi = s.indexOf("____");
  const ci = s.indexOf(clue);
  const cuts = [...new Set([0, bi, bi + 4, ...(ci >= 0 ? [ci, ci + clue.length] : []), s.length])].sort((a, b) => a - b);
  const parts: { text: string; blank: boolean; clue: boolean }[] = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    const [a, b] = [cuts[k], cuts[k + 1]];
    if (a === b) continue;
    parts.push({ text: s.slice(a, b), blank: a === bi, clue: ci >= 0 && a >= ci && b <= ci + clue.length && a !== bi });
  }
  const before = parts.findIndex((p) => p.blank) - 1;
  if (before >= 0) parts[before].text = parts[before].text.replace(/\b([Aa])n? $/, "$1(n) ");
  return parts;
}

function GreSentence({ q, filled, showClue }: { q: Question; filled: string | null; showClue: boolean }) {
  const g = q.w.gre!;
  return (
    <p className="gre-sentence">
      {sentenceParts(g.s, g.clue).map((p, k) =>
        p.blank ? (
          <span key={k} className={`blank${filled ? " filled" : ""}`}>
            {filled ?? " "}
          </span>
        ) : p.clue && showClue ? (
          <mark key={k} className="clue">
            {p.text}
          </mark>
        ) : (
          <span key={k}>{p.text}</span>
        ),
      )}
    </p>
  );
}

function QuizRun({
  questions,
  title,
  timed,
  onRestart,
  onExit,
}: {
  questions: Question[];
  title: string;
  timed: boolean;
  onRestart: (missed: Word[]) => void;
  onExit: () => void;
}) {
  const { openWord } = useApp();
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState<string[] | null>(null);
  const [typed, setTyped] = useState("");
  const [missed, setMissed] = useState<Word[]>([]);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState(0);
  const [earned, setEarned] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => TIME[questions[0].type]);
  const [timedOut, setTimedOut] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const q = questions[i];
  const multi = q?.type === "se";

  useEffect(() => {
    setPicked([]);
    setSubmitted(null);
    setTyped("");
    setTimedOut(false);
    if (q) setTimeLeft(TIME[q.type]);
    if (q?.type === "spell") inputRef.current?.focus();
    return () => stopStory();
  }, [i, q]);

  const isRight = (vals: string[]) =>
    vals.length === q.answers.length && vals.every((v) => q.answers.some((a) => a.toLowerCase() === v.trim().toLowerCase()));

  const submit = (vals: string[], anchor?: Element | null, outOfTime = false) => {
    if (submitted !== null) return;
    const ok = !outOfTime && isRight(vals);
    setSubmitted(vals);
    setTimedOut(outOfTime);
    const nextCombo = ok ? combo + 1 : 0;
    const gained = ok ? XP[q.type] + 2 * Math.min(nextCombo - 1, 5) : 0;
    setCombo(nextCombo);
    setBest((b) => Math.max(b, nextCombo));
    setEarned((x) => x + gained);
    recordQuiz(q.w.id, ok, gained, nextCombo);
    if (ok) {
      sfx(nextCombo >= 3 && nextCombo % 3 === 0 ? "combo" : "correct");
      burstFrom(anchor ?? cardRef.current, nextCombo >= 3 ? 70 : 36);
    } else {
      sfx("wrong");
      setMissed((m) => [...m, q.w]);
      replay(cardRef.current, "shake");
    }
    if (q.type !== "spell") speak(q.w.word);
  };

  // Countdown for timed mode; running out counts as a miss.
  useEffect(() => {
    if (!timed || !q || submitted !== null) return;
    if (timeLeft <= 0) {
      submit(picked, null, true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  });

  const toggle = (o: string, el: Element | null) => {
    if (submitted !== null) return;
    if (!multi) {
      submit([o], el);
      return;
    }
    sfx("tap");
    setPicked((p) => (p.includes(o) ? p.filter((x) => x !== o) : p.length < 2 ? [...p, o] : [p[1], o]));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || e.target instanceof HTMLInputElement) return;
      if (submitted !== null && e.key === "Enter") {
        e.preventDefault();
        setI((n) => n + 1);
      } else if (submitted === null && multi && e.key === "Enter" && picked.length === 2) {
        e.preventDefault();
        submit(picked);
      } else if (submitted === null && q.type !== "spell") {
        const k = Number(e.key);
        if (k >= 1 && k <= q.options.length) toggle(q.options[k - 1], document.querySelectorAll(".option")[k - 1]);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  const total = questions.length;
  const score = total - missed.length;
  const pct = Math.round((score / total) * 100);
  const finished = !q;
  useEffect(() => {
    if (!finished) return;
    sfx("finish");
    if (pct >= 80) celebrate();
  }, [finished, pct]);

  if (finished) {
    const stars = pct === 100 ? 3 : pct >= 80 ? 2 : pct >= 50 ? 1 : 0;
    return (
      <div className="page center-page">
        <div className="done-card pop-in">
          <div className="stars" aria-label={`${stars} of 3 stars`}>
            {[0, 1, 2].map((k) => (
              <span key={k} className={`star-slot${k < stars ? " lit" : ""}`} style={{ animationDelay: `${0.25 + k * 0.2}s` }}>
                <Icon name="star" size={44} />
              </span>
            ))}
          </div>
          <div className="score-ring" style={{ ["--pct" as string]: pct }}>
            <span>{pct}%</span>
          </div>
          <h1>
            {score} / {total} correct
          </h1>
          <div className="result-chips">
            <span className="hud-chip xp">
              <Icon name="bolt" size={18} /> +{earned} XP
            </span>
            <span className="hud-chip streak lit">
              <Icon name="flame" size={18} /> Best combo {best}
            </span>
          </div>
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
              Change practice
            </button>
          </div>
        </div>
      </div>
    );
  }

  const correct = submitted !== null && !timedOut && isRight(submitted);
  const g = q.w.gre;
  const prompt = {
    se: <span className="q-instr">Select the <strong>two</strong> answers that complete the sentence and give it the same meaning.</span>,
    tc: <span className="q-instr">Select the <strong>one</strong> answer that best completes the sentence.</span>,
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

  const optionState = (o: string) => {
    if (submitted === null) return picked.includes(o) ? "picked" : "";
    if (q.answers.includes(o)) return "right";
    return submitted.includes(o) ? "wrong" : "dim";
  };

  return (
    <div className="page quiz">
      <div className="session-head">
        <button className="icon-btn" onClick={onExit} aria-label="Leave practice">
          <Icon name="close" />
        </button>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(i / total) * 100}%` }} />
        </div>
        <span className={`combo${combo >= 2 ? " on" : ""}`} aria-live="polite">
          <Icon name="flame" size={18} />
          {combo >= 2 ? `×${combo}` : ""}
        </span>
        <span className="muted small">
          {i + 1}/{total}
        </span>
      </div>
      {timed && submitted === null && (
        <div className={`timer${timeLeft <= 10 ? " low" : ""}`} aria-label={`${timeLeft} seconds left`}>
          <div className="timer-fill" style={{ width: `${(timeLeft / TIME[q.type]) * 100}%` }} />
          <span>
            <Icon name="timer" size={14} /> {timeLeft}s
          </span>
        </div>
      )}
      <article className={`flashcard q-card${g && (q.type === "se" || q.type === "tc") ? " gre" : ""}`} ref={cardRef} key={i}>
        <div className="q-tag">
          {q.type === "se" ? "Sentence Equivalence" : q.type === "tc" ? "Text Completion" : title}
        </div>
        <p className="q-prompt">{prompt}</p>
        {g && (q.type === "se" || q.type === "tc") && (
          <GreSentence q={q} filled={submitted !== null ? q.w.word : null} showClue={submitted !== null} />
        )}
        {q.type === "spell" ? (
          <form
            className="spell"
            onSubmit={(e) => {
              e.preventDefault();
              submit([typed], inputRef.current);
            }}
          >
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={submitted !== null}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-label="Your answer"
            />
            {submitted === null && <button className="btn primary">Check</button>}
          </form>
        ) : (
          <div className={`options${q.type === "se" || q.type === "tc" || q.type === "reverse" ? " words" : ""}`}>
            {q.options.map((o, k) => (
              <button
                key={o}
                className={`option ${optionState(o)}${multi ? " multi" : ""}`}
                onClick={(e) => toggle(o, e.currentTarget)}
                disabled={submitted !== null}
                aria-pressed={multi ? picked.includes(o) : undefined}
                lang={q.type === "bn" ? "bn" : undefined}
                style={{ animationDelay: `${k * 0.04}s` }}
              >
                <kbd>{multi ? <span className="checkbox" /> : k + 1}</kbd>
                <span>{o}</span>
              </button>
            ))}
          </div>
        )}
        {multi && submitted === null && (
          <button className="btn primary check-btn" disabled={picked.length !== 2} onClick={() => submit(picked)}>
            {picked.length === 2 ? "Check" : `Pick ${2 - picked.length} more`}
          </button>
        )}
        {submitted !== null && (
          <div className={`feedback ${correct ? "ok" : "bad"}`}>
            <strong className="fb-title">
              {correct ? "Correct!" : timedOut ? "Time's up" : q.type === "spell" ? `It's “${q.w.word}”` : "Not quite."}
              {correct && <span className="fb-xp">+{XP[q.type] + 2 * Math.min(combo - 1, 5)} XP</span>}
            </strong>
            {g && (q.type === "se" || q.type === "tc") ? (
              <div className="explain">
                <p>
                  <span className="label">Clue</span> “{g.clue}” tells you the blank must mean <em>{q.w.en.toLowerCase()}</em>.
                </p>
                {q.type === "se" ? (
                  <p>
                    <b className="good-word">{q.w.word}</b> and <b className="good-word">{g.pair}</b> both fit and give the sentence the
                    same meaning, which is what Sentence Equivalence asks for.
                  </p>
                ) : (
                  <p>
                    <b className="good-word">{q.w.word}</b> completes the sentence.
                  </p>
                )}
                <p>
                  <b className="trap-word">{g.trap}</b> is the trap: it fits the grammar but goes against the clue.
                </p>
              </div>
            ) : null}
            <div className="fb-word">
              <button className="link-btn" onClick={() => openWord(q.w.id)}>
                {q.w.word}
              </button>
              <span className="muted"> · {q.w.en}</span>
              <span className="bn block" lang="bn">
                {q.w.bn}
              </span>
            </div>
            <div className="hook">
              <Icon name="bulb" size={18} />
              <span>{q.w.hook}</span>
            </div>
            <StoryPlayer w={q.w} />
            <button className="btn primary" onClick={() => setI(i + 1)} autoFocus>
              {i + 1 < total ? "Next" : "See results"} <kbd>Enter</kbd>
            </button>
          </div>
        )}
      </article>
    </div>
  );
}
