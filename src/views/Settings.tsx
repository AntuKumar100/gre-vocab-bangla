import { useEffect, useRef, useState } from "react";
import { cachedAudioCount, downloadAllAudio } from "../lib/audio";
import { useApp } from "../lib/context";
import { exportProgress, importProgress, resetProgress, updateSettings, useProgress, type Theme } from "../lib/store";

export function Settings() {
  const { index } = useApp();
  const { settings } = useProgress();
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null);
  const [cached, setCached] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const withAudio = index.words.filter((w) => w.audio).length;

  useEffect(() => {
    cachedAudioCount().then(setCached, () => setCached(null));
  }, [dl]);

  const download = async () => {
    setDl({ done: 0, total: withAudio });
    try {
      await downloadAllAudio(index.words, (done, total) => setDl({ done, total }));
      setMsg("All story audio is saved for offline use.");
    } catch {
      setMsg("Download stopped. Check your connection and try again; finished files are kept.");
    }
    setDl(null);
  };

  const save = () => {
    const blob = new Blob([exportProgress()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gre-vocab-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="page settings">
      <h1>Settings</h1>

      <section className="panel">
        <h2>Study</h2>
        <label className="field row">
          <span>New words per day (goal)</span>
          <input
            type="number"
            min={5}
            max={100}
            step={5}
            value={settings.newPerDay}
            onChange={(e) => updateSettings({ newPerDay: Number(e.target.value) || 20 })}
          />
        </label>
        <label className="field row">
          <span>Review direction</span>
          <select value={settings.reverse ? "reverse" : "forward"} onChange={(e) => updateSettings({ reverse: e.target.value === "reverse" })}>
            <option value="forward">See the word, recall the meaning</option>
            <option value="reverse">See the meaning, recall the word</option>
          </select>
        </label>
        <label className="field row check">
          <input type="checkbox" checked={settings.autoplay} onChange={(e) => updateSettings({ autoplay: e.target.checked })} />
          <span>Play the story automatically when a card opens</span>
        </label>
        <label className="field row">
          <span>Story speed: {settings.audioRate.toFixed(2)}×</span>
          <input
            type="range"
            min={0.7}
            max={1.5}
            step={0.05}
            value={settings.audioRate}
            onChange={(e) => updateSettings({ audioRate: Number(e.target.value) })}
          />
        </label>
        <label className="field row">
          <span>Theme</span>
          <select value={settings.theme} onChange={(e) => updateSettings({ theme: e.target.value as Theme })}>
            <option value="system">Match device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </section>

      <section className="panel">
        <h2>Offline audio</h2>
        <p className="muted small">
          {withAudio} stories have narration (about {Math.round(withAudio * 0.09)} MB). Download them once to listen without
          internet, for example on the bus.
          {cached !== null && ` ${cached} saved on this device.`}
        </p>
        {dl ? (
          <div className="progress-track tall">
            <div className="progress-fill" style={{ width: `${(dl.done / dl.total) * 100}%` }} />
            <span>
              {dl.done} / {dl.total}
            </span>
          </div>
        ) : (
          <button className="btn" onClick={download} disabled={typeof caches === "undefined"}>
            Download all story audio
          </button>
        )}
        {msg && <p className="small">{msg}</p>}
      </section>

      <section className="panel">
        <h2>Your data</h2>
        <p className="muted small">
          Progress is saved in this browser only. Export a backup to move it to another device or browser.
        </p>
        <div className="actions-row">
          <button className="btn" onClick={save}>
            Export progress
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import progress
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm("Delete all progress on this device? This cannot be undone.")) resetProgress();
            }}
          >
            Reset progress
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              importProgress(await f.text());
              setMsg("Progress imported.");
            } catch {
              setMsg("That file is not a valid progress backup.");
            }
            e.target.value = "";
          }}
        />
      </section>
    </div>
  );
}
