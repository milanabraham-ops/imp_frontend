import { useEffect, useState } from 'react'
import { API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useToast } from '../../context/ToastContext'
import { useEscapeClose } from '../../hooks/useEscapeClose'
import ConfirmDialog from './ConfirmDialog'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Rough, good-enough device label from a raw User-Agent string — not a full UA parser, just
// enough to tell sessions apart at a glance ("Chrome on Windows" vs "Safari on iPhone") instead
// of showing the raw string, which nobody reads.
function describeDevice(ua) {
  if (!ua) return 'Unknown device'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : ''
  return os ? `${browser} on ${os}` : browser
}

// Per-device session list — each device that's logged in gets its own Session document on the
// backend now (see backend models/Session.js) instead of one shared counter on the user that
// invalidated every OTHER device the moment any one device's token rotated. Lets someone actually
// see what's signed in and end just one of them (a lost/stolen device) without logging themselves
// out everywhere.
export default function SessionsModal({ open, onClose }) {
  const { showToast } = useToast()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [pendingRevokeOthers, setPendingRevokeOthers] = useState(false)
  const [revokingOthers, setRevokingOthers] = useState(false)

  useEscapeClose(open && !pendingRevokeOthers, onClose)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/auth/sessions`)
      if (!res.ok) throw new Error('Failed to load sessions')
      const body = await res.json()
      setSessions(Array.isArray(body) ? body : [])
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const revoke = async (id) => {
    setBusyId(id)
    try {
      const res = await apiFetch(`${API_URL}/auth/sessions/${id}/revoke`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to sign out that device')
      }
      setSessions((prev) => prev.filter((s) => s.id !== id))
      showToast('Signed that device out.')
    } catch (err) {
      showToast(err.message || 'Failed to sign out that device', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const confirmRevokeOthers = async () => {
    setRevokingOthers(true)
    try {
      const res = await apiFetch(`${API_URL}/auth/sessions/revoke-others`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to sign out other devices')
      const body = await res.json().catch(() => ({}))
      setSessions((prev) => prev.filter((s) => s.current))
      setPendingRevokeOthers(false)
      showToast(`Signed out ${body.revokedCount || 0} other device${body.revokedCount === 1 ? '' : 's'}.`)
    } catch (err) {
      showToast(err.message || 'Failed to sign out other devices', 'error')
    } finally {
      setRevokingOthers(false)
    }
  }

  if (!open) return null

  const otherCount = sessions.filter((s) => !s.current).length

  return (
    <div className="confirm-dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-dialog detail-modal" role="dialog" aria-modal="true">
        <div className="detail-modal-header">
          <div>
            <h3 className="confirm-dialog-title">Signed-in devices</h3>
            <p className="detail-modal-sub">Every device currently signed in to your account.</p>
          </div>
          <button type="button" className="btn-sm" onClick={onClose}>
            <i className="ti ti-x"></i> Close
          </button>
        </div>

        <div className="detail-modal-body">
          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
              <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={load}>
                <i className="ti ti-refresh"></i> Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="dash-empty">Loading…</div>
          ) : (
            <>
              {otherCount > 0 && (
                <button type="button" className="btn-sm danger" style={{ marginBottom: 12 }} onClick={() => setPendingRevokeOthers(true)}>
                  <i className="ti ti-logout"></i> Log out all other devices ({otherCount})
                </button>
              )}
              {sessions.map((s) => (
                <div className="qa-checklist-row" key={s.id}>
                  <span className="qa-checklist-item-name">
                    {describeDevice(s.userAgent)}
                    {s.current && (
                      <span className="you-badge" style={{ marginLeft: 6 }}>
                        this device
                      </span>
                    )}
                    <div className="hint" style={{ marginTop: 2 }}>
                      {s.ip ? `${s.ip} · ` : ''}Last active {formatDateTime(s.lastUsedAt)}
                    </div>
                  </span>
                  {!s.current && (
                    <button type="button" className="btn-sm danger" disabled={busyId === s.id} onClick={() => revoke(s.id)}>
                      <i className="ti ti-logout"></i> {busyId === s.id ? 'Signing out…' : 'Sign out'}
                    </button>
                  )}
                </div>
              ))}
              {sessions.length === 0 && <div className="dash-empty">No active sessions found.</div>}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingRevokeOthers}
        title="Log out all other devices?"
        message={`This immediately signs out ${otherCount} other device${otherCount === 1 ? '' : 's'}. This device stays signed in.`}
        confirmLabel="Log out others"
        danger
        busy={revokingOthers}
        onConfirm={confirmRevokeOthers}
        onCancel={() => setPendingRevokeOthers(false)}
      />
    </div>
  )
}
