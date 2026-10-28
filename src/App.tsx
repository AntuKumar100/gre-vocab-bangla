import { createElement, lazy, Suspense, useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GameLayer } from "./components/GameLayer";
import { Icon, type IconName } from "./components/Icon";
import { LogoMark, Wordmark } from "./components/Logo";
import { Modal } from "./components/Modal";
import { ThemeMenu } from "./components/ThemeMenu";
import { Toaster } from "./components/Toast";
import { WordDetail } from "./components/WordDetail";
import { stopStory } from "./lib/audio";
import { closeTopPopup } from "./lib/back";
import { toast } from "./lib/toast";
import { Ctx, type AppCtx } from "./lib/context";
import { useWords } from "./lib/data";
import { useT } from "./lib/i18n";
import { exitApp, onBackButton, setStatusBarDark } from "./lib/native";
import { backButton, go, useRoute } from "./lib/router";
import { dueIds, levelOf, streak, useProgress } from "./lib/store";
import { Dashboard } from "./views/Dashboard";
import { GroupView } from "./views/GroupView";
import { Groups } from "./views/Groups";
import { Learn } from "./views/Learn";
import { Review } from "./views/Review";

// Screens visited less often load on demand, so the first screen appears sooner.
// Once the app is idle they all load in the background, so later page changes
// slide straight to the new screen instead of a loading spinner.
function view<P extends object>(load: () => Promise<ComponentType<P>>) {
  let loaded: ComponentType<P> | null = null;
  const preload = () => load().then((c) => (loaded = c));
  const Lazy = lazy(() => preload().then((c) => ({ default: c })));
  // Each mount keeps the component it started with, so finishing the preload never remounts an open screen.
  const View = (props: P) => {
    const [C] = useState(() => (loaded ?? Lazy) as ComponentType<P>);
    return createElement(C, props);
  };
  return Object.assign(View, { preload });
}
const Quiz = view(() => import("./views/Quiz").then((m) => m.Quiz));
const SynonymMap = view(() => import("./views/SynonymMap").then((m) => m.SynonymMap));
const Words = view(() => import("./views/Words").then((m) => m.Words));
const Settings = view(() => import("./views/Settings").then((m) => m.Settings));
const About = view(() => import("./views/About").then((m) => m.About));
const Privacy = view(() => import("./views/About").then((m) => m.Privacy));
const Onboarding = view(() => import("./views/Onboarding").then((m) => m.Onboarding));
const LATER = [Quiz, SynonymMap, Words, Settings, About, Privacy];

const NAV: { path: string; label: string; icon: IconName; match: string[] }[] = [
  { path: "/", label: "Home", icon: "home", match: [""] },
  { path: "/groups", label: "Sets", icon: "layers", match: ["groups", "group", "learn", "map"] },
  { path: "/review", label: "Review", icon: "repeat", match: ["review"] },
  { path: "/quiz", label: "Practice", icon: "target", match: ["quiz"] },
  { path: "/words", label: "Words", icon: "search", match: ["words"] },
];

const darkQuery = matchMedia("(prefers-color-scheme: dark)");

function useTheme() {
  const { theme, lang, textSize } = useProgress().settings;
  const [systemDark, setSystemDark] = useState(darkQuery.matches);
  useEffect(() => {
    const onChange = () => setSystemDark(darkQuery.matches);
    darkQuery.addEventListener("change", onChange);
    return () => darkQuery.removeEventListener("change", onChange);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    if (textSize === "normal") root.removeAttribute("data-text");
    else root.setAttribute("data-text", textSize);
    root.lang = lang;
    // The browser bar and the phone's status bar take the header's colour.
    const surface = getComputedStyle(root).getPropertyValue("--surface").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", surface);
    const bar = () => void setStatusBarDark(theme === "system" ? null : theme !== "light").catch(() => {});
    bar();
    // The app reports the status bar's size a moment after starting; check again once it has.
    const id = setTimeout(bar, 1000);
    return () => clearTimeout(id);
  }, [theme, lang, textSize, systemDark]);
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
  const closeWord = useCallback(() => setOpenId(null), []);
  const ctx = useMemo<AppCtx | null>(() => {
    if (!index) return null;
    const byWord = new Map<string, string[]>();
    for (const w of index.words) byWord.set(w.word, [...(byWord.get(w.word) ?? []), w.id]);
    return { index, byWord, openWord };
  }, [index, openWord]);

  const routeKey = route.join("/");
  // Leaving a screen stops its story and closes any open word card.
  useEffect(
    () => () => {
      stopStory();
      setOpenId(null);
    },
    [routeKey],
  );

  useEffect(() => {
    if (!ctx) return;
    const id = setTimeout(() => LATER.forEach((v) => void v.preload()), 1500);
    return () => clearTimeout(id);
  }, [ctx]);

  // The phone's Back button closes a popup, then steps back, then (twice on Home) exits.
  useEffect(() => {
    let armed = 0;
    return onBackButton(() => {
      if (closeTopPopup() || backButton()) return;
      if (Date.now() - armed < 2000) void exitApp();
      else {
        armed = Date.now();
        toast(t("Press back again to exit"));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.settings.lang]);

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
        <Toaster />
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
        <ThemeMenu />
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
      <Toaster />
      {openW && (
        <Modal onClose={closeWord} label={openW.word}>
          <WordDetail w={openW} key={openW.id} />
        </Modal>
      )}
    </Ctx.Provider>
  );
}
