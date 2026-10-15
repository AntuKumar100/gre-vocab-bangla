import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "./components/Icon";
import { Modal } from "./components/Modal";
import { WordDetail } from "./components/WordDetail";
import { stopStory } from "./lib/audio";
import { Ctx, type AppCtx } from "./lib/context";
import { useWords } from "./lib/data";
import { go, useRoute } from "./lib/router";
import { dueIds, useProgress } from "./lib/store";
import { Dashboard } from "./views/Dashboard";
import { GroupView } from "./views/GroupView";
import { Groups } from "./views/Groups";
import { Learn } from "./views/Learn";
import { Quiz } from "./views/Quiz";
import { Review } from "./views/Review";
import { Settings } from "./views/Settings";
import { SynonymMap } from "./views/SynonymMap";
import { Words } from "./views/Words";

const NAV: { path: string; label: string; icon: IconName; match: string[] }[] = [
  { path: "/", label: "Home", icon: "home", match: [""] },
  { path: "/groups", label: "Groups", icon: "layers", match: ["groups", "group", "learn"] },
  { path: "/review", label: "Review", icon: "repeat", match: ["review"] },
  { path: "/quiz", label: "Quiz", icon: "quiz", match: ["quiz"] },
  { path: "/map/1", label: "Map", icon: "network", match: ["map"] },
  { path: "/words", label: "Words", icon: "search", match: ["words"] },
];

function useTheme() {
  const { settings } = useProgress();
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);
}

export default function App() {
  const { index, error } = useWords();
  const route = useRoute();
  const progress = useProgress();
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
  if (!ctx) return <div className="page center-page"><div className="spinner" aria-label="Loading words" /></div>;

  const [head, arg, arg2] = route;
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
    default:
      view = <Dashboard />;
  }
  const inSession = head === "learn" || head === "review";
  const openW = openId ? ctx.index.byId.get(openId) : undefined;

  return (
    <Ctx.Provider value={ctx}>
      <header className="topbar">
        <button className="brand" onClick={() => go("/")}>
          <span className="logo" aria-hidden>
            শ
          </span>
          <span>GRE Vocab</span>
        </button>
        <nav className="topnav" aria-label="Main">
          {NAV.map((n) => (
            <a key={n.path} href={`#${n.path}`} className={n.match.includes(head ?? "") ? "on" : ""}>
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
              {n.path === "/review" && due > 0 && <span className="badge">{due}</span>}
            </a>
          ))}
        </nav>
        <a href="#/settings" className={`icon-btn${head === "settings" ? " on" : ""}`} aria-label="Settings">
          <Icon name="settings" />
        </a>
      </header>
      <main className={inSession ? "session" : ""}>{view}</main>
      <nav className="bottomnav" aria-label="Main">
        {NAV.map((n) => (
          <a key={n.path} href={`#${n.path}`} className={n.match.includes(head ?? "") ? "on" : ""}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
            {n.path === "/review" && due > 0 && <span className="badge">{due}</span>}
          </a>
        ))}
      </nav>
      {openW && (
        <Modal onClose={() => setOpenId(null)} label={openW.word}>
          <WordDetail w={openW} key={openW.id} />
        </Modal>
      )}
    </Ctx.Provider>
  );
}
