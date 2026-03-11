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
- [ ] open / speaking / image_open grading
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
- [ ] Unified preview opens and auto-scrolls to live preview card
- [ ] Unified preview shows 14 stacked simulated students with mixed outcomes and bets

## 7) Reliability
- [ ] Question close reasons (timeout/all_answered/manual) are consistent
- [ ] State polling survives intermittent failures
- [ ] No uncaught errors in console during normal playthrough

## 8) Release Guard
- [ ] Full template quiz run-through
- [ ] Smoke pass after each deploy
- [ ] Regression list maintained and rechecked
