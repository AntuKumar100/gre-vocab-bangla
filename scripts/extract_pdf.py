"""Extract the English columns of the GregMAT word list PDF into content/source.json.

The Bangla column is skipped: the PDF's text layer for Bangla is broken
(conjuncts are missing and vowel signs come out reordered), so Bangla
meanings live in content/groups/*.json instead.

Usage: python scripts/extract_pdf.py <path-to-pdf>
"""
import json
import re
import sys
from pathlib import Path

import pdfplumber

OUT = Path(__file__).resolve().parent.parent / "content" / "source.json"


def clean(s):
    s = re.sub(r"\s+", " ", (s or "").replace("\n", " ").replace("*", ""))
    # Line breaks inside hyphenated words come out as "self- denial".
    return re.sub(r"(\w)- (\w)", r"\1-\2", s).strip()


DEFAULT_COLUMNS = ["word", "synonyms", "meaning", "bangla", "example"]


def column_kind(header):
    h = header.lower()
    if "bangla" in h:
        return "bangla"
    if "synonym" in h:
        return "synonyms"
    if "meaning" in h or "definition" in h:
        return "meaning"
    if "sentence" in h or "example" in h:
        return "example"
    return "word"


def sentence_case(s):
    return s[:1].upper() + s[1:] if s else s


def main(pdf_path):
    entries = []
    with pdfplumber.open(pdf_path) as pdf:
        group = None
        columns = DEFAULT_COLUMNS
        for page in pdf.pages:
            m = re.search(r"Sheet\s*(\d+)", page.extract_text() or "")
            if m:
                group = int(m.group(1))
            for table in page.extract_tables():
                for row in table:
                    cells = [clean(c) for c in row[:5]]
                    if cells[0].lower() in ("word", "gre word"):
                        # Most sheets order the columns the same way, but not all.
                        columns = [column_kind(h) for h in cells]
                        continue
                    if not cells[0]:
                        continue
                    by_kind = dict(zip(columns, cells))
                    word, syn, meaning, example = (by_kind[k] for k in ("word", "synonyms", "meaning", "example"))
                    entries.append({
                        "group": group,
                        "word": word.lower(),
                        "synonyms": [s.strip().lower() for s in syn.split(",") if s.strip()],
                        "meaning": sentence_case(meaning.rstrip(".")),
                        "example": sentence_case(example),
                    })
    OUT.write_text(json.dumps(entries, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"wrote {len(entries)} entries to {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
