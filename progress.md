Original prompt: "read and understand our app's purpose (both PRD and AGENTS.md and codebase) to brainstorm and plan for making more games on game page"

## 2026-02-06 - Implementation kickoff
- Confirmed direction with user:
  1) no chat-driven games
  2) minigame results visible in /app/progress
  3) implement Listening Quiz + Grammar Challenge
- Starting TDD with failing tests for curriculum-based content generators.

## 2026-02-06 - TDD cycle 1 complete
- Added failing tests for new curriculum-based minigame content module (`frontend/src/lib/minigameContent.test.ts`).
- Verified RED state: import resolution failed because module did not exist.
- Implemented `frontend/src/lib/minigameContent.ts` with:
  - listening quiz question builder
  - grammar challenge question builder
- Verified GREEN state: tests now pass (`npm run test -- src/lib/minigameContent.test.ts`).

## 2026-02-06 - Implementation complete
- Added backend minigame persistence and reporting:
  - `POST /api/minigames/attempts`
  - `GET /api/minigames/summary`
  - Firestore helpers in `database.py` for attempts + aggregates.
- Replaced `/app/games` flow with objective/scenario-driven games (no chat/session dependency).
- Added new game components:
  - `ListeningQuiz`
  - `GrammarChallenge`
- Added minigame content generator module + tests.
- Wired result persistence to backend and progress visibility in `/app/progress`.
- Updated EN/KO localization keys for new games/progress labels.

## Verification run
- `npm run lint` (frontend): pass
- `npm run test` (frontend): pass
- `python3 -m py_compile main.py database.py`: pass
- `npm run build` (frontend): fails due pre-existing TypeScript issues in pronunciation files unrelated to this change set.

## TODO / next iteration
- Replace static curriculum source with backend-delivered curriculum per locale.
- Expand grammar challenge generator beyond particle-based items.
- Add dedicated tests for minigame API clients and `/app/progress` rendering with minigame data.

## 2026-02-06 - Build blocker fix (pronunciation)
- Fixed TypeScript build errors in pronunciation modules:
  - `usePronunciationPractice.ts`: replaced impossible `LearningLocale === 'en-US'` comparison with string-safe check.
  - `PronunciationPracticePage.tsx`: widened objective stats accumulator arrays to include optional score values.
  - `PronunciationPracticePage.tsx`: removed unsupported `t(key, params)` call and replaced with placeholder string substitution.
- Verification:
  - `npm run build` (frontend): pass
  - `npm run lint` (frontend): pass

## 2026-02-07 - Restored chat-based games on /app/games
- Added regression test `frontend/src/pages/AppGamesPage.test.tsx` to ensure `/app/games` includes both game families.
- Restored chat-based game section in `AppGamesPage`:
  - loads chat sessions with messages
  - allows chat selection
  - launches existing `FlashcardFlip` and `WordMatch`
- Kept curriculum-driven `Listening Quiz` and `Grammar Challenge` intact.
- Added EN/KO i18n keys for chat-based section labels/errors.

## Verification
- `npm run lint` (frontend): pass
- `npm run test` (frontend): pass
- `npm run build` (frontend): pass (warnings only: CSS @import order, large bundle chunk)
