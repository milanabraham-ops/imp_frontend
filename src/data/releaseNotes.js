// Edited by hand before each deploy, newest entry first. `version` just needs to be any value
// different from the previous entry's (bump the number), that's the only thing a running tab
// compares to notice a new deploy and show the update banner (see useReleaseNotesCheck.js). The
// build emits this same array as a static dist/release-notes.json (see vite.config.js), so an
// already-open tab can read what changed without having to load any of the new code first.
export const RELEASE_NOTES = [
  {
    version: 3,
    items: [
      'Added a self-service "Forgot password" option on the login page.',
      'Forwarding numbers are now optional per account, with date filtering and an Excel export on the Forwarding Numbers page.',
      'QA can no longer mark a review complete while it still has unresolved errors. A clarification blocks completion the first time it comes up, but not on the recheck after.',
      'Added a status message while the server is waking up.',
    ],
  },
  {
    version: 2,
    items: ['Fixed an issue where reloading the page could log you out.'],
  },
  {
    version: 1,
    items: ['Session token rotation bug causing random logouts has been fixed.'],
  },
]
