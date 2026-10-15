"""Check content/groups/*.json against content/source.json: same words, all fields filled."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIELDS = ("word", "pos", "en", "bn", "hook", "story")

source = json.loads((ROOT / "content" / "source.json").read_text(encoding="utf-8"))
problems = 0
done = 0
for g in sorted({e["group"] for e in source}):
    path = ROOT / "content" / "groups" / f"{g:02d}.json"
    expected = [e["word"] for e in source if e["group"] == g]
    if not path.exists():
        continue
    entries = json.loads(path.read_text(encoding="utf-8"))
    got = [e["word"] for e in entries]
    if got != expected:
        problems += 1
        print(f"group {g}: missing {sorted(set(expected) - set(got))} extra {sorted(set(got) - set(expected))}")
    for e in entries:
        empty = [f for f in FIELDS if not e.get(f)]
        if empty:
            problems += 1
            print(f"group {g} {e.get('word')}: empty {empty}")
        if e["word"] not in e["story"].lower():
            print(f"note: group {g} {e['word']}: base word not in story (inflected?)")
    done += 1
print(f"{done} groups checked, {problems} problems")
sys.exit(1 if problems else 0)
