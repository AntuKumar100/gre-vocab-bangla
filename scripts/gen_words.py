"""Record how each headword is pronounced, for the app's pronounce button.

Writes public/audio/say/<word>.mp3 for every headword in content/sets whose clip
is missing or whose pronunciation changed (tracked in content/say-manifest.json).
The voice is Kokoro af_heart, the same synthetic voice the story narrator copies.

Setup (once):
  pip install kokoro-onnx soundfile
  download kokoro-v1.0.onnx and voices-v1.0.bin from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

Usage: python scripts/gen_words.py <model-dir>
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
SETS = ROOT / "content" / "sets"
OUT = ROOT / "public" / "audio" / "say"
MANIFEST = ROOT / "content" / "say-manifest.json"
VOICE = "af_heart"
SPEED = 0.85
LEAD_IN_MS = 150

# Headwords whose GRE sense is pronounced differently from espeak's default
# reading: (default IPA, IPA for the sense the app teaches).
PRONUNCIATION = {
    "minute": ("mˈɪnɪt", "maɪnˈuːt"),
    "content": ("kˈɑːntɛnt", "kəntˈɛnt"),
    "august": ("ˈɔːɡəst", "ɔːɡˈʌst"),
    "intimate": ("ˈɪntᵻmət", "ˈɪntᵻmˌeɪt"),
    "compound": ("kˈɑːmpaʊnd", "kəmpˈaʊnd"),
    "discount": ("dˈɪskaʊnt", "dɪskˈaʊnt"),
}


def word_id(word):
    return re.sub(r"[^a-z0-9]+", "-", word.lower()).strip("-")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("model_dir")
    args = ap.parse_args()
    kokoro = Kokoro(f"{args.model_dir}/kokoro-v1.0.onnx", f"{args.model_dir}/voices-v1.0.bin")
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}

    words = [e["word"] for f in sorted(SETS.glob("*.json")) for e in json.loads(f.read_text(encoding="utf-8"))]
    made = 0
    for word in words:
        eid = word_id(word)
        ipa = kokoro.tokenizer.phonemize(word, "en-us")
        fix = PRONUNCIATION.get(word)
        if fix:
            if fix[0] not in ipa:
                raise SystemExit(f"{word}: expected {fix[0]} in phonemes, got {ipa}")
            ipa = ipa.replace(fix[0], fix[1])
        key = hashlib.sha1(f"{VOICE}|{SPEED}|{LEAD_IN_MS}|{ipa}".encode()).hexdigest()[:12]
        out = OUT / f"{eid}.mp3"
        if manifest.get(eid) == key and out.exists():
            continue
        samples, sr = kokoro.create(ipa, voice=VOICE, speed=SPEED, lang="en-us", is_phonemes=True)
        wav = io.BytesIO()
        sf.write(wav, samples, sr, format="WAV")
        # Trim the model's silence, then keep a short lead-in so Bluetooth headphones,
        # which wake up as playback starts, don't swallow the first sound.
        trim = (
            "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
            "silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
            f"adelay={LEAD_IN_MS},apad=pad_dur=0.1"
        )
        subprocess.run(
            ["ffmpeg", "-loglevel", "error", "-y", "-i", "-", "-af", trim, "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "32k", str(out)],
            input=wav.getvalue(), check=True,
        )
        manifest[eid] = key
        made += 1
        if made % 50 == 0:
            print(f"{made} clips, now at {word}", flush=True)
    MANIFEST.write_text(json.dumps(dict(sorted(manifest.items())), indent=1) + "\n")
    print(f"{made} clips made, {len(words)} words in all")


if __name__ == "__main__":
    main()
