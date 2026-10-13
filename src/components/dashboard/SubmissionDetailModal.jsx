import { useNavigate } from 'react-router-dom'
import SubmissionDetailSections from './SubmissionDetailSections'
import ForwardingNumbersField from '../common/ForwardingNumbersField'
import { useEscapeClose } from '../../hooks/useEscapeClose'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function SubmissionDetailModal({ submission, onClose, onCommentPosted }) {
  useEscapeClose(Boolean(submission), onClose)
  const navigate = useNavigate()

  if (!submission) return null

  // Closes the modal on the way out — otherwise it'd stay mounted underneath the Activity Log
  // page after navigating away, which is confusing (and would re-trap Escape/overlay clicks).
  function viewFullHistory() {
    onClose()
    navigate(`/activity?targetType=Submission&targetId=${submission._id}`)
  }

  return (
    <div className="confirm-dialog-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="confirm-dialog detail-modal" role="dialog" aria-modal="true">
        <div className="detail-modal-header">
          <div>
            <h3 className="confirm-dialog-title">{submission.clientName || 'Untitled'}</h3>
            <p className="detail-modal-sub">
              {submission.locationName || 'Untitled location'} · Submitted {formatDate(submission.createdAt)}
            </p>
          </div>
          <button type="button" className="btn-sm" onClick={viewFullHistory}>
            <i className="ti ti-history"></i> View full history
          </button>
          <button type="button" className="btn-sm" onClick={onClose}>
            <i className="ti ti-x"></i> Close
          </button>
        </div>

        <div className="detail-modal-body">
          <SubmissionDetailSections submission={submission} onCommentPosted={onCommentPosted} />
          <ForwardingNumbersField submission={submission} onChanged={onCommentPosted} />
        </div>
      </div>
    </div>
  )
}
