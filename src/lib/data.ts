import { useEffect, useState } from "react";
import type { Word } from "./types";

let cache: Promise<Word[]> | null = null;

export function loadWords(): Promise<Word[]> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/vocab.json`).then((r) => {
    if (!r.ok) throw new Error(`Could not load word list (${r.status})`);
    return r.json() as Promise<Word[]>;
  });
  return cache;
}

export function audioUrl(w: Word) {
  return `${import.meta.env.BASE_URL}audio/${w.id}.mp3`;
}

export interface WordIndex {
  words: Word[];
  byId: Map<string, Word>;
  groups: number[];
  byGroup: Map<number, Word[]>;
}

export function indexWords(words: Word[]): WordIndex {
  const byId = new Map(words.map((w) => [w.id, w]));
  const byGroup = new Map<number, Word[]>();
  for (const w of words) {
    if (!byGroup.has(w.group)) byGroup.set(w.group, []);
    byGroup.get(w.group)!.push(w);
  }
  return { words, byId, groups: [...byGroup.keys()].sort((a, b) => a - b), byGroup };
}

export function useWords(): { index: WordIndex | null; error: string | null } {
  const [index, setIndex] = useState<WordIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadWords().then((w) => setIndex(indexWords(w)), (e: Error) => setError(e.message));
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
