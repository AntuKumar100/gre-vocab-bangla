import confetti from "canvas-confetti";
import { buzz } from "./native";
import { getProgress } from "./store";

// Small game-feel layer: synthesized sound effects and confetti bursts.
// Both respect the Settings toggles; confetti also respects reduced motion.

let ctx: AudioContext | null = null;
function audio() {
  if (typeof AudioContext === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** One soft synth note: frequency in Hz, start offset and length in seconds. */
function note(a: AudioContext, freq: number, at: number, len: number, type: OscillatorType = "sine", gain = 0.16) {
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t = a.currentTime + at;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + len + 0.05);
}

const SOUNDS = {
  correct: (a: AudioContext) => {
    note(a, 659.25, 0, 0.14, "triangle");
    note(a, 987.77, 0.09, 0.26, "triangle");
  },
  wrong: (a: AudioContext) => {
    note(a, 196, 0, 0.18, "square", 0.06);
    note(a, 155.56, 0.12, 0.28, "square", 0.06);
  },
  flip: (a: AudioContext) => note(a, 520, 0, 0.07, "sine", 0.08),
  tap: (a: AudioContext) => note(a, 760, 0, 0.05, "sine", 0.06),
  combo: (a: AudioContext) => [784, 988, 1175].forEach((f, i) => note(a, f, i * 0.06, 0.16, "triangle", 0.12)),
  levelUp: (a: AudioContext) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(a, f, i * 0.1, 0.35, "triangle", 0.14)),
  finish: (a: AudioContext) =>
    [392, 523.25, 659.25, 783.99, 659.25, 783.99, 1046.5].forEach((f, i) => note(a, f, i * 0.09, 0.3, "triangle", 0.12)),
};

export type Sound = keyof typeof SOUNDS;

export function sfx(name: Sound) {
  const { sounds, haptics } = getProgress().settings;
  if (haptics && (name === "correct" || name === "combo" || name === "wrong")) buzz(name !== "wrong");
  if (!sounds) return;
  const a = audio();
  if (a) SOUNDS[name](a);
}

const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const effectsOn = () => getProgress().settings.effects && !reducedMotion();

const COLORS = ["#7c3aed", "#a855f7", "#ec4899", "#f97316", "#facc15", "#22c55e"];

/** A small burst from an element (e.g. the answer the learner just got right). */
export function burstFrom(el: Element | null, particles = 40) {
  if (!effectsOn() || !el) return;
  const r = el.getBoundingClientRect();
  confetti({
    particleCount: particles,
    spread: 70,
    startVelocity: 32,
    scalar: 0.8,
    ticks: 120,
    colors: COLORS,
    origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
  });
}

/** Big celebration from both sides of the screen. */
export function celebrate() {
  if (!effectsOn()) return;
  const end = Date.now() + 900;
  (function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors: COLORS });
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors: COLORS });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

/** Restart a CSS animation class on an element (shake on a wrong answer, pop on a right one). */
export function replay(el: Element | null, cls: string) {
  if (!el) return;
  el.classList.remove(cls);
  void (el as HTMLElement).offsetWidth;
  el.classList.add(cls);
}
