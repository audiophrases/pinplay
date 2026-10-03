# PinPlay Listening Studio: listening recordings made on the teacher's PC

Status: **plan, 2026-10-03; the owner's answers are in.** This is phase 3 of
LISTENING_MODE_PLAN.md ("TTS recordings with several voices"). Nothing is
built yet.

In one line: a local app on the owner's computer turns a listening script
(written by an AI or by the teacher) into one finished MP3. It gives several
natural voices with acted lines (Qwen3-TTS), adds phone and station effects,
sounds and background, and checks the words. The teacher listens, saves the
MP3 and uploads it to the PinPlay section. No code and no terminal at any step.

## 1. What we learned (bake-off, 2026-10-03)

We used one station scene for every engine: six voices, a phone call and two
PA announcements. All the demos are in Desktop\PinPlay TTS demo.

| Engine | Owner's verdict | Speed on this PC | Notes |
|---|---|---|---|
| Edge TTS (PinPlay today) | Robotic | Seconds | Speed, pitch and volume only; needs internet |
| Kokoro | A step up, not there | ~1.2× real time | Removed |
| Chatterbox Nano | Much better | ~2× real time (2-min scene: 4 min) | Tags such as `[sarcastic]`, `[laugh]` |
| **Qwen3-TTS 1.7B VoiceDesign** | **Really good, super natural** | **~12× real time (2-min scene: ~20 min)** | Voice from a description, acting from a direction; 10 languages; 4.3 GB model, ~7 GB RAM |
| Dia2-1B | Super natural, the best laughter | ~23× real time | Two speakers per generation; changes words ("until" → "till") |

The production effects (phone voice, station PA with echo, chime, ringtone,
hall background) were liked in every version.

Lessons:

1. **The description decides the age.** "A British girl of about seventeen
   with a bright, expressive, youthful voice" gave Mia a child's pitch: about
   385 Hz, where an adult woman's voice sits at roughly 165–255 Hz.
2. **Voices drift a little.** Each line is made fresh from the description,
   and one character's pitch moved a lot between lines (Jake: 156–398 Hz).
   Part of that is acting and part is drift, so test 0 (section 8) settles it.
3. **Words.** Transcribed with Whisper, Qwen3 said the written words in all 26
   lines. The only "differences" were Whisper's own conventions: digits
   ("thirty" → "30"), American spellings ("Mum" → "mom", "cancelled" →
   "canceled") and fillers left out ("um"). Dia2 really changed words.
4. **This PC** has no usable graphics card (the GTX 770 is too old), so
   everything runs on the processor (i7-4770K) with 16 GB of RAM. Drive C: is
   tight: one model download almost filled it. Everything goes on D:.
5. **Format.** PinPlay plays MP3 reliably. Other formats are stored as `.bin`
   and served without an audio type. The studio saves MP3: mono, 24 kHz,
   ~96 kbps (about 1.5 MB for 2 minutes of speech).

## 2. Decisions (owner, 2026-10-03)

| Question | Decision |
|---|---|
| Engine | **Qwen3-TTS** (VoiceDesign 1.7B). Dia2 stays installed on D: for a later "natural conversation" option; it is not in the first version. |
| Where it runs | On the owner's PC, as a local app. The create page and the Cloudflare worker never generate speech. |
| How it's used | **No terminal and no code.** A desktop icon (a `.bat`) starts it, everything happens in a browser page, and anything that has to be installed installs itself with progress shown. |
| Who uses it | **The owner only, for now.** It is not in the teacher installer. |
| PinPlay link | **Detached for now.** The studio works on its own. The teacher checks the result by ear, saves the MP3, and uploads it with the section's **Recording** button, as with any recording. A direct link (a "Make the recording" button, automatic upload) can come later. |
| Production | The demo effects are part of the studio: phone, PA, sounds, background. |
| Output | One MP3 per listening section. |
| Script | A readable script format (section 4) that an AI writes and a teacher can edit. In PinPlay it is the section's transcript. |
| Spoken exam instruction | **Not in the scripts.** It becomes a PinPlay option per section: PinPlay reads the section's instruction aloud with its own TTS before the recording (section 7). |
| Voice mode | Decided by ear after test 0 (section 8): **acted** or **fixed voice**. |

**The two voice modes.** **Acted** (the demo): every line is made fresh from
the character's description plus that line's direction, so "heavy sarcasm,
slow" really sounds sarcastic, but the voice can vary a little from line to
line. **Fixed voice**: one sample of each character's voice is made, and every
line copies that exact voice, so the character always sounds like the same
person. However, Qwen3 ignores directions when copying, so the emotion comes
only from the words and punctuation. The "default" is the mode used unless
the teacher changes it for a character.

## 3. The teacher's workflow

1. **The script.** The listening AI prompt, with "The AI writes the script",
   returns a quiz whose sections hold a recording script (voices, lines,
   directions) as their transcript. In the section panel, **📋 Copy script**
   copies it. A script can also come from the studio's own "✨ Copy script
   prompt" (a recording without a quiz), or be any text the teacher has; plain
   text is read by one voice.
2. **The studio.** Double-click the desktop icon and paste the script. The
   studio **starts at once**: a sample of each character's voice first, then
   every line, with "12 of 26 lines · about 9 min left".
3. **Listening.** Lines can be played as soon as they're ready. If something
   sounds off, the teacher changes that character's description or that
   line's direction, or presses "↻ Try again"; only that line is made again.
   A sound plays when everything is ready.
4. **Saving.** After listening to the whole recording, **💾 Save MP3**. If the
   script changed in the studio, **📋 Copy script** in the studio puts it back
   on the clipboard for the section's transcript box.
5. **Uploading.** In PinPlay's section panel: Recording → choose the MP3.
   This is the existing upload.

Closing the studio's tab doesn't stop the work. Opening it again shows where it is.

## 4. The recording script format

Readable for teachers and easy for an AI to write. It extends the
`Name: what they say` lines the listening prompt already asks for.

```text
LANGUAGE: English
AMBIENCE: station

VOICE Announcer [PA]: A British woman in her thirties, formal railway announcer, slow and clear.
VOICE Mia: A young British woman of about nineteen with a clear, natural, mid-range voice and a southern English accent.
VOICE Tom: A young British man of about nineteen, friendly, slightly deep, laid-back.
VOICE Jake: A young American man of about twenty, energetic and warm.
VOICE Mum [phone]: An Irish woman in her fifties, warm and motherly.

[chime]
Announcer: Ladies and gentlemen, the ten fifteen service to Edinburgh is delayed by approximately forty minutes.
Mia (shocked, voice rising): Forty minutes? You're joking!
Tom (hesitant, trying to sound positive): Well... um... at least it's not cancelled?
Tom (whispering, amused): Don't look now, but I think that's him.
Jake (out of breath): Guys! I made it! Did I miss the train?
>> Tom (suddenly worried): Wait, wait. Did you bring the tickets?
Mia + Tom (shouting in disbelief): What?!
[ring]
Mum (worried): Hello, love. Are you on the train yet?
[pause 2]
--- Part 2
...
```

Rules:

- **Header lines** (optional): `LANGUAGE:`, `AMBIENCE:` (none, room, hall,
  station, outdoors) and `TITLE:`.
- **`VOICE Name: description`** sets each character's voice. An effect in
  brackets after the name becomes that character's default.
- **Speech lines** are written `Name (direction): text`. The direction is
  optional.
- **Effects**: `[phone]` (the other end of a call), `[PA]` (announcements),
  `[far]` (someone calling from a distance) and `[radio]`. They go on a VOICE
  line or on one speech line: `Mum [phone] (worried): …`.
- **Sound and timing lines**: `[chime]`, `[ring]`, `[beep]`, `[pause N]` (N in seconds).
- **`>>`** at the start of a line: it starts before the previous line ends
  (an interruption). **`Name + Name`**: both say it together.
- **`--- Part 2`** starts another recording, one per section, as the
  listening prompt already does. The studio saves one MP3 per part.
- **Forgiving reading.** A line that matches none of the above continues the
  previous line, which also repairs line breaks from PDF copies. A script
  with no names at all is read by one voice. A name without a VOICE line gets
  a voice automatically, with a note.
- **Clean transcript.** Directions, effects, sounds and headers are removed
  ("Mia: Forty minutes? You're joking!"). This is what PinPlay shows wherever
  a transcript is checked or shown.

One shared file, `listening-script.js`, holds the parser, the clean
transcript and the AI rules (section 5). The create page and the studio's
page both use it, and a test keeps the two copies identical, as with the
listening functions in app.js and worker.js.

## 5. What the AI must know (the script prompt)

There are two places, sharing one block of rules (`LISTENING_SCRIPT_RULES`):

- the PinPlay listening prompt, with "The AI writes the script";
- the studio's **"✨ Copy script prompt"**, for a recording without a quiz,
  or for "add voices and directions to my text".

The block, as a draft:

- **How it's made:** "Qwen3-TTS makes each voice from its VOICE description,
  performs each line from its direction and says exactly the words written.
  It can't make laughter, sighs, coughs or sound effects on its own; the
  studio adds the sounds listed below."
- **VOICE:** gender, age, accent, voice quality, pace and personality.
  Describe adults as adults, and teenagers as "a young woman / a young man of
  about 18–19". Never use "girl", "boy", "child", "little", "cute" or
  "youthful" unless the character is a child. Make every voice easy to tell
  apart: mix genders, ages, accents and pitch.
- **Directions:** short, in English, about delivery only: emotion, manner,
  pace and volume. Examples: "surprised, voice rising", "whispering", "out of
  breath", "heavy sarcasm, slow", "laughing as she speaks". Leave the
  direction out when the line is neutral. Never describe actions ("opens the
  door").
- **Text:** natural speech with fillers ("um", "well...", "I mean"), "..."
  for hesitation and punctuation for intonation. Laughter goes in the
  direction ("(laughing)"), never as text ("haha") or a tag (`[laugh]`).
- **Line length:** at most about 30 words. Split a longer speech into several
  lines for the same speaker.
- **Numbers, times, prices and spellings** are written as they should be
  said: "ten fifteen", "four pounds fifty", "S-M-I-T-H". The questions'
  accepted answers include the digits too.
- **Sounds and effects:** only the ones listed in section 4.
- **Only the recording itself.** No spoken instruction or rubric ("Part two.
  You will hear…"), since PinPlay can read the section's instruction aloud
  itself. No "Now listen again", no repeated passage, no long pauses for
  reading, and the questions aren't read aloud: the player handles repeat
  plays and the sheet shows the questions.
- **Languages:** Qwen3 speaks English, Spanish, French, German, Italian,
  Portuguese, Russian, Chinese, Japanese and Korean. Write the `LANGUAGE:`
  line. Catalan is not supported (see section 9).
- **Length per level:** as in the listening prompt today.

In the PinPlay listening prompt, only the "write" mode changes: its rule and
its example use this format. The "paste" and "attach" modes work with real
recordings and stay as they are.

## 6. The studio app

### 6a. Starting it, with no terminal

- **`PinPlay Listening Studio.bat`** lives in a new `listening-studio/`
  folder, and a **desktop icon** points to it. A double-click opens a small
  "Starting…" window, which minimises itself, and the browser opens the
  studio (`http://127.0.0.1:8790`). If it is already running, the browser
  just opens it.
- **What's already installed.** The owner's PC already has the Qwen3 engine
  and model on D: (`D:\Admin\pinplay listening tts audio production\qwen3`,
  from the bake-off). The studio uses them, and keeps its recordings next to
  them.
- **If something is missing** (a library, the model, the word checker), the
  page shows "Setting up" and installs it by itself, with a progress bar and
  plain-language errors ("No internet", "Not enough space on D:"). Free space
  is checked before every download, and downloads go to D: only.
- A **Quit** button in the page. After 15 minutes without work, the studio
  unloads the voice model to give back its ~7 GB of RAM.

### 6b. The page

- **Recordings**: a list (newest first) and "＋ New recording" (paste a script).
- **A recording** has four parts:
  - **Script**: the editor, with colours and plain-language errors next to the
    line. It has "📋 Copy script" and "📋 Copy clean transcript".
  - **Cast**: one card per character, with the description, the default
    effect, the voice mode (acted / fixed voice) and ▶ a voice sample. A
    warning chip appears when a voice sounds much younger than the
    description (the Mia problem, caught by measuring the sample's pitch).
  - **Lines**: each line shows its status (waiting / making / ready / words
    ✓ / ⚠ words differ), ▶ play, "↻ Try again" (a new take), takes 1·2·3,
    and its direction, editable in place.
  - **Mix**: background, spacing (natural / tight / relaxed), ▶ play
    everything, 💾 Save MP3 (one per part).
- **Progress**: an overall bar and "about 9 min left", from this PC's
  measured speed. The tab title shows the percentage, and a sound and a
  browser notification come when it's done.
- **"✨ Copy script prompt"**: the AI rules from section 5, plus a short form
  (topic, level, language, characters, length) for a recording without a quiz.

### 6c. What happens automatically

- Pasting a script starts the work at once: voice samples, then lines in order.
- Each line is kept by voice, direction, text and take, so an edit only
  redoes what changed.
- After each line comes the **word check** (Whisper). It reads digits and
  number words, British and American spellings, and fillers ("um", "er") as
  the same, or it would flag almost every line (lesson 3). A line with missing
  or changed words is tried once more with a new take, then flagged.
- When everything is ready and checked, the studio mixes it and plays a
  sound. The teacher listens, then saves.

### 6d. Inside (for the build)

- **Language:** Python, because Qwen3 is a Python package. A FastAPI server
  listens on 127.0.0.1 only, with one worker and a queue. Projects are JSON
  plus WAV files in a folder on D:.
- **Engine:** Qwen3 VoiceDesign 1.7B on the processor (float32), with a fixed
  seed per character. The fixed-voice mode adds Qwen3 Base, the model that
  copies voices; test 0 decides between the 0.6B and 1.7B sizes. Batching
  lines per character is decided by test 0.
- **Mixer:** numpy and scipy, so no ffmpeg is needed. It handles levels,
  gaps, overlaps, the four effects, the chime, ring and beep, and the
  background. MP3 export uses `lameenc`. The effects already exist in
  `D:\Admin\pinplay listening tts audio production\production\effects.py`
  (pydub), to be ported.
- **Checks:** `faster-whisper` small (int8, processor) for words, and
  librosa's pitch tracker for voice age.
- **Dependencies:** a pinned requirements file, installed into the existing
  Python 3.11 environment on D: by the launcher when something is missing.
- **Not needed while detached:** any connection with the PinPlay page. When
  it's linked later, the studio will accept requests from PinPlay's
  addresses only and send the header Chrome needs before a website can reach
  a local app (Chrome asks once).
- The existing Edge TTS bridge could later move into the studio, so the
  owner has one local helper.

## 7. The PinPlay side

- The create page loads `listening-script.js`.
- **The listening AI prompt:** the "write" mode uses the script format and
  the rules (section 5), with an updated example.
- **The section panel:** "📋 Copy script" next to the transcript, and a small
  "clean transcript" preview. The transcript stays teacher-only: student
  payloads never include it.
- **🔊 Read the instruction aloud** (an option per section, off by default):
  - PinPlay makes the audio of the section's instruction with its own TTS
    (the quiz's voice and language, saved like question audio) and plays it
    just before the recording.
  - It plays before the first play only, as an exam rubric is read once; it
    doesn't count as a play.
  - In live games, the projector plays it before the recording.
- **Later, if the studio is linked:** a "🎙️ Make the recording" button that
  sends the script to the studio, shows its progress and uploads the MP3 when
  the teacher accepts it.

## 8. Test 0: before building the engine (on D:)

1. **Mia, fixed.** Re-make her lines with "A young British woman of about
   nineteen with a clear, natural, mid-range voice and a southern English
   accent". The aim is a pitch under ~260 Hz, then the owner listens.
2. **Acted or fixed voice.** Make the same scene three ways:
   - (a) acted, as in the demo;
   - (b) fixed voice with Qwen3 Base 0.6B: each voice designed once, then
     every line copied from it;
   - (c) the same with Base 1.7B.

   Measure each character's pitch spread and the time taken. The owner
   listens and picks the default, or a rule such as "acted for dialogues,
   fixed for long monologues".
3. **Batching.** Does giving one character's lines in one call speed things
   up on this processor?
4. **Word check.** Run faster-whisper small on all the lines: time taken,
   and false alarms after normalising numbers, spellings and fillers.

The results set the defaults in 6d.

## 9. Order of work

1. **Script format:** the shared parser, the AI rules, the listening
   prompt's "write" mode and "📋 Copy script", with tests. This is useful
   right away: an AI writes directed scripts.
2. **Test 0.**
3. **The studio engine:** making lines, the cache, the mixer and the checks,
   as a library tested on the station scene.
4. **The studio app:** server, page, launcher `.bat`, desktop icon, and setup
   of anything missing.
5. **PinPlay "🔊 Read the instruction aloud".** This is independent of the
   studio and can be done any time.
6. **Later:**
   - linking studio and PinPlay (Make the recording, upload after the
     teacher accepts);
   - the studio in the teacher installer for other teachers;
   - an Edge "quick draft" (seconds, internet), and Catalan, which Qwen3
     doesn't speak;
   - a Dia2 "natural conversation" mode for two-person exchanges, with the
     word check;
   - a small library of free (CC0) backgrounds (café, street, classroom);
   - media server fixes: correct audio types for WAV, OGG and M4A, and range
     requests (seeking, iPhones).

## 10. Answers and open points

The owner answered on 2026-10-03:

- **Automatic sending to PinPlay:** no. The teacher checks the result first;
  the studio stays detached for now.
- **Spoken exam rubric:** not in the scripts, and not every time. It is a
  PinPlay option per section (section 7).
- **Other teachers:** the studio is for the owner only, for now.

Still open:

- The default voice mode: decided by ear after test 0.
- Read the instruction aloud: is "before the first play only" right, or
  should it come before every play?
