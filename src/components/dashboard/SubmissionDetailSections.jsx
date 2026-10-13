import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { REVIEW_SECTIONS, STATUS_SECTION } from '../form/reviewSections'
import ReviewFieldValue from '../form/ReviewFieldValue'
import CommentThread from '../common/CommentThread'

// Right-click "Add comment" menu, Sheets-style, a single-option menu positioned at the click
// point, closed by clicking away, scrolling, or Escape (not by re-clicking the same spot, since
// a real context menu doesn't require that either).
function SectionContextMenu({ x, y, onAddComment, onClose, anchorEl }) {
  useEffect(() => {
    const close = () => onClose()
    const onKeyDown = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('mousedown', close)
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return createPortal(
    <div className="section-context-menu" style={{ top: y, left: x }} onMouseDown={(e) => e.stopPropagation()}>
      <button type="button" onClick={onAddComment}>
        <i className="ti ti-message-circle-plus"></i> Add comment
      </button>
    </div>,
    anchorEl?.closest('.voicestack-form') || document.body,
  )
}

function Section({ section, submission, onCommentPosted }) {
  const sectionComments = (submission.comments || []).filter((c) => c.section === section.title)
  const hasComments = sectionComments.length > 0
  const [commentsOpen, setCommentsOpen] = useState(hasComments)
  const [contextMenu, setContextMenu] = useState(null)
  const [focusKey, setFocusKey] = useState(0)

  // A comment landing here from elsewhere (e.g. another tab) should surface the thread even if
  // this reviewer never explicitly opened it.
  useEffect(() => {
    if (hasComments) setCommentsOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionComments.length])

  // Right-clicking inside the comment thread itself (the composer, an existing comment's text)
  // should still give the normal browser context menu for copy/paste, not this one.
  function handleContextMenu(e) {
    if (e.target.closest('textarea, input, .comment-thread')) return
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, anchorEl: e.currentTarget })
  }

  function handleAddComment() {
    setContextMenu(null)
    setCommentsOpen(true)
    setFocusKey((k) => k + 1)
  }

  return (
    <div className={`review-section${hasComments ? ' has-comments' : ''}`} onContextMenu={handleContextMenu}>
      <div className="review-section-header">
        <h3>{section.title}</h3>
        {(hasComments || commentsOpen) && (
          <button type="button" className="btn-sm" onClick={() => setCommentsOpen((o) => !o)}>
            <i className={`ti ti-${commentsOpen ? 'chevron-up' : 'message-circle'}`}></i>{' '}
            {commentsOpen ? 'Collapse comments' : `Comments (${sectionComments.length})`}
          </button>
        )}
      </div>
      <div className="review-list">
        {section.fields.map((f) => {
          const value = f.get(submission)
          return (
            <div className="review-row" key={f.label}>
              <span className="review-label">{f.label}</span>
              <span className={`review-value${value ? '' : ' empty'}`}>
                <ReviewFieldValue value={value} />
              </span>
            </div>
          )
        })}
      </div>
      {commentsOpen && (
        <CommentThread
          submission={submission}
          section={section.title}
          heading={`Comments on ${section.title}`}
          focusKey={focusKey}
          onPosted={onCommentPosted}
        />
      )}
      {contextMenu && (
        <SectionContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          anchorEl={contextMenu.anchorEl}
          onAddComment={handleAddComment}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export default function SubmissionDetailSections({ submission, onCommentPosted }) {
  return (
    <>
      <Section section={STATUS_SECTION} submission={submission} onCommentPosted={onCommentPosted} />
      {REVIEW_SECTIONS.map((section) => (
        <Section key={section.title} section={section} submission={submission} onCommentPosted={onCommentPosted} />
      ))}
    </>
  )
}
