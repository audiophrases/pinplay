# R2 cleanup safety — READ BEFORE DELETING ANY MEDIA

On 2026-06-01, a manual bulk delete of the R2 `voice_records/` prefix destroyed
**492 student voice recordings that live assignments still referenced** (226 were
later recovered from a browser cache; 242 were permanently lost). This document
exists so it never happens again.

## The trap

Student answer media is referenced from **attempt data**, NOT from the quiz
definition. The quiz JSON (`/api/assignments/get-quiz`) and the cloud quiz
manifests under `quizzes/` do **not** list student recordings. They live in each
attempt's `gradingItems[].answer.audioUrl` (and `.imageUrl`), reachable only via
`/api/assignments/attempt` (per attempt).

So a folder can look "orphaned" (unreferenced by any quiz) while being actively
referenced by hundreds of submitted attempts.

## Specifically dangerous: the flat `voice_records/` and `image_answers/` folders

Live-game answer media is uploaded to the **flat** `voice_records/` /
`image_answers/` folders (see `/api/player/voice-upload`). When a login-required
live game finishes, it is **snapshotted into a persistent assignment**, whose
attempts keep pointing at those flat-folder files **forever**. Nothing in the
worker ever sweeps these folders (by design — there is no safe per-file orphan
signal for them). **Never bulk-delete `voice_records/` or `image_answers/`.**

## Safe-delete rule (mandatory before ANY media deletion)

A media key is safe to delete ONLY if it is referenced by **neither**:

1. any cloud quiz manifest (`quizzes/*.json`), NOR
2. any **attempt** of any live assignment — iterate every assignment via
   `/api/assignments/list`, then every attempt via `/api/assignments/attempt`,
   and collect every `gradingItems[].answer.audioUrl` / `.imageUrl`.

Build the full referenced-key set FIRST; only keys absent from it may be removed.
When in doubt, do not delete — storage is cheap (10 GB free tier); student work
is irreplaceable.

## The worker's own delete paths are NOT the bug

`extractMediaPrefixesFromQuiz` + `deleteR2Prefix` in `worker.js` are correctly
scoped to `assign-<code>` / `live-<pin>` / `quiz-*` prefixes and already skip
shared `quiz-*` media (see `isSharedQuizMediaPrefix`). The incident was a manual
out-of-band delete, not these paths. Keep it that way: route cleanup through code
that honors the safe-delete rule above.
