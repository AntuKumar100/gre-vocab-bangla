import { Capacitor } from "@capacitor/core";

/** True inside the Android app, false in a browser. */
export const isNative = Capacitor.isNativePlatform();

const REMINDER_ID = 1;

/**
 * Schedule (or cancel, with an empty time) the daily study reminder.
 * Returns false when the learner declines notification permission.
 */
export async function setDailyReminder(time: string): Promise<boolean> {
  if (!isNative) return false;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  if (!time) return true;
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return false;
  const [hour, minute] = time.split(":").map(Number);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: "Shobdo Quest",
        body: "Your words are waiting. Five minutes keeps your streak alive.",
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      },
    ],
  });
  return true;
}

/**
 * Save a progress backup. In the app it opens the share sheet (Drive, email, Files);
 * in a browser it downloads the file.
 */
export async function saveBackup(json: string, fileName: string) {
  if (isNative) {
    const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const file = await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: "Shobdo Quest backup", url: file.uri });
    return;
  }
  const blob = new Blob([json], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Listen for the phone's Back button (Android app only). Returns a function that stops listening. */
export function onBackButton(handler: () => void): () => void {
  if (!isNative) return () => {};
  let stop: (() => void) | null = null;
  let cancelled = false;
  void import("@capacitor/app")
    .then(({ App }) => App.addListener("backButton", handler))
    .then((h) => {
      if (cancelled) void h.remove();
      else stop = () => void h.remove();
    });
  return () => {
    cancelled = true;
    stop?.();
  };
}

export async function exitApp() {
  const { App } = await import("@capacitor/app");
  await App.exitApp();
}

/** Match the status bar icons to the app's theme: light icons on a dark theme. `null` follows the phone. */
export async function setStatusBarDark(dark: boolean | null) {
  if (!isNative) return;
  const { SystemBars, SystemBarsStyle } = await import("@capacitor/core");
  // Older Android web views sit below the status bar instead of behind it; the bar
  // then shows the phone's own light or dark background, so follow the phone.
  const inset = getComputedStyle(document.documentElement).getPropertyValue("--safe-area-inset-top").trim();
  if (inset === "0px") dark = null;
  const style = dark === null ? SystemBarsStyle.Default : dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light;
  await SystemBars.setStyle({ style });
}

/** A short vibration for a right or wrong answer. */
export function buzz(ok: boolean) {
  if (isNative) {
    void import("@capacitor/haptics").then(({ Haptics, NotificationType }) =>
      Haptics.notification({ type: ok ? NotificationType.Success : NotificationType.Error }),
    );
  } else if ("vibrate" in navigator) {
    navigator.vibrate(ok ? 25 : [40, 60, 40]);
  }
}
