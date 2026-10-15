import { useSyncExternalStore } from "react";
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from "ts-fsrs";
import type { Stage } from "./types";

const KEY = "gre-vocab-progress-v1";
const MASTERED_DAYS = 21;

export type Theme = "system" | "light" | "dark";

export interface Settings {
  theme: Theme;
  /** Playback speed for story narration. */
  audioRate: number;
  /** Review front side shows the meaning instead of the word. */
  reverse: boolean;
  /** Play the story automatically when a card's answer is revealed. */
  autoplay: boolean;
  newPerDay: number;
}

export interface DayLog {
  reviews: number;
  correct: number;
  learned: number;
  quiz: number;
  quizCorrect: number;
}

interface Progress {
  cards: Record<string, Card>;
  /** Per-word quiz misses, used to surface trouble words. */
  misses: Record<string, number>;
  starred: string[];
  days: Record<string, DayLog>;
  settings: Settings;
}

const DEFAULT_SETTINGS: Settings = { theme: "system", audioRate: 1, reverse: false, autoplay: true, newPerDay: 20 };

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

export function today(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function reviveCard(c: Card): Card {
  return { ...c, due: new Date(c.due), last_review: c.last_review ? new Date(c.last_review) : undefined };
}

function load(): Progress {
  const empty: Progress = { cards: {}, misses: {}, starred: [], days: {}, settings: { ...DEFAULT_SETTINGS } };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    return parse(raw);
  } catch {
    return empty;
  }
}

function parse(raw: string): Progress {
  const p = JSON.parse(raw) as Partial<Progress>;
  const cards: Record<string, Card> = {};
  for (const [id, c] of Object.entries(p.cards ?? {})) cards[id] = reviveCard(c);
  return {
    cards,
    misses: p.misses ?? {},
    starred: p.starred ?? [],
    days: p.days ?? {},
    settings: { ...DEFAULT_SETTINGS, ...p.settings },
  };
}

let state: Progress = load();
const listeners = new Set<() => void>();

function commit(next: Progress) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private mode): progress lives for this session only.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, () => state);
}

export function getProgress() {
  return state;
}

function bumpDay(days: Record<string, DayLog>, patch: Partial<DayLog>) {
  const key = today();
  const cur = days[key] ?? { reviews: 0, correct: 0, learned: 0, quiz: 0, quizCorrect: 0 };
  const next = { ...cur };
  for (const [k, v] of Object.entries(patch) as [keyof DayLog, number][]) next[k] += v;
  return { ...days, [key]: next };
}

export function stageOf(card: Card | undefined): Stage {
  if (!card || card.state === State.New) return "new";
  if (card.state === State.Learning || card.state === State.Relearning) return "learning";
  return card.scheduled_days >= MASTERED_DAYS ? "mastered" : "young";
}

/** Rate a word. Unseen words get a fresh card first, which counts as learned today. */
export function grade(id: string, rating: Grade, now = new Date()) {
  const existing = state.cards[id];
  const card = existing ?? createEmptyCard(now);
  const { card: next } = scheduler.next(card, now, rating);
  let days = bumpDay(state.days, { reviews: 1, correct: rating >= Rating.Good ? 1 : 0 });
  if (!existing) days = bumpDay(days, { learned: 1 });
  commit({ ...state, cards: { ...state.cards, [id]: next }, days });
}

/** Human-readable interval for each rating, e.g. { 1: "1m", 3: "10m", 4: "4d" }. */
export function previewIntervals(id: string, now = new Date()): Record<Grade, string> {
  const card = state.cards[id] ?? createEmptyCard(now);
  const preview = scheduler.repeat(card, now);
  const out = {} as Record<Grade, string>;
  for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    out[r] = formatInterval(preview[r].card.due.getTime() - now.getTime());
  }
  return out;
}

export function formatInterval(ms: number) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min}m`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.round(d / 30);
  return mo < 12 ? `${mo}mo` : `${(d / 365).toFixed(1)}y`;
}

export function dueIds(now = new Date()) {
  return Object.entries(state.cards)
    .filter(([, c]) => c.due.getTime() <= now.getTime())
    .sort((a, b) => a[1].due.getTime() - b[1].due.getTime())
    .map(([id]) => id);
}

export function learnedToday() {
  return state.days[today()]?.learned ?? 0;
}

export function recordQuiz(id: string, correct: boolean) {
  const misses = correct ? state.misses : { ...state.misses, [id]: (state.misses[id] ?? 0) + 1 };
  commit({ ...state, misses, days: bumpDay(state.days, { quiz: 1, quizCorrect: correct ? 1 : 0 }) });
}

export function toggleStar(id: string) {
  const starred = state.starred.includes(id) ? state.starred.filter((s) => s !== id) : [...state.starred, id];
  commit({ ...state, starred });
}

export function updateSettings(patch: Partial<Settings>) {
  commit({ ...state, settings: { ...state.settings, ...patch } });
}

/** Consecutive days with any study, counting today only once something was done. */
export function streak(days: Record<string, DayLog>) {
  const active = (d: Date) => {
    const log = days[today(d)];
    return !!log && log.reviews + log.quiz > 0;
  };
  const d = new Date();
  if (!active(d)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (active(d)) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function exportProgress() {
  return JSON.stringify(state);
}

export function importProgress(raw: string) {
  commit(parse(raw));
}

export function resetProgress() {
  commit({ cards: {}, misses: {}, starred: [], days: {}, settings: state.settings });
}

export { Rating };
export type { Grade };
