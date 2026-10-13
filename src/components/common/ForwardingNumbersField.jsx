import { useEffect, useState } from 'react'
import { API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useToast } from '../../context/ToastContext'

// A plain text field (one number per line) — shared by the submission detail view, the QA review
// modal, and the standalone Forwarding Numbers table, so there's one place that knows how to save
// it rather than three separate copies. Deliberately open to everyone (POC included, unlike every
// other tracked field): saved through the normal PATCH /submissions/:id endpoint, which allows it
// for every role (see submissionController's TRACKING_FIELDS_BY_ROLE/stripTrackingFields). The
// backend de-dupes by digits only on save, so typing the same number in a different format on
// another line just collapses back down instead of listing it twice.
//
// The Yes/No toggle alongside it is the same `forwardingNumberRequired` field the intake wizard's
// own Phone Numbers & Hours step sets — surfaced here too (not just there) so staff reviewing an
// account from the submission detail view, QA review, or this table can flip it without having to
// reopen the full wizard. ForwardingNumbersPage only lists accounts where it's on.
export default function ForwardingNumbersField({ submission, onChanged, compact = false }) {
  const { showToast } = useToast()
  const [value, setValue] = useState(submission?.forwardingNumbers || '')
  const [busy, setBusy] = useState(false)
  const [requiredBusy, setRequiredBusy] = useState(false)

  useEffect(() => {
    setValue(submission?.forwardingNumbers || '')
  }, [submission?._id, submission?.forwardingNumbers])

  const dirty = value !== (submission?.forwardingNumbers || '')

  const save = async () => {
    if (!dirty || busy) return
    setBusy(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${submission._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forwardingNumbers: value }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to save forwarding numbers')
      setValue(body.forwardingNumbers || '')
      onChanged?.(body)
      showToast('Forwarding numbers saved.')
    } catch (err) {
      showToast(err.message || 'Failed to save forwarding numbers', 'error')
    } finally {
      setBusy(false)
    }
  }

  const setRequired = async (required) => {
    if (requiredBusy || required === Boolean(submission?.forwardingNumberRequired)) return
    setRequiredBusy(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${submission._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forwardingNumberRequired: required }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to save')
      onChanged?.(body)
    } catch (err) {
      showToast(err.message || 'Failed to save', 'error')
    } finally {
      setRequiredBusy(false)
    }
  }

  return (
    <div className={compact ? 'forwarding-numbers-compact' : 'review-section'}>
      {!compact && (
        <div className="review-section-header">
          <h3>Forwarding Numbers</h3>
        </div>
      )}
      {!compact && <div className="hint" style={{ marginBottom: 6 }}>One number per line. Anyone with access to this account can edit this.</div>}
      <div className="forwarding-required-toggle">
        <span>Required?</span>
        <button
          type="button"
          className={`btn-sm${submission?.forwardingNumberRequired ? ' active' : ''}`}
          disabled={requiredBusy}
          onClick={() => setRequired(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className={`btn-sm${submission?.forwardingNumberRequired ? '' : ' active'}`}
          disabled={requiredBusy}
          onClick={() => setRequired(false)}
        >
          No
        </button>
      </div>
      <textarea
        className="inline-edit-input forwarding-numbers-textarea"
        placeholder="One forwarding number per line…"
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            save()
          }
        }}
      />
      {!compact && (
        <div style={{ marginTop: 6 }}>
          <button type="button" className="btn-sm" disabled={!dirty || busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}
