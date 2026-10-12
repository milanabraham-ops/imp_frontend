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

function readCookie(name) {
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

// Double-submit CSRF check on the backend compares this cookie's value against the same value
// sent as a header — reading it fresh from document.cookie (rather than tracking a copy in JS
// state) means it's always current, including right after a page reload when no in-memory copy
// exists yet.
export function csrfHeaders() {
  const csrfToken = readCookie('csrfToken')
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
        onSessionExpired()
        return null
      }
      const body = await res.json()
      setAccessToken(body.token)
      onRefreshed(body)
      return body
    } catch {
      setAccessToken(null)
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
