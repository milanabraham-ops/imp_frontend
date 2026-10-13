import { API_URL } from './apiUrl'

// The access token lives here in memory only — never in localStorage/sessionStorage, so an XSS
// bug can't read a persisted token off disk. It's lost on every page reload by design; AuthContext
// re-establishes it via a silent refresh (using the HttpOnly refresh cookie) on mount.
let currentToken = null
export function setAccessToken(token) {
  currentToken = token
}
export function getAccessToken() {
  return currentToken
}

// Fired with the fresh {token, user} whenever any refresh succeeds — whether triggered
// proactively (AuthContext's renewal timer) or reactively (apiFetch retrying a 401). Either path
// goes through the same refreshAccessToken() below, so AuthContext only needs to register this
// once to stay in sync regardless of which path caused the change.
let onRefreshed = () => {}
export function setOnRefreshed(fn) {
  onRefreshed = fn
}

let onSessionExpired = () => {}
export function setOnSessionExpired(fn) {
  onSessionExpired = fn
}

// The backend's CSRF check (see middleware/csrf.js) compares this against a value it derives from
// the httpOnly refresh cookie — it used to be a second, JS-readable cookie the frontend echoed
// back out of document.cookie, but that cookie belongs to the BACKEND's own origin (Render), and a
// page on a different origin (Vercel) can never read another origin's cookie via document.cookie,
// no matter its Path/SameSite/Secure settings. That silently failed this check on every single
// refresh in production, logging everyone out on every reload. localStorage is same-origin to the
// frontend instead, and (unlike the access token) this value has no power on its own without the
// httpOnly cookie alongside it, so persisting it is fine — it needs to survive a reload, same as
// the refresh cookie does, so the very first refresh call after one still has it available.
const CSRF_STORAGE_KEY = 'voicestack.csrf'

export function getCsrfToken() {
  try {
    return localStorage.getItem(CSRF_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setCsrfToken(token) {
  try {
    if (token) localStorage.setItem(CSRF_STORAGE_KEY, token)
    else localStorage.removeItem(CSRF_STORAGE_KEY)
  } catch {
    // storage unavailable — refresh/logout will just fail the CSRF check until it's available again
  }
}

export function csrfHeaders() {
  const csrfToken = getCsrfToken()
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : {}
}

// Dedupes concurrent refresh attempts — if several components hit a 401 around the same moment
// (e.g. multiple polling intervals firing right as the access token expires), only one actual
// /auth/refresh call goes out; everyone else awaits that same in-flight request instead of each
// rotating the refresh token out from under one another.
let refreshInFlight = null

export async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
      })
      if (!res.ok) {
        setAccessToken(null)
        setCsrfToken(null)
        onSessionExpired()
        return null
      }
      const body = await res.json()
      setAccessToken(body.token)
      setCsrfToken(body.csrfToken)
      onRefreshed(body)
      return body
    } catch {
      setAccessToken(null)
      setCsrfToken(null)
      onSessionExpired()
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

// Drop-in replacement for fetch() used by every authenticated API call — attaches the current
// access token automatically (callers no longer build the Authorization header themselves), and
// on a 401 makes one silent refresh attempt before retrying the request once. Behaves exactly
// like fetch() otherwise: returns the Response as-is (including non-2xx), never throws itself, so
// every existing "if (!res.ok) ..." call site keeps working unchanged.
export async function apiFetch(url, options = {}) {
  const doFetch = () => {
    const headers = { ...options.headers }
    if (currentToken) headers.Authorization = `Bearer ${currentToken}`
    return fetch(url, { ...options, headers })
  }

  let res = await doFetch()
  if (res.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed) res = await doFetch()
  }
  return res
}
