import { useEffect, useState } from 'react'
import { API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useToast } from '../../context/ToastContext'
import { useNotifications } from '../../context/NotificationContext'
import { isMine } from '../../lib/isMine'
import { normalize, INTEGRATION_COLUMNS } from './pipelineHelpers'

// Every mutation an integration ticket can trigger — take-over/reassign, the edit modal save, and
// the drag-drop rule for moving a card between stages. Shared by the Integrations overview and a
// group's integration drill-in (IntegrationGroupDetail) so a ticket behaves identically wherever
// it's shown, same split as Configuration's usePipelineActions.
export function useIntegrationActions({ submissions, setSubmissions, user, canAct }) {
  const { showToast } = useToast()
  const { markSeen } = useNotifications()

  const [savingId, setSavingId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editSaving, setEditSaving] = useState(false)

  const canDragIntegration = (card) => Boolean(card.integrationAgent) && isMine(card.integrationAgent, user?.name)

  // Keeps the edit/view modal in sync with the background refresh poll — same reason
  // usePipelineActions does this for reviewTarget, since a background update (someone else's
  // comment, or a PMS/server-access edit made elsewhere) shouldn't leave a stale copy on screen.
  useEffect(() => {
    if (!editing) return
    const fresh = submissions.find((s) => s._id === editing._id)
    if (fresh && fresh !== editing) setEditing(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissions])

  const saveFields = async (submission, updates, successMessage = 'Saved.') => {
    setSubmissions((prev) => prev.map((s) => (s._id === submission._id ? { ...s, ...updates } : s)))
    setSavingId(submission._id)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${submission._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to save change')
      showToast(successMessage)
      return true
    } catch (err) {
      const message = err.message || 'Failed to save change'
      showToast(message, 'error')
      const revert = Object.fromEntries(Object.keys(updates).map((k) => [k, submission[k]]))
      setSubmissions((prev) => prev.map((s) => (s._id === submission._id ? { ...s, ...revert } : s)))
      return false
    } finally {
      setSavingId(null)
    }
  }

  const takeOver = (submission) => {
    markSeen('newIntegration', submission._id)
    return saveFields(submission, { integrationAgent: user.name })
  }

  const reassign = (submission, value) => saveFields(submission, { integrationAgent: value })

  const saveEdit = async (updates) => {
    if (!editing) return
    setEditSaving(true)
    const ok = await saveFields(editing, updates, 'Integration details saved.')
    setEditSaving(false)
    if (ok) setEditing(null)
  }

  const onCommentPosted = (updated) => {
    setEditing((v) => (v && v._id === updated._id ? updated : v))
    setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))
  }

  const handleDrop = (card, columnKey) => {
    if (!canAct || !canDragIntegration(card)) return
    const col = INTEGRATION_COLUMNS.find((c) => c.key === columnKey)
    if (!col || normalize(card.integrationStatus) === normalize(col.status)) return
    saveFields(card, { integrationStatus: col.status })
  }

  return {
    savingId,
    editing,
    setEditing,
    editSaving,
    canDragIntegration,
    takeOver,
    reassign,
    saveEdit,
    onCommentPosted,
    handleDrop,
  }
}
