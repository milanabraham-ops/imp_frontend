import { useEffect, useRef, useState } from 'react'
import { useBackendStatus } from '../../hooks/useBackendStatus'
import { useTheme } from '../../context/ThemeContext'

// Mounted once at the app root (App.jsx), not any one page, so the very first thing that happens
// on opening the app anywhere is a ping at the backend's health check, waking a sleeping Render
// instance up front rather than waiting for the first real request (a login attempt) to be the
// thing that triggers it and times out looking like a failure. Silent for the common case (the
// backend was already awake), only says anything once there's actually something worth reporting.
export default function BackendStatusBanner() {
  const { theme } = useTheme()
  const status = useBackendStatus()
  const wasWaking = useRef(false)
  const [showReadyConfirm, setShowReadyConfirm] = useState(false)

  useEffect(() => {
    if (status === 'waking') wasWaking.current = true
    if (status === 'ready' && wasWaking.current) {
      setShowReadyConfirm(true)
      const timer = setTimeout(() => setShowReadyConfirm(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [status])

  if (status === 'waking') {
    return (
      <div className="backend-status-banner waking" data-theme={theme} role="status">
        <span className="backend-status-spinner"></span>
        Waking up the server. This can take up to a minute on the first try, it'll confirm here once it's ready.
      </div>
    )
  }

  if (status === 'unreachable') {
    return (
      <div className="backend-status-banner unreachable" data-theme={theme} role="status">
        <i className="ti ti-alert-circle"></i>
        Having trouble reaching the server. Please try again in a few minutes.
      </div>
    )
  }

  if (showReadyConfirm) {
    return (
      <div className="backend-status-banner ready" data-theme={theme} role="status">
        <i className="ti ti-circle-check"></i>
        Server is ready.
      </div>
    )
  }

  return null
}
