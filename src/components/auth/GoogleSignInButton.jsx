import { useEffect, useRef, useState } from 'react'

// The official "G" mark, inline rather than an asset file so this button never waits on a network
// request to look right.
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.9 11.9 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917"
      />
    </svg>
  )
}

// Renders our own button rather than Google's own embedded iframe (google.accounts.id.renderButton).
// That iframe always carries a chunk of white, non-themeable reserved space around the visible
// pill (Google renders its OWN background inside it, which CSS on this page can never reach to
// restyle or crop without cutting into the actual button underneath it too), which read as a white
// strip/edge on this page's dark background no matter how tightly it was clipped. Triggering
// Google's "One Tap" prompt from a plain button click instead keeps the exact same credential flow
// (same initialize()/callback, same ID-token payload the backend already verifies) with zero
// Google-rendered markup inline on the page at all.
export default function GoogleSignInButton({ onCredential }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const readyRef = useRef(false)
  const [notReady, setNotReady] = useState(false)

  const onCredentialRef = useRef(onCredential)
  onCredentialRef.current = onCredential

  useEffect(() => {
    if (!clientId) return
    let cancelled = false

    const tryInit = () => {
      if (cancelled) return
      if (!window.google?.accounts?.id) {
        setTimeout(tryInit, 150)
        return
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => onCredentialRef.current(response.credential),
      })
      readyRef.current = true
    }

    tryInit()
    return () => {
      cancelled = true
    }
  }, [clientId])

  const handleClick = () => {
    if (!readyRef.current || !window.google?.accounts?.id) return
    setNotReady(false)
    window.google.accounts.id.prompt((notification) => {
      // Covers both "the browser/account state means nothing can show right now" and "it showed,
      // then closed without picking an account". Either way, nothing is going to happen on its
      // own, so say so instead of leaving the click looking like it did nothing.
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) setNotReady(true)
    })
  }

  if (!clientId) {
    return (
      <div className="auth-google-slot">
        <div className="hint">Google sign-in is not configured for this deployment.</div>
      </div>
    )
  }

  return (
    <div className="auth-google-slot">
      <button type="button" className="auth-google-btn" onClick={handleClick}>
        <GoogleLogo />
        Sign in with Google
      </button>
      {notReady && <div className="hint">Couldn't open Google sign-in. Check your browser's popup/cookie settings and try again.</div>}
    </div>
  )
}
