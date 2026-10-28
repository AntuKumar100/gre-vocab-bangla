import { useCallback, useEffect, useRef, useState } from "react";
import { useBackToClose } from "../lib/back";
import { useT } from "../lib/i18n";
import { updateSettings, useProgress, type Theme } from "../lib/store";
import { Icon, type IconName } from "./Icon";

const THEMES: { id: Theme; label: string; hint: string; icon: IconName }[] = [
  { id: "light", label: "Light", hint: "Bright and colourful", icon: "sun" },
  { id: "dark", label: "Dark", hint: "Deep purple, easy indoors", icon: "moon" },
  { id: "night", label: "Night", hint: "Black and warm, for late study", icon: "night" },
  { id: "system", label: "Match phone", hint: "Follows your phone's setting", icon: "phone" },
];

/** The header's theme button: a small menu of Light, Dark, Night and Match phone. */
export function ThemeMenu() {
  const t = useT();
  const { theme } = useProgress().settings;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useBackToClose(close, open);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("pointerdown", onDown);
    addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLButtonElement>("[aria-checked=true]")?.focus();
    return () => {
      removeEventListener("pointerdown", onDown);
      removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const icon = THEMES.find((x) => x.id === theme)?.icon ?? "phone";
  return (
    <div className="theme-menu" ref={ref}>
      <button
        className={`icon-btn${open ? " on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={t("Theme")}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="theme-icon" key={icon}>
          <Icon name={icon} />
        </span>
      </button>
      {open && (
        <div className="theme-pop" role="menu" aria-label={t("Theme")}>
          {THEMES.map((x) => (
            <button
              key={x.id}
              role="menuitemradio"
              aria-checked={theme === x.id}
              className={`theme-opt t-${x.id}`}
              onClick={() => {
                updateSettings({ theme: x.id });
                close();
              }}
            >
              <span className="theme-swatch">
                <Icon name={x.icon} size={18} />
              </span>
              <span className="theme-text">
                <strong>{t(x.label)}</strong>
                <small>{t(x.hint)}</small>
              </span>
              {theme === x.id && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
