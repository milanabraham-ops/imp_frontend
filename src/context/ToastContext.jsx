import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { useTheme } from './ThemeContext'

const ToastContext = createContext(null)
const AUTO_DISMISS_MS = 3500

export function ToastProvider({ children }) {
  const { theme } = useTheme()
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // tone: 'success' | 'error' | 'info' ('info' is for background notifications — a new request,
  // handoff, comment, etc. arriving from the poll, not a direct result of something the viewer
  // just clicked). Auto-dismisses on its own timer, but can also be closed early.
  const showToast = useCallback(
    (message, tone = 'success') => {
      const id = ++idRef.current
      setToasts((prev) => [...prev, { id, message, tone }])
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" data-theme={theme}>
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} role="status">
            <i className={`ti ${t.tone === 'error' ? 'ti-alert-circle' : t.tone === 'info' ? 'ti-bell' : 'ti-circle-check'}`}></i>
            <span>{t.message}</span>
            <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
              <i className="ti ti-x"></i>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
