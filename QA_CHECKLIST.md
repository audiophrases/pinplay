# PinPlay QA Checklist (pre-beta hardening)

## 1) Core Game Lifecycle
- [ ] Create live game, join with 2+ players, start, progress, results
- [ ] Previous/Next navigation behavior
- [ ] Manual reveal/close behavior
- [ ] Rejoin/resume host by PIN

## 2) Timing
- [ ] Standard countdown works per question type
- [ ] `timeLimit=0` behaves as no-limit (close only all answered/manual)
- [ ] Timer bars render correctly host + player

## 3) Question Types
- [ ] mcq / multi / tf
- [ ] text (auto-correct when accepted answers exist)
- [ ] text (teacher-graded when accepted answers empty)
- [ ] open / speaking grading
- [ ] image_open (student uploads/photographs an image — camera + gallery, preview + replace, upload status; teacher grades the submitted image)
- [ ] context_gap (including comma-separated multiple accepted answers per blank)
- [ ] match_pairs
- [ ] error_hunt
- [ ] puzzle (click + drag; tokens stay visible)
- [ ] slider
- [ ] pin

## 4) Poll Mode
- [ ] No score impact
- [ ] Anonymous summary reveal
- [ ] Hide moderation + Other bucket
- [ ] Host toggle bar/cloud views for text-like poll types

## 5) Scoring / Bets
- [ ] Bet modifiers apply correctly
- [ ] No regressions for teacher-graded scoring

## 6) UX / Mobile
- [ ] Secondary host controls usable on mobile
- [ ] Touch targets, responsive controls
- [ ] Student join flow on mobile

## 6b) Unified Preview (final)
- [ ] Unified Preview button opens teacher live preview and auto-scrolls to preview area
- [ ] 14 simulated students render in stacked cards with random names
- [ ] Mixed outcomes visible (correct / wrong / no submission) + bet indicators/chips
- [ ] Summary line shows submitted count, distribution, phase, and seed
- [ ] Re-roll class regenerates names + behavior and resets local preview grading
- [ ] Re-sim current question changes only current-question simulation and clears local patches for that question
- [ ] Jump control moves directly to target question number
- [ ] Teacher answer history panel mirrors simulated entries for current question
- [ ] Teacher grading actions work locally in preview (grade/correction/model/hide) with immediate UI refresh

## 6c) Student sign-in and roster
- [ ] Join page shows the Google button only for login-required games/assignments
- [ ] Signing in with a school account works; the chip shows name and class
- [ ] "Not you?" clears the session and offers the Google button again
- [ ] Session survives a reload (no second sign-in on the same device)
- [ ] A personal (non-school) account is refused with a clear message
- [ ] A brand-new school account auto-enrols and appears in Students with no class
- [ ] Assignment: previous attempts still listed after switching from the old login
- [ ] Live game: hall list shows the class, e.g. "(4B)"
- [ ] Live game: the same student cannot join twice from two devices
- [ ] Results: class badge and notify address resolve without a roster sheet
- [ ] Students panel: add by email, edit class inline, rename, remove
- [ ] Students panel: CSV import (merge and replace) and export round-trip
- [ ] Sign-in rules: roster-only mode refuses an unlisted school account
- [ ] Random-name games and assignments still need no sign-in at all

## 7) Reliability
- [ ] Question close reasons (timeout/all_answered/manual) are consistent
- [ ] State polling survives intermittent failures
- [ ] No uncaught errors in console during normal playthrough

## 8) Release Guard
- [ ] Full template quiz run-through
- [ ] Smoke pass after each deploy
- [ ] Regression list maintained and rechecked
