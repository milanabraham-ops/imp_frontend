import { useEffect, useState } from 'react'
import { RELEASE_NOTES } from '../data/releaseNotes'

const SHOWN_KEY = 'voicestack.shownReleaseVersion'
const CURRENT_VERSION = RELEASE_NOTES[0]?.version

function markShown(version) {
  try {
    localStorage.setItem(SHOWN_KEY, String(version))
  } catch {
    // can't persist it — it may show again next check, not fatal
  }
}

// Checks the always-fresh, unhashed /release-notes.json (not whatever's baked into this tab's own
// bundle) so a tab left open across a deploy can notice the gap without needing the new JS loaded
// first — same reasoning as the "already shown" flag living in localStorage rather than state
// that'd reset on every reload/login: a version is shown at most once, ever, on this device. No
// background timer either — there's no way to be pushed the moment a deploy actually lands without
// real server infrastructure (a webhook + a live connection to every open tab), so this just checks
// at moments that are already natural: once on load, and again whenever the tab is switched back
// to, rather than polling on a schedule for no particular reason.
export function useReleaseNotesCheck() {
  const [available, setAvailable] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const res = await fetch(`/release-notes.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const notes = await res.json()
        const latest = notes[0]
        if (!latest || latest.version === CURRENT_VERSION) return

        let shown = null
        try {
          shown = localStorage.getItem(SHOWN_KEY)
        } catch {
          // storage unavailable — just re-prompt every check, not fatal
        }
        if (String(shown) === String(latest.version)) return
        // Marked the moment it's actually displayed, not only on an explicit dismiss/reload click —
        // once shown once, it's done for this version, even if the tab is just closed or navigated
        // away from without either button ever being pressed.
        markShown(latest.version)
        if (!cancelled) setAvailable(latest)
      } catch {
        // offline, or the request was blocked — just try again next time the tab regains focus
      }
    }

    check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  function dismiss() {
    setAvailable(null)
  }

  function reload() {
    window.location.reload()
  }

  return { available, dismiss, reload }
}
