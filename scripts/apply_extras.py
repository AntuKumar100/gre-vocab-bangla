"""Merge a batch of synonym lists, example sentences and (optionally) reworded
definitions into content/sets/NN.json.

Batch file: JSON list of {word, synonyms, example, en?} in the set's word order.
  synonyms  3-5 lowercase words or short phrases with the same meaning
  example   one original sentence that uses the word naturally
  en        optional new wording of the English definition (same sense)

Usage: python scripts/apply_extras.py <set-number> <batch.json> [--reference ref.json]
The reference file, if given, holds text this content must not copy
({"pdf": {word: {meaning, synonyms, example}}}); close matches are rejected.
"""
import difflib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def similar(a, b):
    return difflib.SequenceMatcher(a=a.lower(), b=b.lower()).ratio()


def main(set_no, batch_path, reference=None):
    path = ROOT / "content" / "sets" / f"{set_no:02d}.json"
    entries = json.loads(path.read_text(encoding="utf-8"))
    batch = json.loads(Path(batch_path).read_text(encoding="utf-8"))
    ref = json.loads(Path(reference).read_text(encoding="utf-8"))["pdf"] if reference else {}
    if [b["word"] for b in batch] != [e["word"] for e in entries]:
        raise SystemExit(f"set {set_no}: word order differs from {path.name}")
    for e, b in zip(entries, batch):
        w, problems = e["word"], []
        syns = b["synonyms"]
        if not 3 <= len(syns) <= 5 or len(set(syns)) != len(syns):
            problems.append("need 3-5 different synonyms")
        if any(s != s.lower() or s == w or len(s.split()) > 3 for s in syns):
            problems.append("synonyms must be lowercase, short and differ from the word")
        ex = b["example"].strip()
        stem = w.split()[0][: max(4, len(w.split()[0]) - 2)].lower()
        if stem not in ex.lower():
            problems.append("example must use the word")
        if not 8 <= len(ex.split()) <= 32 or ex.count(". ") > 0:
            problems.append("example must be one sentence of 8-32 words")
        if similar(ex, e["gre"]["s"].replace("____", w)) > 0.5 or similar(ex, e["story"][:200]) > 0.5:
            problems.append("example repeats the GRE sentence or the story")
        if b.get("en") is not None and len(b["en"].split()) < 2:
            problems.append("definition too short")
        if w in ref:
            r = ref[w]
            if similar(ex, r["example"]) > 0.5:
                problems.append("example too close to the reference")
            if sorted(syns) == sorted(s.lower() for s in r["synonyms"]):
                problems.append("synonym list identical to the reference")
            if b.get("en") and similar(b["en"], r["meaning"]) > 0.7:
                problems.append("definition too close to the reference")
        if problems:
            raise SystemExit(f"set {set_no} {w}: " + "; ".join(problems))
        e["synonyms"] = syns
        e["example"] = ex
        if b.get("en"):
            e["en"] = b["en"].strip()
    path.write_text("[\n" + ",\n".join(" " + json.dumps(e, ensure_ascii=False) for e in entries) + "\n]\n", encoding="utf-8")
    print(f"set {set_no}: {len(batch)} entries, {sum(1 for b in batch if b.get('en'))} definitions reworded")


if __name__ == "__main__":
    args = sys.argv[1:]
    ref = None
    if "--reference" in args:
        i = args.index("--reference")
        ref = args[i + 1]
        del args[i : i + 2]
    main(int(args[0]), args[1], ref)
