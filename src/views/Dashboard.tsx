import { useMemo } from "react";
import { ActivityCalendar } from "../charts/ActivityCalendar";
import { ForecastBars } from "../charts/ForecastBars";
import { GroupGrid, type GroupStat } from "../charts/GroupGrid";
import { StageBar } from "../charts/StageBar";
import { Icon } from "../components/Icon";
import { StoryPlayer } from "../components/Story";
import { useApp } from "../lib/context";
import { useT } from "../lib/i18n";
import { saveBackup } from "../lib/native";
import { daysUntil, dailyPlan } from "../lib/plan";
import { go } from "../lib/router";
import { exportProgress, levelOf, stageOf, streak, today, updateSettings, useProgress } from "../lib/store";
import { STAGES, type Stage } from "../lib/types";

export function Dashboard() {
  const { index, openWord } = useApp();
  const progress = useProgress();
  const { cards, days, settings } = progress;
  const t = useT();

  const { stageCounts, groupStats, due, forecast, nextGroup } = useMemo(() => {
    const now = Date.now();
    const stageCounts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
    const groupStats: GroupStat[] = index.groups.map((g) => ({
      group: g,
      total: index.byGroup.get(g)!.length,
      counts: Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>,
    }));
    for (const w of index.words) {
      const s = stageOf(cards[w.id]);
      stageCounts[s]++;
      groupStats[index.groups.indexOf(w.group)].counts[s]++;
    }
    const forecast = Array(14).fill(0) as number[];
    let due = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    for (const c of Object.values(cards)) {
      if (c.due.getTime() <= now) due++;
      const day = Math.max(0, Math.floor((c.due.getTime() - startOfToday.getTime()) / 86400000));
      if (day < 14) forecast[day]++;
    }
    // Continue from the suggested starting set, then fall back to any set with new words.
    const nextGroup = (groupStats.find((g) => g.group >= settings.startSet && g.counts.new > 0) ?? groupStats.find((g) => g.counts.new > 0))?.group;
    return { stageCounts, groupStats, due, forecast, nextGroup };
  }, [index, cards, settings.startSet]);

  const wordOfDay = useMemo(() => {
    const key = today();
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return index.words[h % index.words.length];
  }, [index]);

  const todayLog = days[today()];
  const learned = index.words.length - stageCounts.new;
  const fresh = Object.keys(cards).length === 0;
  const lvl = levelOf(progress.xp);
  const xpToday = todayLog?.xp ?? 0;
  const goal = settings.xpGoal;
  const streakDays = streak(days);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const toTest = daysUntil(settings.testDate);
  const perDay = dailyPlan(stageCounts.new, settings.testDate);
  // Nudge a backup once there is real progress to lose, at most once a month.
  const monthAgo = today(new Date(Date.now() - 30 * 86400000));
  const nudge = learned >= 30 && (settings.lastBackup || "0") < monthAgo && (settings.backupNudged || "0") < monthAgo;

  const learnTile = nextGroup !== undefined && (
    <button className="action-tile t-learn" onClick={() => go(`/learn/${nextGroup}`)}>
      <Icon name="book" size={30} />
      <strong>{t(fresh ? "Start set {n}" : "Learn set {n}", { n: nextGroup })}</strong>
      <span>{fresh ? t("Your first 30 words, with stories and audio") : t("{done} of {goal} new words today", { done: todayLog?.learned ?? 0, goal: settings.newPerDay })}</span>
    </button>
  );

  return (
    <div className="page dashboard">
      <section className="hero-banner">
        <div className="hb-text">
          <span className="hb-greet">
            {t(greeting)} <span lang="bn">· চলো শিখি!</span>
          </span>
          <h1>
            {t("Level")} {lvl.level} <span className="hb-title">{t(lvl.title)}</span>
          </h1>
          <div
            className="hb-xp"
            role="progressbar"
            aria-label="XP to the next level"
            aria-valuemin={0}
            aria-valuemax={lvl.step}
            aria-valuenow={lvl.into}
          >
            <div className="hb-xp-fill" style={{ width: `${(lvl.into / lvl.step) * 100}%` }} />
          </div>
          <span className="hb-sub">{t("{n} XP to level {next} · {total} XP total", { n: lvl.step - lvl.into, next: lvl.level + 1, total: progress.xp })}</span>
          {toTest !== null && toTest >= 0 && (
            <span className="hb-countdown">
              <Icon name="timer" size={16} /> {t("{n} days to your GRE", { n: toTest })} · {t("about {n} new words a day", { n: perDay })}
            </span>
          )}
        </div>
        <div className="hb-rings">
          <GoalRing value={xpToday} goal={goal} doneLabel={t("goal met")} />
          <div className={`flame-badge${streakDays > 0 ? " lit" : ""}`}>
            <Icon name="flame" size={40} />
            <strong>{streakDays}</strong>
            <span>{t("day streak")}</span>
          </div>
        </div>
      </section>

      {nudge && (
        <section className="nudge pop-in" role="status">
          <Icon name="bulb" size={22} />
          <div>
            <strong>{t("Back up your progress")}</strong>
            <span>{t("Your progress is only on this device. Save a copy so you never lose it.")}</span>
          </div>
          <button
            className="btn primary"
            onClick={async () => {
              await saveBackup(exportProgress(), `shobdo-quest-backup-${today()}.json`);
              updateSettings({ lastBackup: today() });
            }}
          >
            {t("Back up now")}
          </button>
          <button className="btn ghost" onClick={() => updateSettings({ backupNudged: today() })}>
            {t("Later")}
          </button>
        </section>
      )}

      <section className="action-tiles">
        {fresh && learnTile}
        {!fresh && (
          <button className="action-tile t-review" disabled={due === 0} onClick={() => go("/review")}>
            <Icon name="repeat" size={30} />
            <strong>{due ? t("Review {n}", { n: due }) : t("All caught up")}</strong>
            <span>{due ? t("words are due. Keep them fresh.") : t("No reviews due right now.")}</span>
          </button>
        )}
        {!fresh && learnTile}
        <button className="action-tile t-gre" onClick={() => go(learned ? "/quiz/learned" : `/quiz/group/${nextGroup ?? 1}`)}>
          <Icon name="target" size={30} />
          <strong>{t("GRE practice")}</strong>
          <span>{t("Sentence Equivalence and Text Completion")}</span>
        </button>
      </section>

      <section className="stat-tiles">
        <div className="stat">
          <span className="stat-num">{learned}</span>
          <span className="stat-label">{t("of {n} words started", { n: index.words.length })}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{stageCounts.mastered}</span>
          <span className="stat-label">{t("mastered")}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{progress.bestCombo}</span>
          <span className="stat-label">{t("best combo")}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{todayLog ? Math.round((100 * (todayLog.correct + todayLog.quizCorrect)) / Math.max(1, todayLog.reviews + todayLog.quiz)) : 0}%</span>
          <span className="stat-label">{t("accuracy today")}</span>
        </div>
      </section>

      <section className="panel">
        <h2>{t("Your progress")}</h2>
        <StageBar counts={stageCounts} />
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>{t("Sets")}</h2>
          <p className="muted small">{t("Tap a set to open it. Darker means more of it is mastered.")}</p>
          <GroupGrid stats={groupStats} onPick={(g) => go(`/group/${g}`)} />
        </section>
        <section className="panel wotd-panel">
          <h2>
            <Icon name="sparkle" size={18} /> {t("Word of the day")}
          </h2>
          <button className="wotd" onClick={() => openWord(wordOfDay.id)}>
            <span className="headword">{wordOfDay.word}</span>
            <span className="wotd-en">{wordOfDay.en}</span>
            <span className="bn" lang="bn">
              {wordOfDay.bn}
            </span>
          </button>
          <StoryPlayer w={wordOfDay} />
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>{t("Coming up")}</h2>
          <p className="muted small">{t("Reviews due in the next 14 days")}</p>
          <ForecastBars counts={forecast} />
        </section>
        <section className="panel">
          <h2>{t("Activity")}</h2>
          <p className="muted small">{t("Reviews and quiz answers per day")}</p>
          <ActivityCalendar days={days} />
        </section>
      </div>
    </div>
  );
}

/** Today's XP against the daily goal, as a ring that fills up. */
function GoalRing({ value, goal, doneLabel }: { value: number; goal: number; doneLabel: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, value / goal);
  return (
    <div className={`goal-ring${f >= 1 ? " done" : ""}`} role="img" aria-label={`Daily goal: ${value} of ${goal} XP`}>
      <svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fde047" />
            <stop offset="1" stopColor="#fb923c" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - f)} />
      </svg>
      <div className="ring-label">
        {f >= 1 ? <Icon name="check" size={26} /> : <strong>{value}</strong>}
        <span>{f >= 1 ? doneLabel : `/ ${goal} XP`}</span>
      </div>
    </div>
  );
}
