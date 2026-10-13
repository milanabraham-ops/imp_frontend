import { useEffect, useState } from 'react'
import ComboBoxInput from '../form/ui/ComboBoxInput'
import CommentThread from '../common/CommentThread'
import { useEscapeClose } from '../../hooks/useEscapeClose'
import { usePmsDocs } from '../../hooks/usePmsDocs'
import { useAuth } from '../../context/AuthContext'

// A lightweight, integration-scoped alternative to sending someone all the way to the full
// Implementation Setup wizard just to fix a PMS detail or paste in server access. Reads and
// writes the exact same pms/serverAccess/additionalNotes fields the wizard's own "Links & PMS"
// step does (same PATCH /submissions/:id endpoint), so whichever one someone uses, the other
// always shows the current value; there's no separate copy of this data anywhere.
//
// Also the one and only modal the integration board's View button opens (`readOnly`), so anyone
// without edit rights sees these same three fields, never the full intake-wizard detail view,
// which would defeat the point of keeping server access off the card and out of unrelated eyes.
export default function IntegrationEditModal({ submission, busy, readOnly = false, onClose, onSave, onCommentPosted }) {
  const { user } = useAuth()
  const [pms, setPms] = useState('')
  const [serverAccess, setServerAccess] = useState('')
  const { names: pmsOptions, findDoc } = usePmsDocs()
  // An admin can register a PMS by name alone, before its guide doc is written, only show the
  // info box once there's an actual link to send someone to.
  const foundDoc = findDoc(pms)
  const pmsDoc = foundDoc?.url ? foundDoc : null

  // Once an integration ticket exists, only the original submitter may still change the PMS ,
  // not even admin (see stripLockedPmsEdit in submissionController.js). Integration work may
  // already be underway against the current value; changing it later should be a deliberate
  // correction by whoever submitted the request, not something anyone else does in passing.
  const isOwner = submission && user && String(submission.owner) === String(user.id)
  const pmsLocked = Boolean(submission?.integrationTicketCreatedAt) && !isOwner

  useEffect(() => {
    if (!submission) return
    setPms(submission.pms || '')
    setServerAccess(submission.serverAccess || '')
  }, [submission])

  useEscapeClose(Boolean(submission) && !busy, onClose)

  if (!submission) return null

  const label = `${submission.clientName || 'Untitled'} (${submission.locationName || 'Untitled location'})`

  return (
    <div className="confirm-dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="confirm-dialog integration-edit-modal" role="dialog" aria-modal="true">
        <h3 className="confirm-dialog-title">{readOnly ? 'Integration Details' : 'Edit Integration Details'}</h3>
        <p className="confirm-dialog-message">{label}</p>

        <div className="integration-edit-modal-body">
          <div className="field">
            <label>PMS System</label>
            <ComboBoxInput
              value={pms}
              onChange={setPms}
              options={pmsOptions}
              placeholder="e.g. CareStack"
              disabled={busy || readOnly || pmsLocked}
            />
            {pmsLocked && (
              <div className="hint">
                <i className="ti ti-lock"></i> Only the person who submitted this request can change the PMS once
                integration work has started.
              </div>
            )}
          </div>
          {pmsDoc && (
            <div className="info-box">
              <i className="ti ti-file-text"></i>
              <span>
                Check the <strong>{pmsDoc.name}</strong> integration guide for what's needed from this practice.{' '}
                <a href={pmsDoc.url} target="_blank" rel="noopener noreferrer">
                  View guide <i className="ti ti-external-link"></i>
                </a>
              </span>
            </div>
          )}
          <div className="field">
            <label>Integration Notes</label>
            <textarea
              value={serverAccess}
              disabled={busy || readOnly}
              placeholder="Any non-sensitive notes for the PMS integration. Do not enter passwords or credentials here…"
              onChange={(e) => setServerAccess(e.target.value)}
            />
            <div className="hint">
              Keep this to non-sensitive info, credentials shouldn't be entered here
              {pmsDoc ? ', the guide above explains how those should be shared.' : '.'}
            </div>
          </div>
          {submission && <CommentThread submission={submission} onPosted={onCommentPosted} />}
        </div>

        <div className="confirm-dialog-actions">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button type="button" className="btn btn-primary" onClick={() => onSave({ pms, serverAccess })} disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
