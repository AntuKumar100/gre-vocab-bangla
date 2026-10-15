import { useEffect, useState, useSyncExternalStore } from "react";
import { audioUrl } from "./data";
import { getProgress } from "./store";
import type { Word } from "./types";

// One shared player so starting a story stops whatever was playing.
const player = typeof Audio !== "undefined" ? new Audio() : null;
let currentId: string | null = null;
/** Stories still to play in "listen to all" mode. */
let queue: Word[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

if (player) {
  for (const ev of ["play", "pause", "timeupdate", "loadedmetadata", "error"]) {
    player.addEventListener(ev, notify);
  }
  player.addEventListener("ended", () => {
    const next = queue.shift();
    if (next) setTimeout(() => startStory(next), 700);
    notify();
  });
}

interface PlayerState {
  id: string | null;
  playing: boolean;
  progress: number;
  error: boolean;
  /** Stories left in "listen to all" mode, including the current one. */
  listening: number;
}

let snapshot: PlayerState = { id: null, playing: false, progress: 0, error: false, listening: 0 };
function getSnapshot(): PlayerState {
  const playing = !!player && !player.paused && !player.ended;
  const next: PlayerState = {
    id: currentId,
    playing,
    progress: player && player.duration ? player.currentTime / player.duration : 0,
    error: !!player?.error,
    listening: queue.length + (playing || queue.length ? 1 : 0),
  };
  if (
    next.id !== snapshot.id ||
    next.playing !== snapshot.playing ||
    next.error !== snapshot.error ||
    next.listening !== snapshot.listening ||
    Math.abs(next.progress - snapshot.progress) > 0.002
  ) {
    snapshot = next;
  }
  return snapshot;
}

function startStory(w: Word) {
  if (!player) return;
  if (currentId !== w.id) {
    currentId = w.id;
    player.src = audioUrl(w);
  }
  player.playbackRate = getProgress().settings.audioRate;
  player.play().catch(() => notify());
}

/** Play one story; this ends any "listen to all" run. */
export function playStory(w: Word) {
  queue = [];
  startStory(w);
}

/** Play several stories back to back, e.g. a whole group while commuting. */
export function playAll(words: Word[]) {
  const list = words.filter((w) => w.audio);
  if (!list.length) return;
  queue = list.slice(1);
  startStory(list[0]);
}

export function stopStory() {
  queue = [];
  player?.pause();
  notify();
}

export function toggleStory(w: Word) {
  if (currentId === w.id && player && !player.paused) player.pause();
  else if (currentId === w.id && player && queue.length) player.play().catch(() => notify());
  else playStory(w);
}

export function seekStory(fraction: number) {
  if (player && player.duration) player.currentTime = fraction * player.duration;
}

export function useStoryPlayer(w: Word) {
  const s = useSyncExternalStore(subscribe, getSnapshot);
  const mine = s.id === w.id;
  return { playing: mine && s.playing, progress: mine ? s.progress : 0, error: mine && s.error };
}

export function usePlayerState() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Pronounce a single word with the browser's speech engine. */
export function speak(text: string) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.85;
  const voice = speechSynthesis.getVoices().find((v) => v.lang === "en-US");
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

export function useSpeechAvailable() {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(typeof speechSynthesis !== "undefined"), []);
  return ok;
}

const AUDIO_CACHE = "story-audio";

/** Save every story MP3 into the offline cache the service worker reads from. */
export async function downloadAllAudio(words: Word[], onProgress: (done: number, total: number) => void) {
  const cache = await caches.open(AUDIO_CACHE);
  const list = words.filter((w) => w.audio);
  let done = 0;
  const queue = list.slice();
  async function worker() {
    for (let w = queue.shift(); w; w = queue.shift()) {
      const url = new URL(audioUrl(w), location.href).href;
      if (!(await cache.match(url))) {
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res);
      }
      onProgress(++done, list.length);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
}

export async function cachedAudioCount() {
  if (typeof caches === "undefined") return 0;
  const cache = await caches.open(AUDIO_CACHE);
  return (await cache.keys()).length;
}
