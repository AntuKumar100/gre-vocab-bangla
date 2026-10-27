import { today } from "./store";

/** Where the core sets begin; learners who know the everyday words can start here. */
export const CORE_START = 13;
/** Set ranges for the three tiers of the quest path. */
export const TIERS = [
  { name: "Foundation", from: 1, to: 12, blurb: "Sets {a} to {b}: everyday words with GRE meanings" },
  { name: "Core", from: 13, to: 25, blurb: "Sets {a} to {b}: the heart of the GRE list" },
  { name: "Advanced", from: 26, to: 37, blurb: "Sets {a} to {b}: rare words that separate top scores" },
];

export function daysUntil(date: string) {
  if (!date) return null;
  return Math.ceil((Date.parse(date) - Date.parse(today())) / 86400000);
}

/** New words a day needed to meet every word with a fifth of the time left for review. */
export function dailyPlan(wordsLeft: number, testDate: string) {
  const days = daysUntil(testDate);
  if (days === null) return 20;
  if (days <= 0) return 60;
  return Math.min(60, Math.max(5, Math.ceil(wordsLeft / Math.max(1, days * 0.8))));
}
