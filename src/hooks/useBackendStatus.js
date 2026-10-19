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
const RETRY_MS = 3000
const MAX_ATTEMPTS = 20 // ~1 minute of retrying before calling it a real problem, not just a cold start

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
      } catch {
        // offline, or the request itself timed out, either way just retry below
      }
      if (cancelled) return
      if (attempt >= MAX_ATTEMPTS) {
        setStatus('unreachable')
        return
      }
      setStatus('waking')
      setTimeout(check, RETRY_MS)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [])

  return status
}
