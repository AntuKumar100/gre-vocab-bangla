import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

// Hash routing with page transitions. Pages slide forward when you go deeper,
// slide back when you return (to the same scroll position) and fade between tabs.

export type NavDir = "forward" | "back" | "tab";

/** The five main tabs; moving between them fades instead of sliding. */
export const TAB_PATHS = ["/", "/groups", "/review", "/quiz", "/words"];

function current() {
  return location.hash.replace(/^#/, "") || "/";
}

let path = current();
/** Pages visited in this session, newest last, to tell going back from going forward. */
const stack: string[] = [path];
const scrolls = new Map<string, number>();
const listeners = new Set<() => void>();
let pending: { replace?: boolean; dir?: NavDir } = {};

if ("scrollRestoration" in history) history.scrollRestoration = "manual";

function depth(p: string) {
  if (TAB_PATHS.includes(p)) return 0;
  const head = p.split("/")[1];
  return head === "group" || head === "settings" ? 1 : 2;
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function onHashChange() {
  const next = current();
  if (next === path) return;
  const from = path;
  scrolls.set(from, scrollY);
  const popped = !pending.replace && stack.length > 1 && stack[stack.length - 2] === next;
  if (pending.replace) stack[stack.length - 1] = next;
  else if (popped) stack.pop();
  else stack.push(next);

  let dir: NavDir =
    pending.dir ??
    (TAB_PATHS.includes(from) && TAB_PATHS.includes(next)
      ? "tab"
      : popped || depth(next) < depth(from)
        ? "back"
        : depth(next) > depth(from)
          ? "forward"
          : "tab");
  pending = {};
  if (reducedMotion()) dir = "tab";

  const show = () => {
    path = next;
    flushSync(() => listeners.forEach((l) => l()));
    scrollTo(0, popped ? (scrolls.get(next) ?? 0) : 0);
  };
  const root = document.documentElement;
  root.dataset.nav = dir;
  if (document.startViewTransition && document.visibilityState === "visible") {
    root.classList.add("vt");
    document.startViewTransition(show);
  } else {
    show();
  }
}

addEventListener("hashchange", onHashChange);

export function useRoute(): string[] {
  const p = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => path,
  );
  return p.split("/").filter(Boolean);
}

export function currentPath() {
  return path;
}

/** Open a page. `replace` swaps the current history entry (e.g. next set); `dir` overrides the animation. */
export function go(to: string, opts: { replace?: boolean; dir?: NavDir } = {}) {
  if (to === path) return;
  pending = opts;
  if (opts.replace) location.replace(`#${to}`);
  else location.hash = to;
}

/** Leave a page for its parent: steps back through history when that is where we came from. */
export function goBack(parent: string) {
  if (stack.length > 1 && stack[stack.length - 2] === parent) history.back();
  else go(parent, { dir: "back" });
}

/** Where the Back button goes when there is no history to step back through. */
function parentOf(p: string) {
  const [head, arg] = p.split("/").filter(Boolean);
  if (head === "learn" || head === "map") return `/group/${arg}`;
  if (head === "group") return "/groups";
  if (head === "quiz") return "/quiz";
  if (head === "about" || head === "privacy") return "/settings";
  return "/";
}

/**
 * The phone's Back button: step back a page, or from a main tab return Home.
 * Returns false on Home, where the caller decides whether to exit.
 */
export function backButton(): boolean {
  if (path === "/") return false;
  const prev = stack.length > 1 ? stack[stack.length - 2] : null;
  if (TAB_PATHS.includes(path)) {
    if (prev === "/") history.back();
    else go("/", { replace: true, dir: "tab" });
  } else if (prev) history.back();
  else go(parentOf(path), { replace: true, dir: "back" });
  return true;
}
