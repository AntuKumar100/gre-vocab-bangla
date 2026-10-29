# Shobdo Quest · GRE words in Bangla

A game-like app for learning 1,110 GRE® words fast, with Bangla meanings. It runs on the web and as an Android app.
Every word has:

- a clear **English meaning** and a **Bangla meaning (বাংলা অর্থ)**
- a **memory hook**: a sound-alike or word-root trick
- a short **story** (70–100 words) from everyday life, ending with a self-test question
- **narrated audio of the story** in an expressive voice that laughs, sighs and gasps where the scene calls for it
- a recorded **pronunciation** of the word
- a **GRE-style sentence** with a blank, a synonym pair, a trap answer and the clue phrase
- synonyms and an example sentence

It works offline and can be installed on a phone like an app (PWA).

## How it helps you remember

| Feature | Why it works |
| --- | --- |
| **Learn** a set: meaning, Bangla, hook, then hear the story | Several cues (sound, story, native language) per word make it stick |
| **Review** with spaced repetition (FSRS) | Each word comes back right before you would forget it, so 15–20 minutes a day covers the whole list |
| **Practice: Sentence Equivalence** (pick 2 of 6) and **Text Completion** (pick 1 of 5) | The real GRE formats. After each answer the clue is highlighted, the synonym pair explained and the trap answer crossed out |
| **Practice**: meaning, বাংলা, reverse, synonym and spelling questions; optional GRE-pace timer | Active recall is much stronger than rereading; a wrong answer shows the hook at once |
| **XP, levels, streaks and combos**, with confetti and sound effects | A daily XP goal and a streak flame make short daily sessions a habit (both can be turned off in Settings) |
| **Quest path** of 37 sets, from the most common words to the rarest | Each set's ring fills as you learn it and turns gold as words are mastered |
| **Welcome and daily plan**: test date, a 10-word level check, new words per day | The plan adapts to the time left before the test |
| **Bangla or English interface**, daily reminders (Android), backups | Made for students in Bangladesh |
| **Synonym map** | GRE Text Completion and Sentence Equivalence reward knowing word families; words sharing synonyms cluster together |
| **Dashboard** | Shows progress by stage, mastery per set, reviews coming up and a study calendar |

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
In **Settings → Offline audio**, tap **Download all story audio** once (about 175 MB) to listen
without internet. On a set's page, **Listen to all stories** plays the whole set back to back,
which is handy on a bus.

Progress is stored in the browser. Use **Settings → Export progress** to back it up or move it
to another device.

## Keyboard shortcuts

- Learn: `1` need practice · `2` got it · `3` already knew it · `Space` play/pause story
- Review: `Space` show answer, then play/pause · `1`–`4` forgot / hard / good / easy
- Practice: `1`–`6` choose an option (Sentence Equivalence: pick two, then `Enter`) · `Enter` next question

## How the audio is made and checked

Stories are narrated by Chatterbox Turbo (MIT licence) on CPU, in a voice cloned from
`voice/reference.wav`, a clip of Kokoro's synthetic `af_heart` voice. Stories may contain the tags
`[laugh]`, `[chuckle]`, `[sigh]` and `[gasp]`, which the voice performs and the app hides, and one
`...` that becomes a 1.8-second pause for the self-test. `.github/workflows/audio.yml` regenerates
every story whose text changed (tracked in `content/audio-manifest.json`), split across 20 parallel
GitHub runners, then commits the MP3s and redeploys the site and the Android app.

A sample of the narrations was transcribed with Whisper to confirm nothing is cut off
(median 95% word match; the gaps are mostly names like Tanvir).

The pronounce button plays `public/audio/say/<word>.mp3`, recorded with Kokoro `af_heart` by
`scripts/gen_words.py`. Headwords whose GRE meaning changes how they are said (*minute* = my-NOOT,
*content*, *august*, *intimate* as a verb, *compound* and *discount* as verbs) have pronunciation
overrides there.

## Project layout

```
content/sets/NN.json       everything about the 30 words in set NN: meanings, Bangla, hook, story,
                           synonyms, example and GRE item
content/audio-manifest.json which story text each MP3 was generated from
public/audio/<word>.mp3    narrated stories
public/audio/say/<word>.mp3 pronunciation of each headword
scripts/gen_audio_v2.py    narrates missing or changed stories (Chatterbox)
scripts/gen_words.py       records missing or changed pronunciations (Kokoro)
scripts/apply_rewrite.py   validates and merges a batch of new stories and GRE items into a set
scripts/apply_extras.py    validates and merges synonyms, examples and definitions into a set
scripts/check_content.py   checks every word has every field, a valid GRE item and its audio
tests/                     end-to-end tests (npm test), run before every deploy
android/                   the Android app (Capacitor); see store/ANDROID.md
store/                     Google Play listing text, graphics and publishing guide
scripts/build-data.mjs     merges everything into public/data/vocab.json (runs before dev/build)
src/                       the React app
```

### Edit a word or story

Change the entry in `content/sets/NN.json` and push: the audio workflow narrates it again.
To do it locally instead (slow on CPU, about a minute per story):

```
pip install chatterbox-tts
python scripts/gen_audio_v2.py sets
```

The script only regenerates stories whose text changed. It needs `ffmpeg` on your PATH.
For a new headword, also record its pronunciation:

```
pip install kokoro-onnx soundfile
python scripts/gen_words.py <folder with kokoro-v1.0.onnx and voices-v1.0.bin>
```

Download the Kokoro model files from
https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0.

## Where the content comes from

The word selection started from GregMAT's free GRE word list. Everything the app shows is written for
this project: definitions, Bangla meanings, memory hooks, stories, synonym lists, example sentences and
GRE questions. The words are arranged into 37 sets of 30 by how common each word is in English
(using the [wordfreq](https://github.com/rspeer/wordfreq) data), most common first. Earlier commits in
this repository's history still contain text copied from the original PDF.

GRE® is a registered trademark of ETS. This app is not endorsed or approved by ETS.

## Android app

`store/ANDROID.md` explains how to install the latest build on a phone, set up signing and publish on
Google Play; `store/listing.md` has the store listing text and `store/graphics/` the icon, feature
graphic and screenshots.

## Tests

```
npm run build
npm test
```

The tests walk through first run, learning, review, both GRE question types, the Bangla interface
and progress migration on a phone and a desktop screen. GitHub runs them before every deploy.
