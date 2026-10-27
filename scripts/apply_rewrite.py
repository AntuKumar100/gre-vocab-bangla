"""Merge a batch of rewritten stories and GRE sentence items into content/sets/NN.json.

Batch file: JSON list of {word, story, s, pair, trap, clue}, in the group's word order.
  s     GRE-style sentence with one blank written as ____ where the word fits
  pair  a second word that fits the blank with the same meaning (Sentence Equivalence)
  trap  a tempting wrong answer, usually the opposite of what the clue demands
  clue  the phrase in s that points to the answer (shown in explanations)

Usage: python scripts/apply_rewrite.py <set-number> <batch.json>
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main(group, batch_path):
    path = ROOT / "content" / "sets" / f"{group:02d}.json"
    entries = json.loads(path.read_text(encoding="utf-8"))
    batch = json.loads(Path(batch_path).read_text(encoding="utf-8"))
    if [b["word"] for b in batch] != [e["word"] for e in entries]:
        raise SystemExit(f"group {group}: word order differs from {path.name}")
    for e, b in zip(entries, batch):
        problems = []
        if b["s"].count("____") != 1:
            problems.append("sentence needs exactly one ____")
        if re.search(r"[A-Za-z]____|____[A-Za-z]", b["s"]):
            problems.append("blank must stand alone, not inside a word")
        if b["clue"] not in b["s"]:
            problems.append("clue is not a substring of the sentence")
        if b["pair"].lower() == e["word"] or b["trap"].lower() == e["word"]:
            problems.append("pair/trap repeats the word")
        stem = e["word"][: max(4, len(e["word"]) - 2)].lower()
        if stem not in b["story"].lower():
            problems.append("word missing from story")
        if problems:
            raise SystemExit(f"group {group} {e['word']}: " + "; ".join(problems))
        e["story"] = b["story"]
        e["gre"] = {k: b[k] for k in ("s", "pair", "trap", "clue")}
    path.write_text("[\n" + ",\n".join(" " + json.dumps(e, ensure_ascii=False) for e in entries) + "\n]\n", encoding="utf-8")
    lengths = [len(b["story"].split()) for b in batch]
    print(f"group {group}: {len(batch)} entries, story words {min(lengths)}-{max(lengths)}")


if __name__ == "__main__":
    main(int(sys.argv[1]), sys.argv[2])
