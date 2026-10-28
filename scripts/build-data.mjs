// Merge content/sets/*.json into the app's data: public/data/vocab.json holds what the first
// screen needs; public/data/details.json (stories, hooks, examples, GRE items) loads right after.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const setsDir = join(root, "content/sets");

// Expression tags such as [laugh] are for the narrating voice only; readers see plain text.
const forReading = (story) => story.replace(/\s*\[(laugh|chuckle|sigh|gasp)\]\s*/g, " ").replace(/ +([,.;:!?])/g, "$1").replace(/ {2,}/g, " ").trim();

// One id per headword; the narration file is named after it.
const wordId = (word) => word.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const words = [];
for (const file of readdirSync(setsDir).filter((f) => f.endsWith(".json")).sort()) {
  const group = Number(file.slice(0, 2));
  for (const w of JSON.parse(readFileSync(join(setsDir, file), "utf8"))) {
    const id = wordId(w.word);
    words.push({
      id,
      group,
      word: w.word,
      pos: w.pos,
      en: w.en,
      bn: w.bn,
      hook: w.hook,
      story: forReading(w.story),
      synonyms: w.synonyms ?? [],
      example: w.example ?? "",
      ...(w.gre && { gre: w.gre }),
      audio: existsSync(join(root, "public/audio", `${id}.mp3`)),
      say: existsSync(join(root, "public/audio/say", `${id}.mp3`)),
    });
  }
}

const DETAIL = ["hook", "story", "example", "gre"];
const core = words.map((w) => Object.fromEntries(Object.entries(w).filter(([k]) => !DETAIL.includes(k))));
const details = Object.fromEntries(words.map((w) => [w.id, Object.fromEntries(DETAIL.filter((k) => w[k] !== undefined).map((k) => [k, w[k]]))]));
mkdirSync(join(root, "public/data"), { recursive: true });
writeFileSync(join(root, "public/data/vocab.json"), JSON.stringify(core));
writeFileSync(join(root, "public/data/details.json"), JSON.stringify(details));
console.log(`vocab.json: ${words.length} words, ${words.filter((w) => w.audio).length} with audio`);
