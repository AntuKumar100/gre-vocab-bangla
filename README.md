# Shobdo Quest · GRE words in Bangla

A game-like web app for learning the GregMAT GRE word list (groups 1–38, 1,111 entries) fast.
Every word has:

- a clear **English meaning** and a **Bangla meaning (বাংলা অর্থ)**
- a **memory hook**: a sound-alike or word-root trick
- a short **story** (about 75 words) set in Bangladeshi life or on the GRE, with the word highlighted
- **narrated audio of the story** in a warm, slow female voice (open-source Kokoro model)
- a **GRE-style sentence** with a blank, a synonym pair, a trap answer and the clue phrase
- the synonyms and the example sentence from the PDF

It works offline and can be installed on a phone like an app (PWA).

## How it helps you remember

| Feature | Why it works |
| --- | --- |
| **Learn** a group: meaning, Bangla, hook, then hear the story | Several cues (sound, story, native language) per word make it stick |
| **Review** with spaced repetition (FSRS) | Each word comes back right before you would forget it, so 15–20 minutes a day covers the whole list |
| **Practice: Sentence Equivalence** (pick 2 of 6) and **Text Completion** (pick 1 of 5) | The real GRE formats. After each answer the clue is highlighted, the synonym pair explained and the trap answer crossed out |
| **Practice**: meaning, বাংলা, reverse, synonym and spelling questions; optional GRE-pace timer | Active recall is much stronger than rereading; a wrong answer shows the hook at once |
| **XP, levels, streaks and combos**, with confetti and sound effects | A daily XP goal and a streak flame make short daily sessions a habit (both can be turned off in Settings) |
| **Quest path** of all 38 groups | Each group's ring fills as you learn it and turns gold as words are mastered |
| **Synonym map** | GRE Text Completion and Sentence Equivalence reward knowing word families; words sharing synonyms cluster together |
| **Dashboard** | Shows progress by stage, mastery per group, reviews coming up and a study calendar |

**Live app:** https://antukumar100.github.io/gre-vocab-bangla/

## Run it on your computer (Windows)

1. Install [Node.js](https://nodejs.org) (LTS version).
2. Get the code into your folder:
   ```
   cd "D:\Antu dRi\Amartay"
   git clone https://github.com/AntuKumar100/gre-vocab-bangla.git Vocab
   cd Vocab
   ```
3. Install and start:
   ```
   npm install
   npm run dev
   ```
4. Open the address it prints (usually http://localhost:5173).

## How it is published

Every push to `main` runs `.github/workflows/deploy.yml`, which lints and builds the app and
publishes `dist/` to the `gh-pages` branch. GitHub Pages serves that branch at
https://antukumar100.github.io/gre-vocab-bangla/, usually within two minutes of the push.

To build a static copy yourself: `npm run build`. The `dist/` folder works from any web host or
subfolder because all paths are relative.

### Use it on your phone

Open the live link in Chrome (Android) or Safari (iPhone), then choose **Add to Home Screen**.
In **Settings → Offline audio**, tap **Download all story audio** once (about 92 MB) to listen
without internet. On a group page, **Listen to all stories** plays the whole group back to back,
which is handy on a bus.

Progress is stored in the browser. Use **Settings → Export progress** to back it up or move it
to another device.

## Keyboard shortcuts

- Learn: `1` need practice · `2` got it · `3` already knew it · `Space` play/pause story
- Review: `Space` show answer, then play/pause · `1`–`4` forgot / hard / good / easy
- Practice: `1`–`6` choose an option (Sentence Equivalence: pick two, then `Enter`) · `Enter` next question

## How the audio is made and checked

Narration uses Kokoro's `af_heart` voice at 0.82× speed with longer pauses between sentences.
`.github/workflows/audio.yml` regenerates every story whose text changed, split across 20
parallel GitHub runners, then commits the MP3s and redeploys the site.

An earlier version of the stories was narrated by the same model, and a sample of 150 files was transcribed with
Whisper to confirm nothing is cut off (median 96% word match; the gaps are mostly the recogniser
misspelling names like Tanvir). Headwords whose GRE meaning changes how they are said
(*minute* = my-NOOT, *content*, *august*, *intimate* as a verb, *compound* and *discount* as verbs)
have pronunciation overrides in `scripts/gen_audio.py`.

## Project layout

```
content/source.json        English columns extracted from the PDF (synonyms, example)
content/groups/NN.json     meanings, Bangla, hooks, stories and GRE items for group NN
content/audio-manifest.json which story text each MP3 was generated from
public/audio/NN-word.mp3   narrated stories
scripts/extract_pdf.py     rebuilds source.json from the PDF
scripts/gen_audio.py       generates missing or changed story audio
scripts/apply_rewrite.py   validates and merges a batch of new stories and GRE items into a group
scripts/build-data.mjs     merges everything into public/data/vocab.json (runs before dev/build)
src/                       the React app
```

### Edit a word or story

Change the entry in `content/groups/NN.json` and push: the audio workflow narrates it again.
To do it locally instead:

```
pip install kokoro-onnx soundfile
python scripts/gen_audio.py <folder with kokoro-v1.0.onnx and voices-v1.0.bin>
```

The script only regenerates stories whose text changed. It needs `ffmpeg` on your PATH.
Download the model files from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0.

A note on the PDF: its Bangla text cannot be copied out correctly (conjunct letters are lost
and vowel signs come out in the wrong order), and some entries had errors, such as a Hindi word
in *insipid*. So every Bangla meaning here was written fresh rather than extracted.
