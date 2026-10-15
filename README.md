# GRE Vocab (Bangla)

A web app for learning the GregMAT GRE word list (groups 1–38, 1,111 entries) fast.
Every word has:

- a clear **English meaning** and a **Bangla meaning (বাংলা অর্থ)**
- a **memory hook**: a sound-alike or word-root trick
- a short **story** set in real life or on the GRE, with the word highlighted
- **narrated audio of the story**, generated with the open-source Kokoro voice model
- the synonyms and the example sentence from the PDF

It works offline and can be installed on a phone like an app (PWA).

## How it helps you remember

| Feature | Why it works |
| --- | --- |
| **Learn** a group: meaning, Bangla, hook, then hear the story | Several cues (sound, story, native language) per word make it stick |
| **Review** with spaced repetition (FSRS) | Each word comes back right before you would forget it, so 15–20 minutes a day covers the whole list |
| **Quiz**: meaning, বাংলা, reverse, synonym and spelling questions | Active recall is much stronger than rereading; a wrong answer shows the hook at once |
| **Synonym map** | GRE Text Completion and Sentence Equivalence reward knowing word families; words sharing synonyms cluster together |
| **Dashboard** | Shows progress by stage, mastery per group, reviews coming up and a study calendar |

**Live app:** https://antukumar100.github.io/gre-vocab-bangla/ (after GitHub Pages is switched on, see below)

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

## Put it online (GitHub Pages)

The workflow in `.github/workflows/deploy.yml` builds and publishes the app on every push to `main`.
It needs GitHub Pages switched on once: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Then open the **Actions** tab, pick the latest "Deploy to GitHub Pages" run and click **Re-run all jobs**
(or just push any change). The site appears at `https://<your-username>.github.io/gre-vocab-bangla/`.

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
- Quiz: `1`–`4` choose an option · `Enter` next question

## How the audio was checked

Every story was narrated by the Kokoro voice model, and a sample of 150 files was transcribed with
Whisper to confirm nothing is cut off (median 96% word match; the gaps are mostly the recogniser
misspelling names like Tanvir). Headwords whose GRE meaning changes how they are said
(*minute* = my-NOOT, *content*, *august*, *intimate* as a verb, *compound* and *discount* as verbs)
have pronunciation overrides in `scripts/gen_audio.py`.

## Project layout

```
content/source.json        English columns extracted from the PDF (synonyms, example)
content/groups/NN.json     meanings, Bangla, hooks and stories for group NN
content/audio-manifest.json which story text each MP3 was generated from
public/audio/NN-word.mp3   narrated stories
scripts/extract_pdf.py     rebuilds source.json from the PDF
scripts/gen_audio.py       generates missing or changed story audio
scripts/build-data.mjs     merges everything into public/data/vocab.json (runs before dev/build)
src/                       the React app
```

### Edit a word or story

Change the entry in `content/groups/NN.json`, then regenerate its audio:

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
