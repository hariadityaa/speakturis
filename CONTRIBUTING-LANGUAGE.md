# Adding a language

The engine has no language-specific code. A language is a folder of JSON in `content/<code>/`. Follow these steps.

1. **Copy the Japanese pack.** `cp -r content/ja content/ko` (use the 2 or 3 letter code).
2. **Edit `pack.json`.** Set `code` (must equal the folder name), `name`, `nativeName`, `ttsLocale` (for example `ko-KR`), `readingSystem`, `currency` (including the `unit` word) and `trip`. Optionally list `survival`: the phrase ids pinned on Today and in the phrasebook.
3. **Edit `scripts.json`.** Optional alphabet drills. Leave `systems` empty to skip them (the Japanese pack does). Otherwise list each script system with groups of characters and put the same ids in `pack.json` `scriptSystems`.
4. **Edit `phrases.json`.** Each phrase needs `id`, `native`, `reading`, `english`, `tags`, `difficulty` (1 to 3). Tags must come from `situations` in `pack.json`. Add `speak` if the voice mispronounces the written form. Set `listen: true` for lines you only need to understand, such as what shop staff say. Sight words are phrases tagged `signs`. On a listen phrase, set `replyId` to the phrase to say back.
5. **Edit `numbers.json`.** Give words for 0 to 9, the multipliers (10, 100, 1000 and so on), and `overrides` for irregular forms. The engine composes everything else.
6. **Edit `dialogues.json`.** Each node is an NPC line with 2 to 4 replies. Mark replies `good` or not. Every node must reach an end.
7. **Edit `schedule.json`.** List one or more `plans`, each with an `id`, `name`, `description`, `dailyMinutes` and `weeks`. A plan starts the day the learner picks it. Use `days` (1 to 6) to pace tasks across a week. A `phrases` task lists the `phraseIds` it teaches; they unlock on the task's first day.
8. **Validate.** Run `npm run validate`. Fix every error. The same check runs in CI.
9. **Preview.** Run `npm run dev`, open Settings, switch language, pick a plan, and click through Today, a phrase task and a dialogue.
10. **Commit.** Push to a branch. CI validates the pack. Merge to `main` to deploy.

## Rules the validator enforces

- Ids are unique within a file and use lowercase letters, digits and hyphens.
- Every number from `range.min` to `range.max` can be composed.
- Every study day fits within its plan's `dailyMinutes`.
- Every phrase is taught by at least one plan, and at most once per plan. Every kana group is scheduled.
- All dialogue `next` links resolve and no node is unreachable.

## Optional audio

Put recordings in `content/<code>/audio/` and set `audioSrc` on a phrase (for example `audio/sumimasen.mp3`). The app plays the file when present and falls back to the device voice.

## Device voices

Check that your target phone has a voice for the new `ttsLocale`. The app warns in Settings when none matches.
