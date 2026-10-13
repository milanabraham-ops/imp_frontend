import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useToast } from '../../context/ToastContext'
import { isMine } from '../../lib/isMine'
import { useDropdown } from '../../hooks/useDropdown'
import { useDropdownKeyboardNav } from '../../hooks/useDropdownKeyboardNav'
import ConfirmDialog from './ConfirmDialog'

function formatTimestamp(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Finds the "@partial-name" token (if any) immediately behind the cursor — used to drive the
// mention-autocomplete dropdown while typing in the composer/edit textarea. Only matches a token
// that starts right after whitespace or the start of the text, so an email-like "foo@bar" mid-word
// never triggers it.
function detectMentionQuery(value, cursor) {
  const upto = value.slice(0, cursor)
  const match = upto.match(/(?:^|\s)@([^\s@]*)$/)
  if (!match) return null
  return { query: match[1], start: upto.length - match[1].length - 1 }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Cosmetic-only split of "@Name" mentions out of a comment's plain-text body so they can be
// bolded in the rendered list — the stored text itself is always plain "@Name", no markup.
function renderCommentText(text, staffNames) {
  if (!staffNames.length || !text.includes('@')) return text
  const pattern = new RegExp(`@(?:${staffNames.map(escapeRegExp).join('|')})\\b`, 'g')
  const parts = []
  let lastIndex = 0
  let match
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(
      <span key={match.index} style={{ fontWeight: 600 }}>
        {match[0]}
      </span>,
    )
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

// A Sheets-comment-style discussion thread on one submission — shared by every view that shows
// it (specialist/QA detail views, the POC's own submission view), so there's exactly one place
// that knows how to post/render/edit/delete a comment rather than several separate copies.
//
// `section` scopes the thread to one review section (see SubmissionDetailSections) instead of the
// whole submission — only that section's comments are shown, and new ones are tagged with it.
// Left undefined/null, this is the general thread: every comment with no section at all.
export default function CommentThread({ submission, section = null, heading = 'Comments', focusKey, onPosted }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [text, setText] = useState('')
  const [posting, setPosting] = useState(false)
  const [agents, setAgents] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [mention, setMention] = useState(null) // { query, start }, null when no "@token" is active
  const comments = (submission?.comments || []).filter((c) => (c.section || null) === section)

  // Same GET /agents the reassign dropdowns use — now readable by a POC too (see agentRoutes.js),
  // since this composer is also used on a POC's own submission view.
  useEffect(() => {
    let cancelled = false
    apiFetch(`${API_URL}/agents`)
      .then((res) => (res.ok ? res.json() : []))
      .then((body) => {
        if (!cancelled && Array.isArray(body)) setAgents(body)
      })
      .catch(() => {
        // No mention list is a soft failure — the composer still works, just without autocomplete.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const staffNames = agents.map((a) => a.name)

  // Reused for both the composer and an in-progress edit — see useDropdown.js for the
  // portal/positioning/click-away mechanics this shares with SelectInput/ComboBoxInput.
  const { open: mentionOpen, setOpen: setMentionOpen, anchorRef, menuRef, style } = useDropdown()

  // Lets a caller (the section's right-click "Add comment" menu) drop focus straight into the
  // composer the moment this thread is opened, rather than making the user find and click it
  // themselves — bump focusKey any time that should happen again.
  useEffect(() => {
    if (focusKey) anchorRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey])

  const filteredAgents = mention
    ? agents.filter((a) => a.name.toLowerCase().includes(mention.query.toLowerCase())).slice(0, 8)
    : []

  const { highlightedIndex, onKeyDown: mentionKeyDown } = useDropdownKeyboardNav({
    open: mentionOpen,
    setOpen: setMentionOpen,
    optionCount: filteredAgents.length,
    onSelect: (index) => selectMention(filteredAgents[index]),
  })

  function selectMention(agent) {
    if (!agent || !mention) return
    const el = anchorRef.current
    const cursor = el ? el.selectionStart : text.length
    const before = text.slice(0, mention.start)
    const after = text.slice(cursor)
    const inserted = `@${agent.name} `
    const next = `${before}${inserted}${after}`
    setText(next)
    setMention(null)
    setMentionOpen(false)
    requestAnimationFrame(() => {
      if (!el) return
      const pos = before.length + inserted.length
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  function handleComposerChange(e) {
    const value = e.target.value
    setText(value)
    const detected = detectMentionQuery(value, e.target.selectionStart)
    setMention(detected)
    setMentionOpen(Boolean(detected))
  }

  function handleComposerKeyDown(e) {
    if (mentionOpen && filteredAgents.length > 0 && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Home', 'End'].includes(e.key)) {
      if (e.key === 'Enter') {
        e.preventDefault()
        selectMention(filteredAgents[highlightedIndex >= 0 ? highlightedIndex : 0])
        return
      }
      mentionKeyDown(e)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      post()
    }
  }

  const post = async () => {
    const trimmed = text.trim()
    if (!trimmed || posting) return
    setPosting(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${submission._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, section }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to post comment')
      setText('')
      setMention(null)
      setMentionOpen(false)
      onPosted?.(body)
    } catch (err) {
      showToast(err.message || 'Failed to post comment', 'error')
    } finally {
      setPosting(false)
    }
  }

  function startEdit(comment) {
    setEditingId(comment._id)
    setEditText(comment.text)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  async function saveEdit(commentId) {
    const trimmed = editText.trim()
    if (!trimmed || editSaving) return
    setEditSaving(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${submission._id}/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to save comment')
      cancelEdit()
      onPosted?.(body)
    } catch (err) {
      showToast(err.message || 'Failed to save comment', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId || deleting) return
    setDeleting(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${submission._id}/comments/${pendingDeleteId}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to delete comment')
      setPendingDeleteId(null)
      onPosted?.(body)
    } catch (err) {
      showToast(err.message || 'Failed to delete comment', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const mentionMenu = mentionOpen && filteredAgents.length > 0 && (
    <div className="combobox-menu" ref={menuRef} style={style} role="listbox">
      {filteredAgents.map((a, index) => (
        <button
          type="button"
          key={a.id}
          role="option"
          aria-selected={index === highlightedIndex}
          className={`combobox-option${index === highlightedIndex ? ' highlighted' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => selectMention(a)}
        >
          {a.name} <span className="hint">({a.role})</span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="review-section comment-thread">
      <div className="review-section-header">
        <h3>{heading}</h3>
        <span className="hint" style={{ margin: 0 }}>
          {comments.length} comment{comments.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="comment-list">
        {comments.length === 0 ? (
          <div className="hint">No comments yet. Ask a question or leave a note below.</div>
        ) : (
          comments.map((c) => {
            const mine = isMine(c.authorName, user?.name)
            const canDelete = mine || user?.role === 'admin'
            const isEditing = editingId === c._id
            return (
              <div className="comment-row" key={c._id}>
                <div className="comment-meta">
                  <span className="comment-author">{c.authorName}</span>
                  {mine && <span className="you-badge">you</span>}
                  <span className="comment-time">{formatTimestamp(c.createdAt)}</span>
                  {c.editedAt && <span className="hint">(edited)</span>}
                  {!isEditing && (mine || canDelete) && (
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      {mine && (
                        <button type="button" className="icon-btn" title="Edit comment" aria-label="Edit comment" onClick={() => startEdit(c)}>
                          <i className="ti ti-pencil"></i>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Delete comment"
                          aria-label="Delete comment"
                          onClick={() => setPendingDeleteId(c._id)}
                        >
                          <i className="ti ti-trash"></i>
                        </button>
                      )}
                    </span>
                  )}
                </div>
                {isEditing ? (
                  <div>
                    <textarea
                      className="inline-edit-input comment-input"
                      value={editText}
                      disabled={editSaving}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          saveEdit(c._id)
                        } else if (e.key === 'Escape') {
                          e.preventDefault()
                          cancelEdit()
                        }
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <button type="button" className="btn-sm" disabled={editSaving || !editText.trim()} onClick={() => saveEdit(c._id)}>
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="btn-sm" disabled={editSaving} onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="comment-text">{renderCommentText(c.text, staffNames)}</div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="comment-add-row">
        <div style={{ position: 'relative', flex: 1 }}>
          <textarea
            ref={anchorRef}
            className="inline-edit-input comment-input"
            placeholder="Ask a question or leave a note… (type @ to mention someone)"
            value={text}
            disabled={posting}
            onChange={handleComposerChange}
            onKeyDown={handleComposerKeyDown}
          />
          {mentionMenu && createPortal(mentionMenu, anchorRef.current?.closest('.voicestack-form') || document.body)}
        </div>
        <button type="button" className="btn-sm" disabled={posting || !text.trim()} onClick={post}>
          <i className="ti ti-send"></i> {posting ? 'Posting…' : 'Post'}
        </button>
      </div>

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete comment?"
        message="This permanently removes this comment from the thread."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />
    </div>
  )
}
