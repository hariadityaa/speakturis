# Working on TurisTalk

## Preview before pushing UI changes
Any change that affects what the user sees (src/ui, styles, index.html, icons, content rendering) must be previewed before commit/push.

1. `npm run build:preview` builds to `dist-preview/` with relative paths.
2. Publish `dist-preview/index.html` as an Artifact, passing every other file in `dist-preview/` via `files`.
   Reuse the same file path within a session so the preview link stays stable.
3. Share the link and wait for the user to approve.
4. Only then commit, push, open the PR, and merge once CI is green.

Skip the preview for content-only, test, tooling, or CI changes.
The service worker and install prompt may not work inside the Artifact sandbox; that is expected.
