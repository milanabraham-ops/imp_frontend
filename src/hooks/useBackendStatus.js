import { useEffect, useState } from 'react'
import { API_URL } from '../lib/apiUrl'

// Polls the backend's own health check (no auth, no DB query, just confirms the process is up and
// answering) so the login page can say what's actually happening instead of a bare failed request.
// A single attempt isn't enough on its own: Render's free tier sleeps the backend after a period of
// inactivity, and the first request after that just sits there until it finishes booting, which can
// take anywhere from a few seconds to under a minute, long enough that Vercel's own proxy rewrite
// can time the request out and return a 502 before the backend ever gets a chance to answer. So
// this retries on any failure rather than giving up after one, the backend really is on its way up,
// just not within whatever that first attempt's own timeout happened to be.
//
// Kept deliberately gentle and desynchronized: every tab doing an identical fetch every few seconds
// in lockstep is exactly the request pattern that got Vercel's edge (Cloudflare) to start serving a
// bot challenge on /api/* for everyone, confirmed live, instead of proxying to the backend at all,
// a self-inflicted outage. A wider base interval plus random jitter spreads simultaneous page loads
// out instead of all firing at t=0/t=N in sync, and a 429 means "being rate-limited/challenged", not
// "still booting", retrying into that on the same schedule only reinforces whatever flagged it, so
// that case backs off immediately instead of burning through the remaining attempts.
const RETRY_MS = 6000
const RETRY_JITTER_MS = 3000
const MAX_ATTEMPTS = 8 // ~45s-1min of retrying (with jitter) before calling it a real problem

export function useBackendStatus() {
  const [status, setStatus] = useState('checking') // 'checking' | 'waking' | 'ready' | 'unreachable'

  useEffect(() => {
    let cancelled = false
    let attempt = 0

    async function check() {
      attempt += 1
      try {
        const res = await fetch(`${API_URL}/health`, { cache: 'no-store' })
        if (cancelled) return
        if (res.ok) {
          setStatus('ready')
          return
        }
        if (res.status === 429) {
          setStatus('unreachable')
          return
        }
      } catch {
        // offline, or the request itself timed out, either way just retry below
      }
      if (cancelled) return
      if (attempt >= MAX_ATTEMPTS) {
        setStatus('unreachable')
        return
      }
      setStatus('waking')
      setTimeout(check, RETRY_MS + Math.random() * RETRY_JITTER_MS)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  return status
}
