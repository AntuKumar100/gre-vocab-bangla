let show: ((msg: string) => void) | null = null;

/** A short message at the bottom of the screen, e.g. "Press back again to exit". */
export function toast(msg: string) {
  show?.(msg);
}

/** Used by <Toaster />, which displays the messages. */
export function setToastHandler(handler: typeof show) {
  show = handler;
}
