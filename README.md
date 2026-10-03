# Turisfasih

Mobile-first PWA for learning travel-level phrases. First pack: Japanese, for a Sapporo trip on 30 Jan 2027. It runs fully offline after the first load. No backend, no accounts, no analytics, no third-party requests.

## What it does

- **Today**: the day's tasks from the 17-week schedule, a streak, and due reviews. First run asks which language to learn.
- **Review**: spaced repetition (SM-2 variant) for kana and phrases. Cards are text-first. Tap to reveal and hear.
- **Practice**: flashcards, kana drills (both directions), number and yen drills, menu and sign reading, branching role-play.
- **Commute mode**: loops phrase, pause, meaning, next. Big buttons. Keeps the screen on.
- **Progress**: mastery per script and per situation.
- **Backup**: JSON export and import in Settings. Progress lives only on the device.

## Develop

```
npm ci
npm run dev        # http://localhost:5173/turisfasih/
npm test           # SRS, validation, numbers, schedule, streak
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

Speech stops when the screen locks on most phones. Commute mode holds a wake lock so the screen stays on while it plays.

## Manual test checklist (Android Chrome)

Run on a real phone against the deployed URL.

**Install**
- [ ] Open the site in Chrome. Menu → Install app (or Settings → Install app). The app opens full screen with no browser bar.
- [ ] The icon on the home screen is the speech bubble. It is not cropped (maskable).
- [ ] Settings shows "Running as installed app."

**Audio**
- [ ] Settings → Audio shows no warning, or a clear warning if no Japanese voice is installed.
- [ ] Test voice speaks Japanese.
- [ ] Open a kana drill (sound → character). The sound plays.

**Offline (airplane mode)**
- [ ] With the app loaded once online, turn on airplane mode. Force-close the app and reopen it.
- [ ] Today, Review, Kana, Numbers, Prices, Reading, Role-play and Commute all open and work.
- [ ] Grade a card. Close and reopen. The due count changed and progress persists.

**Backup and restore**
- [ ] Settings → Export backup. Save the file.
- [ ] Do a few reviews, then Reset Japanese progress.
- [ ] Settings → Import backup, pick the file. Progress returns. Today shows the streak and due reviews again.
- [ ] Import a non-backup JSON. It shows "Not a Turisfasih backup." and changes nothing.

**Updates**
- [ ] Push a change to `main`. Reopen the app twice. "Update available" appears. Tap Update. The new version loads.

**Display**
- [ ] Switch the phone between light and dark mode. The app follows.

## Lighthouse

Chrome DevTools → Lighthouse → Mobile, on the deployed URL. Chrome removed the separate PWA score. Check instead that Application → Manifest shows no errors and "Installable", and that Performance, Accessibility and Best Practices are green.

## Known limits

- No cross-device sync. Use Export and Import.
- Speech does not continue with the screen locked.
- Japanese content is not reviewed by a native speaker. Have one check `content/ja/phrases.json` and `dialogues.json` before the trip.
- iOS is not a target. It should work but is untested.
