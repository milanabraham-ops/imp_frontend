import { useEffect } from 'react'

// Shared Escape-to-close behavior — none of the app's modals/dialogs had this before, a keyboard
// trap for anyone not using a mouse. `active` gates the listener so a modal that's always mounted
// but conditionally "open" (several of these render unconditionally and just return null when
// closed) doesn't keep eating Escape for the rest of the page while hidden. Safe to call
// unconditionally regardless of the caller's own open/closed state — this hook must run every
// render either way, per the Rules of Hooks, so it takes that state as a plain argument instead.
export function useEscapeClose(active, onClose) {
  useEffect(() => {
    if (!active) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [active, onClose])
}
