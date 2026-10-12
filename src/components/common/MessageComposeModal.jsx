import { useEscapeClose } from '../../hooks/useEscapeClose'

// Shared "here's a default message, edit it if you need to, then send" modal — used for every
// Chat notification touchpoint that's composed by whoever triggers it (specialist handoff notes,
// QA result/recheck-fixed messages, POC handover) rather than fired silently by the backend.
export default function MessageComposeModal({ open, title, subtitle, message, onMessageChange, busy, onCancel, onConfirm, confirmLabel = 'Send' }) {
  useEscapeClose(open && !busy, onCancel)

  if (!open) return null

  return (
    <div className="confirm-dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div className="confirm-dialog" role="dialog" aria-modal="true">
        <h3 className="confirm-dialog-title">{title}</h3>
        {subtitle && <p className="confirm-dialog-message">{subtitle}</p>}
        <div className="field">
          <textarea style={{ minHeight: 120 }} value={message} disabled={busy} onChange={(e) => onMessageChange(e.target.value)} />
        </div>
        <div className="confirm-dialog-actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={busy || !message.trim()}>
            {busy ? 'Sending…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
