import { useSyncExternalStore } from "react";

function current() {
  return location.hash.replace(/^#/, "") || "/";
}

export function useRoute(): string[] {
  const path = useSyncExternalStore(
    (l) => (addEventListener("hashchange", l), () => removeEventListener("hashchange", l)),
    current,
  );
  return path.split("/").filter(Boolean);
}

export function go(path: string) {
  location.hash = path;
  scrollTo(0, 0);
}
