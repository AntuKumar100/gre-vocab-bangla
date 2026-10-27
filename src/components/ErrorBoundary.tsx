import { Component, type ReactNode } from "react";
import { reportUrl } from "../lib/brand";
import { translate } from "../lib/i18n";
import { getProgress } from "../lib/store";
import { Icon } from "./Icon";

/** Shows a friendly recovery screen instead of a blank page when a screen crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const lang = getProgress().settings.lang;
    const t = (s: string) => translate(lang, s);
    return (
      <div className="page center-page">
        <div className="done-card" role="alert">
          <div className="done-icon">
            <Icon name="bulb" size={44} />
          </div>
          <h1>{t("Something went wrong")}</h1>
          <p className="muted">{t("Your progress is safe. Reload the app to carry on.")}</p>
          <div className="actions-row center">
            <button className="btn primary" onClick={() => location.reload()}>
              {t("Reload")}
            </button>
            <a className="btn" href={reportUrl(undefined, `Error: ${error.message}`)} target="_blank" rel="noopener noreferrer">
              {t("Report this problem")}
            </a>
          </div>
        </div>
      </div>
    );
  }
}
