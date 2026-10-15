"""Generate story narration MP3s with the Kokoro open-source TTS model.

Reads content/groups/*.json and writes public/audio/<id>.mp3 for every entry
whose audio is missing or whose story text changed (tracked in
content/audio-manifest.json).

Setup (once):
  pip install kokoro-onnx soundfile
  download kokoro-v1.0.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Usage: python scripts/gen_audio.py <model-dir> [--voice af_heart] [--shard i/n] [--rewritten-only] [--done-file f]

In CI, .github/workflows/audio.yml runs this across parallel shards.
"""
import argparse
import hashlib
import io
import json
import re
import subprocess
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
GROUPS = ROOT / "content" / "groups"
AUDIO = ROOT / "public" / "audio"
MANIFEST = ROOT / "content" / "audio-manifest.json"


def entry_id(group, word):
    # Group-prefixed so a word listed in two groups gets two files.
    return f"{group:02d}-" + re.sub(r"[^a-z0-9]+", "-", word.lower()).strip("-")


def narration(entry):
    return f"{entry['word'].capitalize()}. {entry['story']}"


# Headwords whose GRE sense is pronounced differently from espeak's default
# reading: (default IPA, correct IPA, how many occurrences to fix; None = all).
PRONUNCIATION = {
    "minute": ("mˈɪnɪt", "maɪnˈuːt", None),
    "content": ("kˈɑːntɛnt", "kəntˈɛnt", None),
    "august": ("ˈɔːɡəst", "ɔːɡˈʌst", None),
    "intimate": ("ˈɪntᵻmət", "ˈɪntᵻmˌeɪt", 2),  # the story's last uses are the adjective
    "compound": ("kˈɑːmpaʊnd", "kəmpˈaʊnd", None),
    "discount": ("dˈɪskaʊnt", "dɪskˈaʊnt", None),
}


def phonemes_for(kokoro, entry, text):
    fix = PRONUNCIATION.get(entry["word"])
    if not fix:
        return None
    wrong, right, count = fix
    ipa = kokoro.tokenizer.phonemize(text, "en-us")
    if wrong not in ipa:
        raise SystemExit(f"{entry['word']}: expected {wrong} in phonemes, got {ipa[:80]}")
    return ipa.replace(wrong, right, -1 if count is None else count)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model_dir")
    ap.add_argument("--voice", default="af_heart")
    # Slow, clear narration with real pauses between sentences.
    ap.add_argument("--speed", type=float, default=0.82)
    ap.add_argument("--sentence-pause", type=float, default=0.45)
    ap.add_argument("--clause-pause", type=float, default=0.15)
    ap.add_argument("--rewritten-only", action="store_true", help="skip entries without GRE items yet")
    ap.add_argument("--shard", default="0/1")
    ap.add_argument("--done-file", help="write only this run's manifest entries here instead of updating the manifest")
    args = ap.parse_args()
    shard, nshards = map(int, args.shard.split("/"))

    AUDIO.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    todo = []
    for f in sorted(GROUPS.glob("*.json")):
        for e in json.loads(f.read_text(encoding="utf-8")):
            if args.rewritten_only and "gre" not in e:
                continue
            eid = entry_id(int(f.stem), e["word"])
            text = narration(e)
            fix = PRONUNCIATION.get(e["word"])
            key_src = f"{args.voice}|{args.speed}|{args.sentence_pause}|{args.clause_pause}|{text}" + (f"|{fix}" if fix else "")
            key = hashlib.sha1(key_src.encode()).hexdigest()[:12]
            out = AUDIO / f"{eid}.mp3"
            if manifest.get(eid) != key or not out.exists():
                todo.append((eid, e, text, key, out))
    todo = [t for i, t in enumerate(todo) if i % nshards == shard]
    print(f"{len(todo)} files to generate")

    kokoro = Kokoro(f"{args.model_dir}/kokoro-v1.0.onnx", f"{args.model_dir}/voices-v1.0.bin")
    pauses = {"sentence_pause": args.sentence_pause, "clause_pause": args.clause_pause}
    done = {}
    for i, (eid, e, text, key, out) in enumerate(todo, 1):
        ipa = phonemes_for(kokoro, e, text)
        if ipa:
            samples, sr = kokoro.create(ipa, voice=args.voice, speed=args.speed, lang="en-us", is_phonemes=True, **pauses)
        else:
            samples, sr = kokoro.create(text, voice=args.voice, speed=args.speed, lang="en-us", **pauses)
        wav = io.BytesIO()
        sf.write(wav, samples, sr, format="WAV")
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", "-", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "32k", str(out)],
            input=wav.getvalue(), check=True,
        )
        done[eid] = key
        if i % 20 == 0 or i == len(todo):
            print(f"{i}/{len(todo)} {e['word']}", flush=True)

    if args.done_file:
        Path(args.done_file).write_text(json.dumps(done, indent=1) + "\n")
        return
    # Re-read so parallel shards don't clobber each other's entries.
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    manifest.update(done)
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=1) + "\n")


if __name__ == "__main__":
    main()
