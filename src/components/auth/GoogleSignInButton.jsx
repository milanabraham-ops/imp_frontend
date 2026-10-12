import { useEffect, useRef } from 'react'

export default function GoogleSignInButton({ onCredential }) {
  const divRef = useRef(null)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  // Read via a ref rather than listing onCredential as an effect dependency — the parent
  // (Login/Signup page) recreates that function on every render (e.g. every keystroke in the
  // form), and re-running Google's own initialize() that often is what triggered its
  // "called multiple times" warning. Initializing should only happen once per mount.
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
      if (divRef.current) {
        const width = Math.min(360, window.innerWidth - 120)
        window.google.accounts.id.renderButton(divRef.current, {
          theme: 'filled_black',
          shape: 'pill',
          size: 'large',
          width,
        })
      }
    }

    tryInit()
    return () => {
      cancelled = true
    }
  }, [clientId])

  if (!clientId) {
    return (
      <div className="auth-google-slot">
        <div className="hint">Google sign-in is not configured for this deployment.</div>
      </div>
    )
  }

  return <div ref={divRef} className="auth-google-slot"></div>
}
