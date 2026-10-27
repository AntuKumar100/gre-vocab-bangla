// App identity in one place, so the name, maker and links are easy to change.
export const APP_NAME = "Shobdo Quest";
export const MAKER = "Antu";
export const VERSION = "2.0.0";
export const REPO_URL = "https://github.com/AntuKumar100/gre-vocab-bangla";
export const SITE_URL = "https://antukumar100.github.io/gre-vocab-bangla/";
export const PRIVACY_URL = `${SITE_URL}privacy.html`;
export const TRADEMARK = "GRE® is a registered trademark of ETS. This app is not endorsed or approved by ETS.";

/** A prefilled GitHub issue for reporting a content mistake. */
export function reportUrl(word?: string, detail = "") {
  const title = word ? `Mistake in "${word}"` : "Problem report";
  const body = [
    word ? `Word: ${word}` : "",
    "What is wrong (meaning, Bangla, story, audio, GRE question)?",
    "",
    detail,
    "",
    `App version ${VERSION}`,
  ]
    .filter((l, i) => l || i > 0)
    .join("\n");
  return `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}
