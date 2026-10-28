export interface Word {
  id: string;
  group: number;
  word: string;
  pos: string;
  en: string;
  bn: string;
  hook: string;
  story: string;
  synonyms: string[];
  example: string;
  audio: boolean;
  /** A recorded pronunciation of the headword exists. */
  say: boolean;
  /** GRE sentence item: blank sentence, synonym pair, tempting wrong answer, clue phrase. */
  gre?: GreItem;
}

export interface GreItem {
  s: string;
  pair: string;
  trap: string;
  clue: string;
}

/** Where a word is in the learning pipeline, derived from its FSRS card. */
export type Stage = "new" | "learning" | "young" | "mastered";

export const STAGES: Stage[] = ["new", "learning", "young", "mastered"];

export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  learning: "Learning",
  young: "Reviewing",
  mastered: "Mastered",
};
