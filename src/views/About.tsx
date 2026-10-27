import { Icon } from "../components/Icon";
import { LogoMark } from "../components/Logo";
import { APP_NAME, MAKER, PRIVACY_URL, REPO_URL, reportUrl, TRADEMARK, VERSION } from "../lib/brand";
import { useApp } from "../lib/context";
import { useT } from "../lib/i18n";
import { go } from "../lib/router";

const CREDITS: [string, string, string][] = [
  ["Kokoro", "narration voice model", "Apache 2.0"],
  ["Baloo Da 2, Nunito, Hind Siliguri", "fonts", "SIL Open Font License"],
  ["React", "interface", "MIT"],
  ["ts-fsrs", "spaced repetition scheduler", "MIT"],
  ["d3-force", "synonym map layout", "ISC"],
  ["canvas-confetti", "celebrations", "ISC"],
  ["Capacitor", "Android app", "MIT"],
];

export function About() {
  const t = useT();
  const { index } = useApp();
  return (
    <div className="page about">
      <div className="page-head">
        <button className="icon-btn" onClick={() => go("/settings")} aria-label={t("Settings")}>
          <Icon name="arrowLeft" />
        </button>
        <h1>{t("About")}</h1>
      </div>
      <section className="about-hero panel">
        <LogoMark size={96} />
        <div>
          <h2>{APP_NAME}</h2>
          <p className="muted">
            {t("Version {v}", { v: VERSION })} · {t("Made by {name}", { name: MAKER })}
          </p>
          <p>{t("GRE vocabulary with Bangla meanings, stories you can hear, and real GRE questions.")}</p>
        </div>
      </section>

      <section className="panel">
        <h2>{t("How it helps you remember")}</h2>
        <ul className="about-list">
          <li>{t("{n} words in 37 sets, from the most common to the rarest", { n: index.words.length })}</li>
          <li>{t("Every word has an English and Bangla meaning, a memory trick, a story and slow narration")}</li>
          <li>{t("Spaced repetition (FSRS) brings each word back just before you would forget it")}</li>
          <li>{t("Sentence Equivalence and Text Completion questions explain the clue and the trap")}</li>
        </ul>
      </section>

      <section className="panel">
        <h2>{t("Privacy")}</h2>
        <p>{t("The app collects no personal data. Your progress stays on this device; there are no accounts, ads or trackers.")}</p>
        <button className="btn" onClick={() => go("/privacy")}>
          {t("Read the privacy policy")}
        </button>
      </section>

      <section className="panel">
        <h2>{t("Help and feedback")}</h2>
        <p>{t("Found a wrong meaning, a typo or a confusing question? Tell us and it will be fixed for everyone.")}</p>
        <div className="actions-row">
          <a className="btn" href={reportUrl()} target="_blank" rel="noopener noreferrer">
            <Icon name="pen" /> {t("Report a mistake")}
          </a>
          <a className="btn ghost" href={REPO_URL} target="_blank" rel="noopener noreferrer">
            {t("Source code")}
          </a>
        </div>
      </section>

      <section className="panel">
        <h2>{t("Credits")}</h2>
        <table className="credits">
          <tbody>
            {CREDITS.map(([name, role, licence]) => (
              <tr key={name}>
                <td>{name}</td>
                <td className="muted">{role}</td>
                <td className="muted">{licence}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted trademark">{TRADEMARK}</p>
      </section>
    </div>
  );
}

/** The privacy policy, also published as privacy.html for the store listings. */
export function Privacy() {
  const t = useT();
  return (
    <div className="page about">
      <div className="page-head">
        <button className="icon-btn" onClick={() => go("/about")} aria-label={t("About")}>
          <Icon name="arrowLeft" />
        </button>
        <h1>{t("Privacy policy")}</h1>
      </div>
      <section className="panel prose">
        <p className="muted small">Effective 27 October 2026</p>
        <p>
          {APP_NAME} does not collect, store or share any personal information. It has no accounts, no advertising and no
          analytics.
        </p>
        <h3>What stays on your device</h3>
        <p>
          Your learning progress, settings and starred words are saved only in the app's storage on your device. They are never sent
          to us or anyone else. Uninstalling the app or clearing its data deletes them. You can export a backup file yourself from
          Settings; where you save it is your choice.
        </p>
        <h3>Network use</h3>
        <p>
          The Android app works fully offline. The website version downloads the app and its audio from GitHub Pages, which, like
          any web host, may keep standard server logs.
        </p>
        <h3>Notifications</h3>
        <p>Daily reminders, if you turn them on, are scheduled on your device. No notification service is involved.</p>
        <h3>Children</h3>
        <p>The app is made for students preparing for graduate admission tests and is not directed at children.</p>
        <h3>Contact</h3>
        <p>
          Questions about privacy: open an issue at{" "}
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer">
            {REPO_URL.replace("https://", "")}
          </a>
          . The current policy is always at{" "}
          <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
            {PRIVACY_URL.replace("https://", "")}
          </a>
          .
        </p>
      </section>
    </div>
  );
}
