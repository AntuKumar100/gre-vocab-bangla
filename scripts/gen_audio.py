"""Generate story narration MP3s with the Kokoro open-source TTS model.

Reads content/groups/*.json and writes public/audio/<slug>.mp3 for every entry
whose audio is missing or whose story text changed (tracked in
content/audio-manifest.json).

Setup (once):
  pip install kokoro-onnx soundfile
  download kokoro-v1.0.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Usage: python scripts/gen_audio.py <model-dir> [--voice af_heart] [--shard i/n]
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


def slug(word):
    return re.sub(r"[^a-z0-9]+", "-", word.lower()).strip("-")


def narration(entry):
    return f"{entry['word'].capitalize()}. {entry['story']}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model_dir")
    ap.add_argument("--voice", default="af_heart")
    ap.add_argument("--speed", type=float, default=0.95)
    ap.add_argument("--shard", default="0/1")
    args = ap.parse_args()
    shard, nshards = map(int, args.shard.split("/"))

    AUDIO.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    entries = [e for f in sorted(GROUPS.glob("*.json")) for e in json.loads(f.read_text(encoding="utf-8"))]
    todo = []
    for e in entries:
        text = narration(e)
        key = hashlib.sha1(f"{args.voice}|{args.speed}|{text}".encode()).hexdigest()[:12]
        out = AUDIO / f"{slug(e['word'])}.mp3"
        if manifest.get(slug(e["word"])) != key or not out.exists():
            todo.append((e, text, key, out))
    todo = [t for i, t in enumerate(todo) if i % nshards == shard]
    print(f"{len(todo)} files to generate")

    kokoro = Kokoro(f"{args.model_dir}/kokoro-v1.0.onnx", f"{args.model_dir}/voices-v1.0.bin")
    done = {}
    for i, (e, text, key, out) in enumerate(todo, 1):
        samples, sr = kokoro.create(text, voice=args.voice, speed=args.speed, lang="en-us")
        wav = io.BytesIO()
        sf.write(wav, samples, sr, format="WAV")
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", "-", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "40k", str(out)],
            input=wav.getvalue(), check=True,
        )
        done[slug(e["word"])] = key
        if i % 20 == 0 or i == len(todo):
            print(f"{i}/{len(todo)} {e['word']}", flush=True)

    # Re-read so parallel shards don't clobber each other's entries.
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    manifest.update(done)
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=1) + "\n")


if __name__ == "__main__":
    main()
