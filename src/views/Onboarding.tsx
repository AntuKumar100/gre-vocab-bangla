import { useContext, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { LogoMark } from "../components/Logo";
import { APP_NAME } from "../lib/brand";
import { Ctx } from "../lib/context";
import { shuffle } from "../lib/data";
import { burstFrom, sfx } from "../lib/fx";
import { useT, type Lang } from "../lib/i18n";
import { isNative, setDailyReminder } from "../lib/native";
import { CORE_START, dailyPlan } from "../lib/plan";
import { go } from "../lib/router";
import { today, updateSettings, useProgress } from "../lib/store";
import type { Word } from "../lib/types";

/** Sets sampled by the level check: four everyday, three core, three rare. */
const CHECK_SETS = [1, 4, 8, 12, 16, 20, 24, 28, 32, 36];
export function Onboarding() {
  const t = useT();
  // Word data may still be loading; only the level check needs it.
  const index = useContext(Ctx)?.index;
  const { settings } = useProgress();
  const [step, setStep] = useState(0);
  const [testDate, setTestDate] = useState(settings.testDate);
  const [reminder, setReminder] = useState("20:00");
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);

  // Keyed on the word array, which stays the same object when stories load, so the check never reshuffles.
  const words = index?.words;
  const check = useMemo(() => {
    if (!words) return [];
    const last = Math.max(...words.map((w) => w.group));
    return CHECK_SETS.map((g) => {
      const set = words.filter((w) => w.group === Math.min(g, last));
      const [w, ...rest] = shuffle(set);
      return { w, options: shuffle([w.en, ...rest.slice(0, 3).map((x: Word) => x.en)]) };
    });
  }, [words]);

  const total = index?.words.length ?? 1110;
  const perDay = dailyPlan(total, testDate);
  const everydayRight = answers.slice(0, 4).filter(Boolean).length;
  const startSet = everydayRight === 4 ? CORE_START : 1;

  const finish = async (learn: boolean, from = startSet) => {
    updateSettings({ onboarded: true, testDate, newPerDay: perDay, startSet: from, reminder: isNative ? reminder : "" });
    if (isNative && reminder) await setDailyReminder(reminder).catch(() => false);
    go(learn ? `/learn/${from}` : "/");
  };

  const q = check[answers.length];
  const answer = (o: string, el: Element) => {
    if (chosen) return;
    const ok = o === q.w.en;
    setChosen(o);
    sfx(ok ? "correct" : "wrong");
    if (ok) burstFrom(el, 24);
    setTimeout(() => {
      setAnswers((a) => [...a, ok]);
      setChosen(null);
      if (answers.length + 1 === check.length) setStep(3);
    }, 900);
  };

  return (
    <div className="onboard">
      <div className="onboard-top">
        <div className="onboard-dots" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i <= step ? "on" : ""} />
          ))}
        </div>
        {step < 3 && (
          <button className="btn ghost small" onClick={() => finish(false, 1)}>
            {t("Skip")}
          </button>
        )}
      </div>

      {step === 0 && (
        <section className="onboard-card pop-in">
          <LogoMark size={112} />
          <h1>{APP_NAME}</h1>
          <p className="onboard-lead">{t("GRE vocabulary with Bangla meanings, stories you can hear, and real GRE questions.")}</p>
          <ul className="onboard-points">
            <li>
              <Icon name="book" /> {t("1,110 words, each with a Bangla meaning, a memory trick and a narrated story")}
            </li>
            <li>
              <Icon name="repeat" /> {t("Smart review brings each word back just before you would forget it")}
            </li>
            <li>
              <Icon name="target" /> {t("Practice with Sentence Equivalence and Text Completion questions")}
            </li>
          </ul>
          <div className="field">
            <span>{t("Language")}</span>
            <div className="seg-control">
              {(["en", "bn"] as Lang[]).map((l) => (
                <button key={l} className={settings.lang === l ? "on" : ""} onClick={() => updateSettings({ lang: l })} lang={l}>
                  {l === "en" ? "English" : "বাংলা"}
                </button>
              ))}
            </div>
          </div>
          <button className="btn primary big" onClick={() => setStep(1)}>
            {t("Let's begin")} <Icon name="arrowRight" />
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="onboard-card pop-in">
          <div className="onboard-icon">
            <Icon name="timer" size={40} />
          </div>
          <h1>{t("When is your GRE?")}</h1>
          <p className="onboard-lead">{t("We'll plan how many new words to learn each day.")}</p>
          <label className="field">
            <span>{t("Test date")}</span>
            <input type="date" value={testDate} min={today()} onChange={(e) => setTestDate(e.target.value)} />
          </label>
          <button className={`chip link${testDate ? "" : " on"}`} onClick={() => setTestDate("")}>
            {t("Not booked yet")}
          </button>
          <div className="plan-card">
            <strong>{t("about {n} new words a day", { n: perDay })}</strong>
            <span>{testDate ? t("to meet all {n} words before your test, with time left to review", { n: total.toLocaleString("en-US") }) : t("a steady pace you can change any time in Settings")}</span>
          </div>
          {isNative && (
            <label className="field">
              <span>{t("Daily reminder")}</span>
              <select value={reminder} onChange={(e) => setReminder(e.target.value)}>
                <option value="">{t("Off")}</option>
                {["07:00", "09:00", "13:00", "18:00", "20:00", "22:00"].map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="btn primary big" onClick={() => setStep(2)}>
            {t("Next")} <Icon name="arrowRight" />
          </button>
        </section>
      )}

      {step === 2 && !index && <div className="spinner" aria-label="Loading words" />}

      {step === 2 && q && (
        <section className="onboard-card pop-in" key={answers.length}>
          <span className="q-tag">{t("Quick level check · {i} of {n}", { i: answers.length + 1, n: check.length })}</span>
          <p className="q-prompt">
            {t("What does this word mean?")}
            <strong className="q-word block">{q.w.word}</strong>
          </p>
          <div className="options">
            {q.options.map((o) => (
              <button
                key={o}
                className={`option ${chosen ? (o === q.w.en ? "right" : o === chosen ? "wrong" : "dim") : ""}`}
                onClick={(e) => answer(o, e.currentTarget)}
                disabled={!!chosen}
              >
                <span>{o}</span>
              </button>
            ))}
          </div>
          <button className="btn ghost" onClick={() => setStep(3)}>
            {t("I'm a beginner, skip the check")}
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="onboard-card pop-in">
          <div className="done-icon">
            <Icon name="sparkle" size={44} />
          </div>
          <h1>{t("You're all set!")}</h1>
          {answers.length > 0 && <p className="onboard-lead">{t("You knew {n} of {total} words.", { n: answers.filter(Boolean).length, total: answers.length })}</p>}
          <p>
            {startSet === 1
              ? t("Start with Set 1: everyday words that the GRE uses in surprising ways.")
              : t("You know the everyday words, so start with Set {n}, where the core GRE words begin.", { n: startSet })}
          </p>
          <button className="btn primary big" onClick={() => finish(true)}>
            <Icon name="book" /> {t("Start set {n}", { n: startSet })}
          </button>
          {startSet !== 1 && (
            <button className="btn ghost" onClick={() => finish(true, 1)}>
              {t("Start from Set 1 instead")}
            </button>
          )}
          <button className="btn ghost" onClick={() => finish(false)}>
            {t("Look around first")}
          </button>
        </section>
      )}
    </div>
  );
}
