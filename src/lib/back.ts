import { useEffect } from "react";

// Open popups (word card, theme menu, level-up) register here so the phone's
// Back button closes the top one before it leaves the page.
const closers: (() => void)[] = [];

export function useBackToClose(close: () => void, open = true) {
  useEffect(() => {
    if (!open) return;
    closers.push(close);
    return () => {
      const i = closers.lastIndexOf(close);
      if (i >= 0) closers.splice(i, 1);
    };
  }, [close, open]);
}

/** Close the most recently opened popup; false when none is open. */
export function closeTopPopup(): boolean {
  const close = closers.pop();
  close?.();
  return !!close;
}
