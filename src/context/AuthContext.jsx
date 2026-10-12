import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { API_URL } from '../lib/apiUrl'
import {
  apiFetch,
  csrfHeaders,
  getAccessToken,
  refreshAccessToken,
  setAccessToken,
  setOnRefreshed,
  setOnSessionExpired,
} from '../lib/apiFetch'

export { API_URL }

const AuthContext = createContext(null)

// How long before the access token's own 15-minute expiry to proactively renew it — leaves
// margin so a slow request or a backgrounded tab waking back up doesn't land in the gap right as
// the old token expires. Reactive refresh-on-401 (in apiFetch) is the backstop if this timer is
// ever late.
const PROACTIVE_REFRESH_MS = 12 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const refreshTimerRef = useRef(null)

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  const scheduleProactiveRefresh = () => {
    clearRefreshTimer()
    refreshTimerRef.current = setTimeout(() => {
      refreshAccessToken()
    }, PROACTIVE_REFRESH_MS)
  }

  // These two fire regardless of what triggered the refresh — AuthContext's own proactive timer,
  // or apiFetch reactively retrying some unrelated component's 401 — so this is the one place
  // React state (token/user) gets kept in sync with whichever path actually ran.
  useEffect(() => {
    setOnRefreshed((body) => {
      setToken(body.token)
      setUser(body.user)
      scheduleProactiveRefresh()
    })
    setOnSessionExpired(() => {
      clearRefreshTimer()
      setToken(null)
      setUser(null)
    })

    let cancelled = false
    async function restore() {
      // No token is held anywhere in storage across a reload by design — this silent refresh is
      // what re-establishes a session using the HttpOnly refresh cookie the browser still has.
      const result = await refreshAccessToken()
      if (cancelled) return
      if (result) {
        setToken(result.token)
        setUser(result.user)
        scheduleProactiveRefresh()
      }
      setLoading(false)
    }
    restore()

    return () => {
      cancelled = true
      clearRefreshTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAuthResponse = async (resPromise) => {
    const res = await resPromise
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Authentication failed')
    }
    const body = await res.json()
    setAccessToken(body.token)
    setToken(body.token)
    setUser(body.user)
    scheduleProactiveRefresh()
    return body.user
  }

  const login = (email, password) =>
    handleAuthResponse(
      fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    )

  const loginWithGoogle = (credential) =>
    handleAuthResponse(
      fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      }),
    )

  // Clears local session state synchronously, before firing the server-side invalidation call —
  // callers immediately navigate away after calling this (see AccountMenu), so user/token need to
  // already be cleared by the time that navigation renders the next page, not after some await.
  // The actual refresh-token invalidation on the server happens in the background either way.
  const logout = () => {
    clearRefreshTimer()
    setAccessToken(null)
    setToken(null)
    setUser(null)
    fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: csrfHeaders(),
    }).catch(() => {})
  }

  // The refresh token rotates on every use, including here — changing your password is treated
  // the same as logging in fresh, ending every other session on the account.
  const changePassword = (currentPassword, newPassword) =>
    handleAuthResponse(
      fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    )

  const updateAvatar = async (avatarUrl) => {
    const res = await apiFetch(`${API_URL}/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarUrl }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Could not update profile picture')
    }
    const body = await res.json()
    setUser(body.user)
    return body.user
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithGoogle,
        logout,
        updateAvatar,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
