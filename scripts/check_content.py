"""Check content/sets/*.json: every field filled, GRE items and stories well formed, no duplicate words."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIELDS = ("word", "pos", "en", "bn", "hook", "story", "synonyms", "example", "gre")

problems, seen, count = 0, set(), 0
for path in sorted((ROOT / "content" / "sets").glob("*.json")):
    for e in json.loads(path.read_text(encoding="utf-8")):
        count += 1
        where = f"set {path.stem} {e.get('word')}"
        empty = [f for f in FIELDS if not e.get(f)]
        if empty:
            problems += 1
            print(f"{where}: empty {empty}")
            continue
        if e["word"] in seen:
            problems += 1
            print(f"{where}: duplicate word")
        seen.add(e["word"])
        g = e["gre"]
        if g["s"].count("____") != 1 or g["clue"] not in g["s"] or re.search(r"[A-Za-z]____|____[A-Za-z]", g["s"]):
            problems += 1
            print(f"{where}: malformed GRE item")
        story = e["story"]
        tags = set(re.findall(r"\[([a-z]+)\]", story))
        if story.count("...") != 1 or not tags <= {"laugh", "chuckle", "sigh", "gasp"}:
            problems += 1
            print(f"{where}: story needs one self-test pause and only known expression tags")
        name = re.sub(r"[^a-z0-9]+", "-", e["word"].lower()).strip("-") + ".mp3"
        if not (ROOT / "public" / "audio" / name).exists():
            problems += 1
            print(f"{where}: no audio file")
        if not (ROOT / "public" / "audio" / "say" / name).exists():
            problems += 1
            print(f"{where}: no pronunciation file (run scripts/gen_words.py)")
print(f"{count} words checked, {problems} problems")
