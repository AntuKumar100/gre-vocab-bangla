"""Replace the stories of a set with a new batch, after checking each one.

Batch file: JSON list of {word, story} in the set's word order. A story starts with
the word, gives its meaning, shows it in a scene, ends with a self-test ("question? ... Word.")
and may carry expression tags for the narrating voice: [laugh] [chuckle] [sigh] [gasp].

Usage: python scripts/apply_stories.py <set-number> <batch.json>
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TAGS = {"laugh", "chuckle", "sigh", "gasp"}


def main(set_no, batch_path):
    path = ROOT / "content" / "sets" / f"{set_no:02d}.json"
    entries = json.loads(path.read_text(encoding="utf-8"))
    batch = json.loads(Path(batch_path).read_text(encoding="utf-8"))
    if [b["word"] for b in batch] != [e["word"] for e in entries]:
        raise SystemExit(f"set {set_no}: word order differs from {path.name}")
    for e, b in zip(entries, batch):
        s, w = b["story"].strip(), e["word"]
        plain = re.sub(r"\[[a-z]+\]", " ", s)
        problems = []
        if not s.lower().startswith(w.lower() + "."):
            problems.append("must start with the word and a period")
        if s.count("...") != 1:
            problems.append("needs exactly one self-test pause")
        if not set(re.findall(r"\[([a-z]+)\]", s)) <= TAGS:
            problems.append("unknown expression tag")
        if not 60 <= len(plain.split()) <= 110:
            problems.append(f"{len(plain.split())} words")
        if re.search(r"[()/]", s):
            problems.append("no parentheses or slashes")
        if problems:
            raise SystemExit(f"set {set_no} {w}: " + "; ".join(problems))
        e["story"] = s
    path.write_text("[\n" + ",\n".join(" " + json.dumps(e, ensure_ascii=False) for e in entries) + "\n]\n", encoding="utf-8")
    print(f"set {set_no}: {len(batch)} stories applied")


if __name__ == "__main__":
    main(int(sys.argv[1]), sys.argv[2])
