"""Narrate stories with an expressive voice (Chatterbox Turbo, MIT licence).

Stories may contain expression tags such as [laugh], [chuckle], [sigh] and [gasp],
which the model performs, and one "..." that marks the self-test pause.
The voice copies voice/reference.wav, a clip of the app's original synthetic voice.

Usage:
  python scripts/gen_audio_v2.py <stories.json> <out-dir> [--shard i/n]
stories.json is a list of {"word", "story"}; files are written as <out-dir>/<word-id>.mp3.
Runs on CPU; models download from Hugging Face on first use.
"""
import argparse
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
REFERENCE = ROOT / "voice" / "reference.wav"
SELF_TEST_PAUSE = 1.8  # seconds of silence for the listener to answer in their head
SENTENCE_GAP = 0.25
MAX_CHUNK = 220  # characters per generation call; long inputs drift


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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stories")
    ap.add_argument("out")
    ap.add_argument("--shard", default="0/1")
    args = ap.parse_args()
    shard, nshards = map(int, args.shard.split("/"))
    torch.set_num_threads(os.cpu_count() or 4)

    items = json.loads(Path(args.stories).read_text(encoding="utf-8"))
    items = [it for i, it in enumerate(items) if i % nshards == shard]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    model = ChatterboxTurboTTS.from_pretrained(device="cpu")
    for n, it in enumerate(items, 1):
        start = time.time()
        wav, sr = narrate(model, it["story"])
        tmp = out / f"{word_id(it['word'])}.wav"
        ta.save(str(tmp), wav, sr)
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", str(tmp), "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "40k", str(tmp.with_suffix(".mp3"))],
            check=True,
        )
        tmp.unlink()
        secs = wav.shape[1] / sr
        print(f"{n}/{len(items)} {it['word']}: {secs:.0f}s of audio in {time.time() - start:.0f}s", flush=True)


if __name__ == "__main__":
    main()
