import { useEffect, useState } from 'react'

const SEEN_KEY = 'voicestack.lastSeenReleaseVersion'

function markSeen(version) {
  try {
    localStorage.setItem(SEEN_KEY, String(version))
  } catch {
    // can't persist it, it may show again next check, not fatal
  }
}

// Compares the always-fresh, unhashed /release-notes.json against the last version THIS browser
// has actually been shown (localStorage), not against whatever happens to be baked into the
// current tab's own bundle. Comparing against the bundle's own version meant the banner could
// never announce a release on the very first load of that release, by the time a tab has loaded
// the code for version N, its own baked-in version already IS N, so there was nothing left to
// detect, nobody ever saw version 2 for exactly this reason. Comparing against "have I personally
// seen this one yet" instead means a fresh load right after a deploy still shows it. No background
// timer either, there's no way to be pushed the moment a deploy actually lands without real server
// infrastructure (a webhook + a live connection to every open tab), so this just checks at moments
// that are already natural: once on load, and again whenever the tab is switched back to.
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
        if (!latest) return

        let seen = null
        try {
          seen = localStorage.getItem(SEEN_KEY)
        } catch {
          // storage unavailable, just re-prompt every check, not fatal
        }
        if (String(seen) === String(latest.version)) return
        // Marked the moment it's actually displayed, not only on an explicit dismiss/reload click,
        // once shown once, it's done for this version, even if the tab is just closed or navigated
        // away from without either button ever being pressed.
        markSeen(latest.version)
        if (!cancelled) setAvailable(latest)
      } catch {
        // offline, or the request was blocked, just try again next time the tab regains focus
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
