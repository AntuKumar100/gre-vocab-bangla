"""Narrate stories with an expressive voice (Chatterbox Turbo, MIT licence).

Stories may contain expression tags such as [laugh], [chuckle], [sigh] and [gasp],
which the model performs, and one "..." that marks the self-test pause.
The voice copies voice/reference.wav, a clip of the app's original synthetic voice.

Two ways to run it:
  python scripts/gen_audio_v2.py sets [--shard i/n] [--done-file f]
      narrate every story in content/sets whose text changed (tracked in
      content/audio-manifest.json) into public/audio/<word>.mp3
  python scripts/gen_audio_v2.py <stories.json> <out-dir> [--shard i/n]
      narrate a list of {"word", "story"} (used for listening trials)
Runs on CPU; the model downloads from Hugging Face on first use.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import time
from pathlib import Path

import torch
import torchaudio as ta
from chatterbox.tts_turbo import ChatterboxTurboTTS

ROOT = Path(__file__).resolve().parent.parent
SETS = ROOT / "content" / "sets"
AUDIO = ROOT / "public" / "audio"
MANIFEST = ROOT / "content" / "audio-manifest.json"
REFERENCE = ROOT / "voice" / "reference.wav"
ENGINE = "chatterbox-turbo"
SELF_TEST_PAUSE = 1.8  # seconds of silence for the listener to answer in their head
SENTENCE_GAP = 0.25
MAX_CHUNK = 220  # characters per generation call; long inputs drift
BITRATE = "32k"  # keeps all 1,110 stories within Google Play's 200 MB app limit


def word_id(word):
    return re.sub(r"[^a-z0-9]+", "-", word.lower()).strip("-")


def chunks(text):
    """Group sentences into chunks of at most MAX_CHUNK characters."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    out, cur = [], ""
    for s in sentences:
        if cur and len(cur) + 1 + len(s) > MAX_CHUNK:
            out.append(cur)
            cur = s
        else:
            cur = f"{cur} {s}".strip()
    if cur:
        out.append(cur)
    return out


def narrate(model, story):
    sr = model.sr
    pieces = []
    for i, part in enumerate(story.split("...")):
        if i > 0:
            pieces.append(torch.zeros(1, int(SELF_TEST_PAUSE * sr)))
        for chunk in chunks(part):
            wav = model.generate(chunk, audio_prompt_path=str(REFERENCE))
            pieces += [wav.cpu(), torch.zeros(1, int(SENTENCE_GAP * sr))]
    return torch.cat(pieces, dim=1), sr


def save_mp3(wav, sr, path):
    tmp = path.with_suffix(".wav")
    ta.save(str(tmp), wav, sr)
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-y", "-i", str(tmp), "-ac", "1", "-codec:a", "libmp3lame", "-b:a", BITRATE, str(path)],
        check=True,
    )
    tmp.unlink()


def story_key(story, ref_hash):
    return hashlib.sha1(f"{ENGINE}|{ref_hash}|{story}".encode()).hexdigest()[:12]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", help='"sets" or a JSON file of {word, story}')
    ap.add_argument("out", nargs="?", help="output folder for a JSON file source")
    ap.add_argument("--shard", default="0/1")
    ap.add_argument("--done-file", help="write this run's manifest entries here instead of updating the manifest")
    args = ap.parse_args()
    shard, nshards = map(int, args.shard.split("/"))
    torch.set_num_threads(os.cpu_count() or 4)
    ref_hash = hashlib.sha1(REFERENCE.read_bytes()).hexdigest()[:8]

    if args.source == "sets":
        manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
        todo = []
        for f in sorted(SETS.glob("*.json")):
            for e in json.loads(f.read_text(encoding="utf-8")):
                eid, key = word_id(e["word"]), story_key(e["story"], ref_hash)
                out = AUDIO / f"{eid}.mp3"
                if manifest.get(eid) != key or not out.exists():
                    todo.append((eid, e["word"], e["story"], key, out))
    else:
        out_dir = Path(args.out)
        out_dir.mkdir(parents=True, exist_ok=True)
        items = json.loads(Path(args.source).read_text(encoding="utf-8"))
        todo = [(word_id(it["word"]), it["word"], it["story"], "", out_dir / f"{word_id(it['word'])}.mp3") for it in items]
    todo = [t for i, t in enumerate(todo) if i % nshards == shard]
    print(f"{len(todo)} files to generate", flush=True)
    if not todo:
        if args.done_file:
            Path(args.done_file).write_text("{}\n")
        return

    AUDIO.mkdir(parents=True, exist_ok=True)
    model = ChatterboxTurboTTS.from_pretrained(device="cpu")
    done = {}
    for n, (eid, word, story, key, out) in enumerate(todo, 1):
        start = time.time()
        wav, sr = narrate(model, story)
        save_mp3(wav, sr, out)
        done[eid] = key
        print(f"{n}/{len(todo)} {word}: {wav.shape[1] / sr:.0f}s of audio in {time.time() - start:.0f}s", flush=True)

    if args.source != "sets":
        return
    if args.done_file:
        Path(args.done_file).write_text(json.dumps(done, indent=1) + "\n")
        return
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    manifest.update(done)
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=1) + "\n")


if __name__ == "__main__":
    main()
