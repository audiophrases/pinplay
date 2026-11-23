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
- 2026-11-23: two AI-made quizzes (bilingual slides only) came in silent. The
  prompt's shape line had no quiz-level fields, so the quiz arrived without
  `ttsLanguage`, the builder read that as "Don't hear questions", and that
  switch muted every item's own `audioText`. Fixed by one rule
  (`questionHeardByTts`, shared by publishing and the Media Manager):
  - A question or slide with its own audio (a text to read aloud, a file or a
    recording) is always heard, in its own voice (`ownAudioLanguage`: its
    `ttsLanguage`, else the quiz's, else English).
  - The quiz's one control, "Read every question aloud" (No / a language),
    only decides whether the OTHER questions are read too. It replaces "Hear
    questions" and its tick, which came back ticked after "Don't hear".
  - No keeps the quiz language and touches no question; a language moves only
    the questions without their own text (`applyQuizVoiceToQuestions`), so an
    uploaded file stays a file.
  - A question's own "TTS text language" can be "🔇 Not heard" (`ttsLanguage`
    NONE): that one question is silent, even when every question is read.
    Typing text into an empty one makes it heard.
  - New questions get a real language, never NONE. An imported file without
    `readAllQuestionsAloud` reads everything unless it turns the audio off on
    some item (`importedReadAll`).
  - The prompts show `"ttsLanguage"` and `"readAllQuestionsAloud": false` in
    the quiz shape (and the climb example) when audio is asked, and say that
    only items with `"audioText"` are heard.
- 2026-11-23 (later, owner's design): audio is the quiz's setting with
  per-question exceptions, replacing the entry above.
  - The quiz's 🔊 Audio: No audio / English / Català / Français / Other
    language (`quiz.ttsLanguage`), plus "Custom", which is shown, never
    picked: a quiz that came without a quiz-wide setting (`quiz.audioCustom`,
    plays nothing by itself). Picking a setting ends Custom.
  - Each question's own 🔊 Audio (`q.audioSetting`): Same as quiz (default) /
    No audio / Read aloud with its own language, voice or text (bilingual
    included) / an audio file or recording. Not set (imported, generated): its
    own file or text, else the quiz's.
  - `audioEnabled` and `audioMode` are outputs again: publishing
    (`prepareQuestionTts`) works them out for the student page. A question on
    Same as quiz is read in the quiz's voice and reads itself; the payload
    (`normalizeQuizForLive`) drops its kept `audioText`.
  - `migrateQuestionAudio` runs once per quiz and per imported file
    (`quiz.audioPerQuestion`): own file → file, own text → read aloud (No audio
    when "Don't hear questions" had silenced it), the rest Same as quiz; a
    read-all quiz keeps its language, else No audio, or Custom when some
    questions have their own audio (the reported quiz).
  - Root cause of the report: the Worker's `normalizeQuiz` kept only version,
    title and questions, so a quiz reopened from an assignment came back with
    no audio setting, read as "Don't hear questions". It now keeps the quiz's
    `ttsLanguage`, `language`, `readAllQuestionsAloud`, `audioCustom`,
    `audioPerQuestion` and each question's `audioSetting` and `ttsLanguage`
    (needs a Worker deploy).
  - Media Manager: "🔊 Audio…" (was "Change voice…") sets Same as quiz, No
    audio or an own voice on the selection; "Remove… 🔊 Audio" deletes a
    question's own audio and puts it back on Same as quiz.
  - Prompts: no quiz-level audio fields; "Audio is set per item: only items
    with "audioText" are heard."
- 2026-11-23 (review of conflicting settings): who wins, top first.
  0. Never heard: listening sections and types without question audio.
  1. The question's own choice (No audio / its own read-aloud / a file)
     beats the quiz. Only a teacher action on that question changes it:
     imports, previews and Remove… never turn a silent question into a heard
     one, or the reverse.
  2. The quiz's 🔊 Audio applies to the questions on Same as quiz.
  3. When the chosen source fails: a file that does not play is not replaced
     by reading the question (editor, live host and student page alike); a
     missing clip is made live, then read by the browser.
  Fixes that follow from it:
  - "Remove… 🔊 Audio" keeps a question on No audio (its old file or script
    is still removed); it used to send it to Same as quiz, so a quiz reading
    English read it.
  - AI prompt without audio leaves the audio fields out (it set "none" on
    every item, which kept the quiz silent after the teacher picked English),
    and the migration turned a quiz whose every item is on No audio into
    Same as quiz (withdrawn the same day: an explicit No audio is kept).
  - ▶ Play preview of a file gone from the cloud drops the dead reference and
    keeps "Audio file" (it switched the question to read-aloud).
  - Media Manager: a file question with no file shows "🎵 File ⚠ no file
    yet" (status `empty`, not counted as audio); 🔊 Audio… with a voice says
    how many questions kept their audio file.
  - ✏️ on an assignment stored by the old Worker (no quiz 🔊 Audio): when its
    plain questions were heard and agree on a language, that language (and
    their voice) is the quiz's again (`inferStoredQuizReadAloud`); before,
    those questions came back silent.
  - Student page: a missing file reads nothing in its place, except a script
    stored beside it (old assignments stored read-aloud as generated files).
- 2026-11-23 (second review): fixes.
  - An explicit No audio is kept on import, appended or not; only a question
    with no audio setting at all follows the quiz.
  - Question bank: a question with a recording is set to its own audio file
    (it was on Same as quiz with a mode nothing reads, so the quiz's voice read
    the prompt).
  - ✏️ on an assignment stored by the old Worker whose questions were read in
    different languages: each keeps its own read-aloud in the voice it had.
  - "Apply to all" to No audio leaves the questions on No audio as they are
    (on Same as quiz they would be read when the quiz next gets a language).
  - A question's voice: the search box wins only when typed in, and both
    voice fields show the voice it has (the list's choice was reverted).
  - AI prompt with audio instructions: the rule names the items the
    instructions name, not every item, and says the examples only show the
    format.
  - Student page: a live clip the browser does not play falls back to the
    browser's voice (it counted as played).
  - Editing a question's text, prompt, voice or audio setting drops its clip
    key, so the Media Manager shows it missing until it is made again.
- 2026-11-23 (third review): fixes.
  - A clip made while its question is edited is not stored on it: publishing
    and Generate missing keep a key only when the question would still make
    that clip (questionStillMakesClip).
  - ✏️ on an assignment stored by the old Worker: every question keeps the
    voice it was read in. The quiz takes the voice most of them used that a
    quiz can have (another language's voice, or English, Català or Français's
    own); the others get their own read-aloud in their voice.
  - A question-bank recording saved with audioMode "url" (before the bank
    fix) opens as its own audio file, unless the teacher chose otherwise.

