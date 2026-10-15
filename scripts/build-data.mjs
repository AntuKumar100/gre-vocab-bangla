// Merge content/source.json (synonyms + example from the PDF) with the
// hand-written content/groups/*.json into public/data/vocab.json for the app.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = JSON.parse(readFileSync(join(root, "content/source.json"), "utf8"));
const groupsDir = join(root, "content/groups");

const entryId = (group, word) =>
  `${String(group).padStart(2, "0")}-` + word.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const words = [];
for (const file of readdirSync(groupsDir).filter((f) => f.endsWith(".json")).sort()) {
  const group = Number(file.slice(0, 2));
  const fromPdf = source.filter((e) => e.group === group);
  const written = JSON.parse(readFileSync(join(groupsDir, file), "utf8"));
  written.forEach((w, i) => {
    const pdf = fromPdf[i];
    if (!pdf || pdf.word !== w.word) throw new Error(`group ${group}: ${w.word} does not match source.json`);
    const id = entryId(group, w.word);
    words.push({
      id,
      group,
      word: w.word,
      pos: w.pos,
      en: w.en,
      bn: w.bn,
      hook: w.hook,
      story: w.story,
      synonyms: pdf.synonyms,
      example: pdf.example,
      audio: existsSync(join(root, "public/audio", `${id}.mp3`)),
    });
  });
}

mkdirSync(join(root, "public/data"), { recursive: true });
writeFileSync(join(root, "public/data/vocab.json"), JSON.stringify(words));
console.log(`vocab.json: ${words.length} words, ${words.filter((w) => w.audio).length} with audio`);
