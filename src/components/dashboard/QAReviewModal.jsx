import { useEffect, useRef, useState } from 'react'
import SubmissionDetailSections from './SubmissionDetailSections'
import MessageComposeModal from '../common/MessageComposeModal'
import ConfirmDialog from '../common/ConfirmDialog'
import CommentThread from '../common/CommentThread'
import ForwardingNumbersField from '../common/ForwardingNumbersField'
import { QA_CHECKLIST_ITEMS } from '../../data/options'
import { useEscapeClose } from '../../hooks/useEscapeClose'
import { useQaChecklistDraft } from '../../hooks/useQaChecklistDraft'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Merges this account's saved checklist against the current shared template, any item added to
// the template since this account was last reviewed shows up here too (blank, ready to review).
// Anything the account already has that's since fallen off the template (removed/renamed) is
// dropped rather than kept, the checklist always mirrors the current template exactly.
function buildChecklist(templateItems, existingChecklist) {
  const items = templateItems && templateItems.length ? templateItems : QA_CHECKLIST_ITEMS
  const existingByName = new Map((existingChecklist || []).map((row) => [row.item.toLowerCase(), row]))
  return items.map((item) => {
    const existing = existingByName.get(item.toLowerCase())
    return existing ? { ...existing } : { item, status: '', note: '' }
  })
}

// Mirrors chatService.js's checklistSummary on the backend, used to seed the editable default
// message shown before the QA result actually posts to Chat.
function checklistSummary(checklist) {
  const errors = checklist.filter((row) => row.status === 'error')
  const clarifications = checklist.filter((row) => row.status === 'clarification')
  if (errors.length === 0 && clarifications.length === 0) return 'No errors.'

  const section = (title, items) => `${title}:\n${items.map((i) => `- ${i.item}: ${i.note || 'No detail provided'}`).join('\n')}`
  const parts = []
  if (errors.length > 0) parts.push(section('Errors', errors))
  if (clarifications.length > 0) parts.push(section('Clarifications', clarifications))
  return parts.join('\n\n')
}

// The single place a QA reviewer works from: the account's full configuration (read-only,
// same sections as the plain detail view) plus the QA checklist, so completing an account
// never requires switching between a "view details" modal and a separate "checklist" modal.
export default function QAReviewModal({
  submission,
  taken,
  alreadyComplete,
  busy,
  templateItems,
  baseItems = [],
  onAddTemplateItem,
  onRemoveTemplateItem,
  onClose,
  onMarkComplete,
  onCommentPosted,
}) {
  const [checklist, setChecklist] = useState(() => buildChecklist(templateItems, submission?.qaChecklist))
  const [newItem, setNewItem] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [addItemError, setAddItemError] = useState('')
  const [composingResult, setComposingResult] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState(null)
  const [removingItem, setRemovingItem] = useState(false)
  const [removeItemError, setRemoveItemError] = useState('')
  // Set right when a completion is actually attempted (confirmSendResult), so the reset-on-close
  // effect below can tell "closed because the save succeeded" apart from "closed/cancelled without
  // ever trying to save" — only the former should clear the draft; the latter is exactly the case
  // this whole feature exists to protect.
  const attemptedSendRef = useRef(false)

  useEffect(() => {
    if (submission) setChecklist(buildChecklist(templateItems, submission.qaChecklist))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?._id])

  const { pendingDraft, restoreDraft, discardDraft, clearDraft } = useQaChecklistDraft({
    submissionId: submission?._id,
    checklist,
    savedChecklist: submission?.qaChecklist,
    enabled: Boolean(submission) && !alreadyComplete,
  })

  // This modal is always mounted (the parent renders it unconditionally and just relies on the
  // `if (!submission) return null` below), so without this its own interaction state, most
  // importantly the "QA Result" compose popup, would survive across opens. Left over from a
  // previous completion, it would resurface immediately the next time this opens for anything,
  // recheck included, instead of a clean view.
  useEffect(() => {
    if (submission) return
    if (attemptedSendRef.current) clearDraft()
    attemptedSendRef.current = false
    setComposingResult(false)
    setResultMessage('')
    setNewItem('')
    setAddItemError('')
    setPendingRemoveIndex(null)
    setRemovingItem(false)
    setRemoveItemError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission])

  // Disabled while either nested dialog (the compose-result popup, the remove-item confirm) is
  // open, those have their own Escape handling now, and without this gate a single Escape press
  // would close both the nested dialog and this whole modal at once.
  useEscapeClose(Boolean(submission) && !composingResult && pendingRemoveIndex === null && !busy, onClose)

  if (!submission) return null

  const setStatus = (index, status) => {
    setChecklist((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const nextStatus = row.status === status ? '' : status
        const nextNote = nextStatus === 'error' || nextStatus === 'clarification' ? row.note : ''
        return { ...row, status: nextStatus, note: nextNote }
      }),
    )
  }

  const setNote = (index, note) => setChecklist((prev) => prev.map((row, i) => (i === index ? { ...row, note } : row)))

  // Previously this only removed the row from this one review's in-progress checklist state, the
  // item was still sitting in the agent's personal template underneath, so it silently came back
  // on the very next review. Now it's a real delete: this button only ever shows for a personal
  // item (never a base one, guarded below the checklist map), so removing it here always means
  // "I don't want this on my checklist at all anymore," not just "not for this account."
  const confirmRemoveItem = async () => {
    const item = checklist[pendingRemoveIndex]
    if (!item) {
      setPendingRemoveIndex(null)
      return
    }
    setRemovingItem(true)
    setRemoveItemError('')
    try {
      await onRemoveTemplateItem(item.item)
      setChecklist((prev) => prev.filter((_, i) => i !== pendingRemoveIndex))
      setPendingRemoveIndex(null)
    } catch (err) {
      setRemoveItemError(err.message || 'Failed to remove item')
    } finally {
      setRemovingItem(false)
    }
  }

  const addItem = async () => {
    const name = newItem.trim()
    if (!name) return
    if (checklist.some((row) => row.item.toLowerCase() === name.toLowerCase())) {
      setAddItemError('That item is already on the checklist.')
      return
    }
    setAddingItem(true)
    setAddItemError('')
    try {
      await onAddTemplateItem(name)
      setChecklist((prev) => [...prev, { item: name, status: '', note: '' }])
      setNewItem('')
    } catch (err) {
      setAddItemError(err.message || 'Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  const reviewedCount = checklist.filter((row) => row.status).length
  const allReviewed = reviewedCount === checklist.length
  const missingNotes = checklist.some((row) => (row.status === 'error' || row.status === 'clarification') && !row.note.trim())
  const locked = alreadyComplete || busy

  const label = `${submission.clientName || 'Untitled'} (${submission.locationName || 'Untitled location'})`

  const startComposeResult = () => {
    setResultMessage(`<users/all> QA review for *${label}* complete.\n\n${checklistSummary(checklist)}`)
    setComposingResult(true)
  }

  const confirmSendResult = () => {
    attemptedSendRef.current = true
    onMarkComplete(checklist, resultMessage)
  }

  const handleRestoreDraft = () => {
    const draft = restoreDraft()
    if (draft) setChecklist(draft.checklist)
  }

  return (
    <div className="confirm-dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="confirm-dialog detail-modal" role="dialog" aria-modal="true">
        <div className="detail-modal-header">
          <div>
            <h3 className="confirm-dialog-title">{submission.clientName || 'Untitled'}</h3>
            <p className="detail-modal-sub">
              {submission.locationName || 'Untitled location'} · Submitted {formatDate(submission.createdAt)}
            </p>
          </div>
          <button type="button" className="btn-sm" onClick={onClose} disabled={busy}>
            <i className="ti ti-x"></i> Close
          </button>
        </div>

        <div className="detail-modal-body">
          {pendingDraft && (
            <div className="info-box">
              <i className="ti ti-info-circle"></i>
              <span>
                You have unsaved QA progress{pendingDraft.savedAt ? ` from ${new Date(pendingDraft.savedAt).toLocaleString()}` : ''}. Restore
                it, or discard it and start from what's saved?
              </span>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
                <button type="button" className="btn-sm" onClick={handleRestoreDraft}>
                  Restore
                </button>
                <button type="button" className="btn-sm" onClick={discardDraft}>
                  Discard
                </button>
              </div>
            </div>
          )}
          <SubmissionDetailSections submission={submission} />

          <ForwardingNumbersField submission={submission} onChanged={onCommentPosted} />

          <div className="review-section">
            <div className="review-section-header">
              <h3>QA Checklist</h3>
              <span className="hint" style={{ margin: 0 }}>
                {reviewedCount} of {checklist.length} reviewed
              </span>
            </div>
            {checklist.map((row, i) => {
              // A base item is the same checklist for every agent, so it can't be removed,
              // only an item a specific agent added themselves (not part of baseItems) can be.
              const isBaseItem = baseItems.some((b) => b.toLowerCase() === row.item.toLowerCase())
              return (
              <div className="qa-checklist-row" key={row.item}>
                <div className="qa-checklist-item-name">{row.item}</div>
                <div className="qa-checklist-choices">
                  <button
                    type="button"
                    className={`qa-checklist-choice ok${row.status === 'ok' ? ' active' : ''}`}
                    title="No error"
                    aria-label="No error"
                    disabled={locked}
                    onClick={() => setStatus(i, 'ok')}
                  >
                    <i className="ti ti-check"></i>
                  </button>
                  <button
                    type="button"
                    className={`qa-checklist-choice clarification${row.status === 'clarification' ? ' active' : ''}`}
                    title="Clarification needed"
                    aria-label="Clarification needed"
                    disabled={locked}
                    onClick={() => setStatus(i, 'clarification')}
                  >
                    <i className="ti ti-help-circle"></i>
                  </button>
                  <button
                    type="button"
                    className={`qa-checklist-choice error${row.status === 'error' ? ' active' : ''}`}
                    title="Error"
                    aria-label="Error"
                    disabled={locked}
                    onClick={() => setStatus(i, 'error')}
                  >
                    <i className="ti ti-x"></i>
                  </button>
                  <button
                    type="button"
                    className={`qa-checklist-choice na${row.status === 'na' ? ' active' : ''}`}
                    title="Not applicable"
                    aria-label="Not applicable"
                    disabled={locked}
                    onClick={() => setStatus(i, 'na')}
                  >
                    <i className="ti ti-minus"></i>
                  </button>
                  {!isBaseItem && (
                    <button
                      type="button"
                      className="btn-sm danger"
                      title="Remove this item from the checklist"
                      aria-label="Remove this item from the checklist"
                      disabled={locked}
                      onClick={() => setPendingRemoveIndex(i)}
                    >
                      <i className="ti ti-trash"></i>
                    </button>
                  )}
                </div>
                {(row.status === 'error' || row.status === 'clarification') && (
                  <textarea
                    className="qa-checklist-note"
                    value={row.note}
                    disabled={locked}
                    placeholder={row.status === 'error' ? 'What exactly is wrong?' : 'What needs clarifying?'}
                    onChange={(e) => setNote(i, e.target.value)}
                  />
                )}
              </div>
              )
            })}

            <div className="qa-checklist-add-row">
              <input
                type="text"
                className="inline-edit-input"
                placeholder="Add a checklist item for this and future reviews…"
                value={newItem}
                disabled={locked || addingItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
              />
              <button type="button" className="btn-sm" disabled={locked || addingItem || !newItem.trim()} onClick={addItem}>
                <i className="ti ti-plus"></i> {addingItem ? 'Adding…' : 'Add Item'}
              </button>
            </div>
            {addItemError && <div className="hint">{addItemError}</div>}
          </div>

          <CommentThread submission={submission} onPosted={onCommentPosted} />
        </div>

        <div style={{ marginTop: 12, flexShrink: 0 }}>
          {alreadyComplete ? (
            <div className="info-box">
              <i className="ti ti-circle-check"></i>
              This account has already been marked Completed.
            </div>
          ) : !taken ? (
            <div className="hint">Take over this review from the queue before marking it complete.</div>
          ) : (
            <>
              {!allReviewed && (
                <div className="hint">{checklist.length - reviewedCount} checklist item{checklist.length - reviewedCount === 1 ? '' : 's'} not yet marked.</div>
              )}
              {missingNotes && <div className="hint">Some error/clarification items are missing a note.</div>}
            </>
          )}
          <div className="confirm-dialog-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Close
            </button>
            {!alreadyComplete && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !taken}
                onClick={startComposeResult}
              >
                {busy ? 'Completing…' : 'Mark Complete'}
              </button>
            )}
          </div>
        </div>
      </div>

      <MessageComposeModal
        open={composingResult}
        title="QA Result"
        subtitle={`${label} · posted to the QA/specialist Chat space`}
        message={resultMessage}
        onMessageChange={setResultMessage}
        busy={busy}
        confirmLabel="Send & Complete"
        onConfirm={confirmSendResult}
        onCancel={() => setComposingResult(false)}
      />

      <ConfirmDialog
        open={pendingRemoveIndex !== null}
        title="Remove item?"
        message={
          <>
            {`This permanently removes "${checklist[pendingRemoveIndex]?.item}" from your personal checklist. It won't show up on any future review either, not just this one.`}
            {removeItemError && (
              <>
                <br />
                <br />
                {removeItemError}
              </>
            )}
          </>
        }
        confirmLabel="Remove"
        danger
        busy={removingItem}
        onConfirm={confirmRemoveItem}
        onCancel={() => setPendingRemoveIndex(null)}
      />
    </div>
  )
}
