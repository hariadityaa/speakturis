# Adding a language

The engine has no language-specific code. A language is a folder of JSON in `content/<code>/`. Follow these steps.

1. **Copy the Japanese pack.** `cp -r content/ja content/ko` (use the 2 or 3 letter code).
2. **Edit `pack.json`.** Set `code` (must equal the folder name), `name`, `nativeName`, `ttsLocale` (for example `ko-KR`), `readingSystem`, `currency` (including the `unit` word) and `situations`. Each situation is a topic with an `id` and a `label`, such as `{ "id": "food", "label": "Food and drink" }`.
3. **Edit `scripts.json`.** Optional alphabet drills. Leave `systems` empty to skip them (the Japanese pack does). Otherwise list each script system with groups of characters and put the same ids in `pack.json` `scriptSystems`.
4. **Edit `phrases.json`.** Each phrase needs `id`, `native`, `reading`, `english`, `tags`, `difficulty` (1 to 3). Tags must be situation ids from `pack.json`. The first tag is where the phrase sits in the phrasebook. **Order matters:** lessons teach phrases in file order, so put the most useful ones first. Add `speak` if the voice mispronounces the written form. Set `listen: true` for lines you only need to understand, such as what shop staff say. Sight words are phrases tagged `signs`.
5. **Edit `numbers.json`.** Give words for 0 to 9, the multipliers (10, 100, 1000 and so on), and `overrides` for irregular forms. The engine composes everything else.
6. **Edit `dialogues.json`.** Each node is an NPC line with 2 to 4 replies. Mark replies `good` or not. Every node must reach an end.
7. **Validate.** Run `npm run validate`. Fix every error. The same check runs in CI.
8. **Preview.** Run `npm run dev`, pick the language, and click through a lesson, a topic, the phrasebook and a conversation.
9. **Commit.** Push to a branch. CI validates the pack. Merge to `main` to deploy.

## Rules the validator enforces

- Ids are unique within a file and use lowercase letters, digits and hyphens.
- Every number from `range.min` to `range.max` can be composed.
- Every phrase tag and dialogue situation is a situation id in `pack.json`.
- All dialogue `next` links resolve and no node is unreachable.

## Optional audio

Put recordings in `content/<code>/audio/` and set `audioSrc` on a phrase (for example `audio/sumimasen.mp3`). The app plays the file when present and falls back to the device voice.

## Device voices

Check that your target phone has a voice for the new `ttsLocale`. The app warns in Settings when none matches.
