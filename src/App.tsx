import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GameLayer } from "./components/GameLayer";
import { Icon, type IconName } from "./components/Icon";
import { LogoMark, Wordmark } from "./components/Logo";
import { Modal } from "./components/Modal";
import { WordDetail } from "./components/WordDetail";
import { stopStory } from "./lib/audio";
import { Ctx, type AppCtx } from "./lib/context";
import { useWords } from "./lib/data";
import { useT } from "./lib/i18n";
import { go, useRoute } from "./lib/router";
import { dueIds, levelOf, streak, useProgress } from "./lib/store";
import { Dashboard } from "./views/Dashboard";
import { GroupView } from "./views/GroupView";
import { Groups } from "./views/Groups";
import { Learn } from "./views/Learn";
import { Review } from "./views/Review";

// Screens visited less often load on demand, so the first screen appears sooner.
const Quiz = lazy(() => import("./views/Quiz").then((m) => ({ default: m.Quiz })));
const SynonymMap = lazy(() => import("./views/SynonymMap").then((m) => ({ default: m.SynonymMap })));
const Words = lazy(() => import("./views/Words").then((m) => ({ default: m.Words })));
const Settings = lazy(() => import("./views/Settings").then((m) => ({ default: m.Settings })));
const About = lazy(() => import("./views/About").then((m) => ({ default: m.About })));
const Privacy = lazy(() => import("./views/About").then((m) => ({ default: m.Privacy })));
const Onboarding = lazy(() => import("./views/Onboarding").then((m) => ({ default: m.Onboarding })));

const NAV: { path: string; label: string; icon: IconName; match: string[] }[] = [
  { path: "/", label: "Home", icon: "home", match: [""] },
  { path: "/groups", label: "Sets", icon: "layers", match: ["groups", "group", "learn", "map"] },
  { path: "/review", label: "Review", icon: "repeat", match: ["review"] },
  { path: "/quiz", label: "Practice", icon: "target", match: ["quiz"] },
  { path: "/words", label: "Words", icon: "search", match: ["words"] },
];

function useTheme() {
  const { settings } = useProgress();
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
    root.lang = settings.lang;
  }, [settings.theme, settings.lang]);
}

const spinner = (
  <div className="page center-page">
    <div className="spinner" aria-label="Loading" />
  </div>
);

export default function App() {
  const { index, error } = useWords();
  const route = useRoute();
  const progress = useProgress();
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);
  useTheme();

  const openWord = useCallback((id: string) => setOpenId(id), []);
  const ctx = useMemo<AppCtx | null>(() => {
    if (!index) return null;
    const byWord = new Map<string, string[]>();
    for (const w of index.words) byWord.set(w.word, [...(byWord.get(w.word) ?? []), w.id]);
    return { index, byWord, openWord };
  }, [index, openWord]);

  const routeKey = route.join("/");
  // Leaving a screen stops its story.
  useEffect(() => () => stopStory(), [routeKey]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const due = useMemo(() => dueIds().length, [progress.cards, routeKey]);

  if (error) return <div className="page center-page"><p>{error}</p></div>;

  // The welcome screens need no word data until the level check, so show them at once.
  if (!progress.settings.onboarded)
    return (
      <Ctx.Provider value={ctx}>
        <ErrorBoundary>
          <Suspense fallback={spinner}>
            <Onboarding />
          </Suspense>
        </ErrorBoundary>
      </Ctx.Provider>
    );

  if (!ctx)
    return (
      <div className="page center-page">
        <div className="boot">
          <LogoMark size={72} />
          <div className="spinner" aria-label="Loading words" />
        </div>
      </div>
    );

  const [head, arg, arg2] = route;
  // Study screens show stories and GRE items, which load a moment after the word list.
  const needsDetails = head === "learn" || head === "review" || head === "quiz";
  let view;
  switch (head) {
    case undefined:
      view = <Dashboard />;
      break;
    case "groups":
      view = <Groups />;
      break;
    case "group":
      view = <GroupView group={Number(arg)} key={arg} />;
      break;
    case "learn":
      view = <Learn group={Number(arg)} key={arg} />;
      break;
    case "review":
      view = <Review />;
      break;
    case "quiz":
      view = <Quiz source={[arg, arg2]} key={routeKey} />;
      break;
    case "map":
      view = <SynonymMap group={Number(arg) || 1} key={arg} />;
      break;
    case "words":
      view = <Words />;
      break;
    case "settings":
      view = <Settings />;
      break;
    case "about":
      view = <About />;
      break;
    case "privacy":
      view = <Privacy />;
      break;
    default:
      view = <Dashboard />;
  }
  const inSession = head === "learn" || head === "review";
  const openW = openId ? ctx.index.byId.get(openId) : undefined;
  const lvl = levelOf(progress.xp);
  const days = streak(progress.days);

  return (
    <Ctx.Provider value={ctx}>
      <header className="topbar">
        <button className="brand" onClick={() => go("/")} aria-label="Shobdo Quest home">
          <LogoMark size={38} />
          <Wordmark />
        </button>
        <nav className="topnav" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.path} href={`#${n.path}`} className={n.match.includes(head ?? "") ? "on" : ""}>
              <Icon name={n.icon} size={18} />
              <span>{t(n.label)}</span>
              {n.path === "/review" && due > 0 && <span className="badge">{due}</span>}
            </a>
          ))}
        </nav>
        <div className="hud">
          <span className={`hud-chip streak${days > 0 ? " lit" : ""}`} title={`${days}-day streak`}>
            <Icon name="flame" size={18} />
            {days}
          </span>
          <span className="hud-chip xp" id="xp-chip" title={`Level ${lvl.level} · ${lvl.title} · ${progress.xp} XP`}>
            <Icon name="bolt" size={18} />
            <span className="hud-lvl">Lv {lvl.level}</span>
            <span className="hud-bar" aria-hidden>
              <span style={{ width: `${(lvl.into / lvl.step) * 100}%` }} />
            </span>
          </span>
        </div>
        <a href="#/settings" className={`icon-btn${head === "settings" || head === "about" ? " on" : ""}`} aria-label={t("Settings")}>
          <Icon name="settings" />
        </a>
      </header>
      <main className={inSession ? "session" : ""}>
        <ErrorBoundary key={routeKey}>
          <Suspense fallback={spinner}>
            {needsDetails && !ctx.index.detailsReady ? (
              spinner
            ) : (
              <div className="route-anim" key={`${head}/${arg}`}>
                {view}
              </div>
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
      <nav className="bottomnav" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.path} href={`#${n.path}`} className={n.match.includes(head ?? "") ? "on" : ""}>
            <Icon name={n.icon} size={22} />
            <span>{t(n.label)}</span>
            {n.path === "/review" && due > 0 && <span className="badge">{due}</span>}
          </a>
        ))}
      </nav>
      <GameLayer routeKey={routeKey} />
      {openW && (
        <Modal onClose={() => setOpenId(null)} label={openW.word}>
          <WordDetail w={openW} key={openW.id} />
        </Modal>
      )}
    </Ctx.Provider>
  );
}
