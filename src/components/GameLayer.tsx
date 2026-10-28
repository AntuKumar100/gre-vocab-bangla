import { useCallback, useEffect, useState } from "react";
import { useBackToClose } from "../lib/back";
import { celebrate, sfx } from "../lib/fx";
import { useT } from "../lib/i18n";
import { levelTitle, onXp } from "../lib/store";
import { Icon } from "./Icon";

interface Float {
  id: number;
  gained: number;
}

/** Floating "+XP" pops by the header chip and the level-up celebration. */
export function GameLayer({ routeKey }: { routeKey: string }) {
  const [floats, setFloats] = useState<Float[]>([]);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const t = useT();
  const closeLevelUp = useCallback(() => setLevelUp(null), []);
  useBackToClose(closeLevelUp, levelUp !== null);

  useEffect(
    () =>
      onXp((e) => {
        const id = Date.now() + Math.random();
        setFloats((f) => [...f.slice(-3), { id, gained: e.gained }]);
        setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1300);
        const chip = document.getElementById("xp-chip");
        chip?.classList.remove("bump");
        void chip?.offsetWidth;
        chip?.classList.add("bump");
        if (e.levelUp) {
          setLevelUp(e.levelUp);
          sfx("levelUp");
          celebrate();
        }
      }),
    [],
  );

  // Moving to another screen closes the celebration.
  useEffect(() => setLevelUp(null), [routeKey]);

  useEffect(() => {
    if (levelUp === null) return;
    const t = setTimeout(() => setLevelUp(null), 3800);
    return () => clearTimeout(t);
  }, [levelUp]);

  return (
    <>
      <div className="xp-floats" aria-hidden>
        {floats.map((f) => (
          <span key={f.id} className="xp-float">
            +{f.gained} XP
          </span>
        ))}
      </div>
      {levelUp !== null && (
        <div className="levelup" role="status" onClick={() => setLevelUp(null)}>
          <div className="levelup-card">
            <div className="levelup-badge">
              <Icon name="crown" size={34} />
              <span>{levelUp}</span>
            </div>
            <strong>{t("Level up!")}</strong>
            <span>{t("You are now a {title}", { title: t(levelTitle(levelUp)) })}</span>
          </div>
        </div>
      )}
    </>
  );
}

