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
