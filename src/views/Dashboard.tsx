import { useMemo } from "react";
import { ActivityCalendar } from "../charts/ActivityCalendar";
import { ForecastBars } from "../charts/ForecastBars";
import { GroupGrid, type GroupStat } from "../charts/GroupGrid";
import { StageBar } from "../charts/StageBar";
import { Icon } from "../components/Icon";
import { StoryPlayer } from "../components/Story";
import { useApp } from "../lib/context";
import { go } from "../lib/router";
import { stageOf, streak, today, useProgress } from "../lib/store";
import { STAGES, type Stage } from "../lib/types";

export function Dashboard() {
  const { index, openWord } = useApp();
  const progress = useProgress();
  const { cards, days } = progress;

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
    const nextGroup = groupStats.find((g) => g.counts.new > 0)?.group;
    return { stageCounts, groupStats, due, forecast, nextGroup };
  }, [index, cards]);

  const wordOfDay = useMemo(() => {
    const key = today();
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return index.words[h % index.words.length];
  }, [index]);

  const todayLog = days[today()];
  const learned = index.words.length - stageCounts.new;

  return (
    <div className="page dashboard">
      <section className="hero-row">
        <div className="hero-card primary">
          <span className="hero-label">Due for review</span>
          <span className="hero-number">{due}</span>
          <button className="btn primary" disabled={due === 0} onClick={() => go("/review")}>
            <Icon name="repeat" /> {due ? "Start review" : "All caught up"}
          </button>
        </div>
        <div className="hero-card">
          <span className="hero-label">Learn new words</span>
          <span className="hero-number">{todayLog?.learned ?? 0}</span>
          <span className="muted small">learned today · goal {progress.settings.newPerDay}</span>
          {nextGroup !== undefined && (
            <button className="btn" onClick={() => go(`/learn/${nextGroup}`)}>
              <Icon name="book" /> Continue group {nextGroup}
            </button>
          )}
        </div>
        <div className="stat-tiles">
          <div className="stat">
            <span className="stat-num">{learned}</span>
            <span className="stat-label">words started of {index.words.length}</span>
          </div>
          <div className="stat">
            <span className="stat-num">{stageCounts.mastered}</span>
            <span className="stat-label">mastered</span>
          </div>
          <div className="stat">
            <span className="stat-num">{streak(days)}</span>
            <span className="stat-label">day streak</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Your progress</h2>
        <StageBar counts={stageCounts} />
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Groups</h2>
          <p className="muted small">Tap a group to open it. Darker means more of it is mastered.</p>
          <GroupGrid stats={groupStats} onPick={(g) => go(`/group/${g}`)} />
        </section>
        <section className="panel">
          <h2>Word of the day</h2>
          <button className="wotd" onClick={() => openWord(wordOfDay.id)}>
            <span className="headword">{wordOfDay.word}</span>
            <span className="muted">{wordOfDay.en}</span>
            <span className="bn" lang="bn">
              {wordOfDay.bn}
            </span>
          </button>
          <StoryPlayer w={wordOfDay} />
        </section>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Coming up</h2>
          <p className="muted small">Reviews due in the next 14 days</p>
          <ForecastBars counts={forecast} />
        </section>
        <section className="panel">
          <h2>Activity</h2>
          <p className="muted small">Reviews and quiz answers per day</p>
          <ActivityCalendar days={days} />
        </section>
      </div>
    </div>
  );
}
