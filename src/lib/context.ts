import { createContext, useContext } from "react";
import type { WordIndex } from "./data";

export interface AppCtx {
  index: WordIndex;
  /** Lowercased headword → ids (a word can sit in two groups). */
  byWord: Map<string, string[]>;
  openWord: (id: string) => void;
}

export const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
