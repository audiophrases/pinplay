# Bilingual TTS plan

Lower-level students understand a question better when the instructions are
said in their own language and only the content being learned is said in the
language of the quiz. This plan adds that to question audio in every mode
(homework, adaptive, climb, live, arena), to the AI creation prompts and to the
import flow, without a new data model.

## 1. Decisions (owner, 2026-11-10)

- Spoken only. The question text on screen stays as it is; only the audio is
  bilingual. (Teachers can still write the prompt any way they like.)
- No quiz-level default. Each question says what it says; a quiz is not
  switched to bilingual as a whole.
- Any pair of languages, not only Catalan and English.

## 2. How it is written: language tags in `audioText`

The existing "Text to read aloud" field takes tags that switch the voice:

```
[ca] Escolta la frase i tria el temps verbal correcte. [en] She has lived in Girona since 2010.
```

- A tag is a two-letter language code in square brackets (`[ca]`, `[en]`,
  `[fr]`, `[es]`, `[de]`, `[it]`, `[pt]`) or a full Edge voice id
  (`[es-ES-ElviraNeural]`).
- Text before the first tag is said with the question's own voice.
- A two-letter tag of the question's own language keeps the question's own
  voice (an `[en]` segment on a question whose voice is en-GB-SoniaNeural stays
  Sonia); any other language takes PinPlay's default voice for it
  (`TTS_TAG_VOICES`).
- A question without tags is unchanged.

Why tags and not a new field: `audioText` already flows through the editor,
the Media Manager, import and Append, exports, the live payload, the AI grade
packs and the content-addressed cache key (`sha256(voice::rate::text)`), so
every one of those keeps working with no change and no migration. The tags
are shown wherever the text is shown (editor, Media Manager, grade pack), which
is honest: the student heard both languages.

## 3. Playback

One shared function, identical in `app.js`, `play.js` and `cloudflare/worker.js`
(checked by a test, as `normalizeTextAnswer` is):

- `TTS_TAG_VOICES`: the default voice per two-letter language.
- `splitTtsSegments(text, voice)` → `[{ text, voice }]`.

The Worker is the only place that synthesises, so it joins the segments:
`synthesizeEdgeMp3(env, text, voice, rate)` splits the text, asks the Edge
bridge for one mp3 per segment and returns the concatenated bytes (Edge mp3s
share one format, so the concatenation plays as one clip). The three routes
(`/api/tts/edge`, `/api/tts/ensure`, `/api/tts/ensure-batch`) use it, so:

- the pre-rendered R2 clip (publish time, Media Manager) is bilingual,
- the live Edge fallback on the host and the student pages is bilingual,
- the key of the clip is unchanged in shape and still changes with the text.

The student page's last resort, the browser's own `speechSynthesis`, speaks the
segments one after the other, each with its language.

Because every mode plays question audio through `playAssignmentQuestionAudio`
(student) or `playQuestionAudio` (host and editor preview), nothing per mode
changes.

## 4. The AI prompts

Standard and adaptive prompt (`buildCreationPrompt`): the Audio/TTS dropdown
gets a "Bilingual" choice. It shows the free-text box where the teacher writes,
in their own words, which language says what and, if they like, an example for
the grammar of the quiz ("explain in Catalan, read the sentence in English:
[ca] Tria el verb. [en] She goes to school"). That text is quoted in "The
teacher's own words", so it outranks the general rule. The rule gives the
fields: every question gets `"audioEnabled": true` and an `audioText` with
tags, the quiz gets a `ttsLanguage`, and an example.

Climb prompt (`buildBuildupPrompt`): an "Audio" dropdown (none / bilingual).
The form already asks for the students' first language, which the rule uses;
the "Instructions for the AI" box takes the teacher's specifics.

## 5. Import

Unchanged: the server's `normalizeQuiz` already keeps `audioText` and defaults
`audioMode` to `tts`; publishing then prepares the clip as for any TTS
question. Append batches work as before.

## 6. Editor

A hint under "Text to read aloud" explains the tags. The Media Manager, the
grade packs and level tagging need no change.

## 7. Tests

`tests/bilingual-tts.test.js`: the three copies are identical; segments split
as described (no tags, leading untagged text, same-language tag keeps the
voice, voice-id tag, unknown tag keeps the voice, empty segments dropped);
the Worker synthesiser calls the bridge once per segment with the right voice
and joins the bytes; the standard, adaptive and climb prompts carry the
bilingual rule and the teacher's words only when asked.

## 8. Log

- 2026-11-10: plan written and built: tags in `audioText`, the Worker joins
  one Edge clip per segment, the student page's browser-voice fallback speaks
  the segments in turn, "Bilingual" in the standard/adaptive and climb prompt
  forms, hint in the editor, `tests/bilingual-tts.test.js`.
- 2026-11-13: first AI-made quiz left quiz-language words untagged inside the
  first-language segments ("[ca] Amb I fem servir am"), which the Catalan voice
  misreads. `PROMPT_BILINGUAL_AUDIO` now asks for a tag on every quiz-language
  word, with a wrong/right example, a reread before answering, and no answer in
  the audio.
- 2026-11-13: the pauses where the voice changes were 1.1 to 1.6 s: Edge puts
  about 0.15 s of silence before every clip and 0.9 to 1.4 s after it. The Worker
  now cuts it where two clips meet (`trimMp3Silence`, read from the frames' global
  gain, no decoding): 24 ms before a voice, 70 ms after one that stopped
  mid-sentence, 280 ms after one that ended a sentence. The start of the first
  clip and the end of the last are left alone, and a text in one voice is not
  touched. Clips in more than one voice get a new cache key (`ttsClipSeed`), so
  publishing again makes them again.
