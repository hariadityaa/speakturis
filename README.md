# TurisTalk

Mobile-first PWA for learning travel-level phrases. No alphabets, just what you say and hear. First pack: Japanese. It runs fully offline after the first load. No backend, no accounts, no analytics, no third-party requests.

## What it does

- **Learn**: one button for today's lesson. It brings back phrases due for practice, then adds up to 5 new ones a day, most useful first. A new phrase is taught (meaning, romaji, voice) before you are asked for it. Spaced repetition (SM-2 variant) decides when each comes back.
- **Topics**: basics, food, shopping and so on. Each shows how many phrases you know and lets you practise just that topic.
- **Phrasebook**: every phrase by topic, with search. Tap 🔊 to hear one, or tap the phrase to show it full size to staff. "Survival 10" lists the ten phrases that cover most days. "They say" lists staff lines with what to say back.
- **More practice**: number and price drills, and short branching conversations.
- **Backup**: JSON export and import in Settings. Progress lives only on the device.

## Develop

```
npm ci
npm run dev        # http://localhost:5173/turisfasih/
npm test           # SRS, validation, numbers, settings, backup
npm run validate   # check every pack in /content
npm run build      # typecheck + validate + production build into dist/
npm run preview    # serve the production build
```

Node 22 or later.

## Language packs

All language content lives in `content/<code>/`. The engine finds packs at build time, so adding a folder adds a language. See [CONTRIBUTING-LANGUAGE.md](CONTRIBUTING-LANGUAGE.md).

## Deploy (GitHub Pages)

1. In the repo, open Settings → Pages and set Source to **GitHub Actions**.
2. Push to `main`. `.github/workflows/deploy.yml` validates, tests, builds and publishes.
3. The app is served at `https://<user>.github.io/<repo>/`. The base path comes from the repo name. For a custom domain, set `BASE_PATH=/` in the workflow.

`ci.yml` runs typecheck, validation, tests and a build on every PR and on pushes to other branches.

## How it works offline

`vite-plugin-pwa` builds a Workbox service worker that precaches the app shell and every pack. Packs are bundled as JavaScript, so nothing is fetched later. When a new version is ready, the app shows "Update available". The new version applies when you tap Update.

## Audio

The app uses the Web Speech API with the pack's locale (`ja-JP`). Voice quality depends on the phone. Settings shows a warning if no Japanese voice is installed. On Android, install one under Settings → System → Languages → Text-to-speech output. Phrases can optionally point at a recording with `audioSrc`, which the app prefers.

Speech stops when the screen locks on most phones.

## Manual test checklist (Android Chrome)

Run on a real phone against the deployed URL.

**Install**
- [ ] Open the site in Chrome. Menu → Install app (or Settings → Install app). The app opens full screen with no browser bar.
- [ ] The icon on the home screen is the speech bubble. It is not cropped (maskable).
- [ ] Settings shows "Running as installed app."

**Audio**
- [ ] Settings → Audio shows no warning, or a clear warning if no Japanese voice is installed.
- [ ] Test voice speaks Japanese.
- [ ] Open a "what staff say" card. The line plays before you tap.

**Offline (airplane mode)**
- [ ] With the app loaded once online, turn on airplane mode. Force-close the app and reopen it.
- [ ] Learn, a lesson, a topic, Phrasebook, Numbers, Prices and Conversations all open and work.
- [ ] Finish a lesson. Close and reopen. Learn shows "All done for today" and the learned count persists.

**Backup and restore**
- [ ] Settings → Export backup. Save the file.
- [ ] Do a lesson, then Start over (erase progress).
- [ ] Settings → Import backup, pick the file. Progress returns. Learn shows the learned count again.
- [ ] Import a non-backup JSON. It shows "Not a TurisTalk backup." and changes nothing.

**Updates**
- [ ] Push a change to `main`. Reopen the app twice. "Update available" appears. Tap Update. The new version loads.

**Display**
- [ ] Switch the phone between light and dark mode. The app follows.

## Lighthouse

Chrome DevTools → Lighthouse → Mobile, on the deployed URL. Chrome removed the separate PWA score. Check instead that Application → Manifest shows no errors and "Installable", and that Performance, Accessibility and Best Practices are green.

## Known limits

- No cross-device sync. Use Export and Import.
- Speech does not continue with the screen locked.
- Japanese content is not reviewed by a native speaker. Have one check `content/ja/phrases.json` and `dialogues.json` before relying on it.
- iOS is not a target. It should work but is untested.
