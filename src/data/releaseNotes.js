// Edited by hand before each deploy, newest entry first. `version` just needs to be any value
// different from the previous entry's (bump the number) — that's the only thing a running tab
// compares to notice a new deploy and show the update banner (see useReleaseNotesCheck.js). The
// build emits this same array as a static dist/release-notes.json (see vite.config.js), so an
// already-open tab can read what changed without having to load any of the new code first.
export const RELEASE_NOTES = [
  {
    version: 1,
    items: ['Session token rotation bug causing random logouts has been fixed.'],
  },
]
