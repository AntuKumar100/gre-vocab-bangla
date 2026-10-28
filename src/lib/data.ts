import { useEffect, useState } from "react";
import type { Word } from "./types";

type Details = Record<string, Pick<Word, "hook" | "story" | "example" | "gre">>;

const getJson = <T,>(path: string) =>
  fetch(`${import.meta.env.BASE_URL}data/${path}`).then((r) => {
    if (!r.ok) throw new Error(`Could not load the word list (${r.status})`);
    return r.json() as Promise<T>;
  });

let wordsCache: Promise<Word[]> | null = null;
let detailsCache: Promise<Details> | null = null;

/** The words with the fields the first screen needs; stories and GRE items arrive with loadDetails. */
export function loadWords(): Promise<Word[]> {
  wordsCache ??= getJson<Omit<Word, "hook" | "story" | "example">[]>("vocab.json").then((ws) =>
    ws.map((w): Word => ({ ...w, hook: "", story: "", example: "" })),
  );
  return wordsCache;
}

export function loadDetails(): Promise<Details> {
  detailsCache ??= getJson<Details>("details.json");
  return detailsCache;
}

export function audioUrl(w: Word) {
  return `${import.meta.env.BASE_URL}audio/${w.id}.mp3`;
}

export function sayUrl(w: Word) {
  return `${import.meta.env.BASE_URL}audio/say/${w.id}.mp3`;
}

export interface WordIndex {
  words: Word[];
  byId: Map<string, Word>;
  groups: number[];
  byGroup: Map<number, Word[]>;
  /** Stories, hooks, examples and GRE items have arrived. */
  detailsReady: boolean;
}

export function indexWords(words: Word[], detailsReady = false): WordIndex {
  const byId = new Map(words.map((w) => [w.id, w]));
  const byGroup = new Map<number, Word[]>();
  for (const w of words) {
    if (!byGroup.has(w.group)) byGroup.set(w.group, []);
    byGroup.get(w.group)!.push(w);
  }
  return { words, byId, groups: [...byGroup.keys()].sort((a, b) => a - b), byGroup, detailsReady };
}

export function useWords(): { index: WordIndex | null; error: string | null } {
  const [index, setIndex] = useState<WordIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fail = (e: Error) => setError(e.message);
    loadWords().then((words) => {
      setIndex(indexWords(words));
      loadDetails().then((details) => {
        // Fill the same word objects in place, then publish a new index so screens re-render.
        for (const w of words) Object.assign(w, details[w.id]);
        setIndex(indexWords(words, true));
      }, fail);
    }, fail);
  }, []);
  return { index, error };
}

/** Matches the headword and its inflections (abound → abounded, abounds). */
export function wordPattern(word: string): RegExp {
  const base = word.toLowerCase();
  const stem = base.length <= 5 ? base.slice(0, -1) : base.slice(0, -2);
  const esc = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b(${esc}[a-z]{0,5})\\b`, "gi");
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
