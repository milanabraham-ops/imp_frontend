import { useEffect, useState } from 'react'
import { API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useToast } from '../../context/ToastContext'
import { useNotifications } from '../../context/NotificationContext'
import { isMine } from '../../lib/isMine'
import { normalize, isInQaDomain, canDrag as canDragCard } from './pipelineHelpers'

// Every mutation a pipeline card can trigger — take-over/reassign, status/onboarding changes,
// the QA handoff/completion/handover modals, and the drag-drop rules that decide what a card
// dropped into a given column actually does. Shared by Pipeline, Accounts, and the group
// drill-in so the same location behaves identically no matter which page it's viewed from.
//
// The caller owns fetching `submissions` (each page scopes that differently — Pipeline needs
// every location, Accounts collapses groups, the group drill-in is one group's own locations via
// GET /groups/:id) and just hands this hook the array + its setter.
export function usePipelineActions({ submissions, setSubmissions, user, canActAsSpecialist, canActAsQa }) {
  const { showToast } = useToast()
  const { markSeen } = useNotifications()

  const [savingId, setSavingId] = useState(null)
  const [viewing, setViewing] = useState(null)

  const [handoffTarget, setHandoffTarget] = useState(null)
  const [handoffMessage, setHandoffMessage] = useState('')
  const [sendingHandoff, setSendingHandoff] = useState(false)

  const [reviewTarget, setReviewTarget] = useState(null)
  const [templateItems, setTemplateItems] = useState([])
  const [baseItems, setBaseItems] = useState([])
  const [completing, setCompleting] = useState(false)
  const [selfReviewTarget, setSelfReviewTarget] = useState(null)

  const [handoverTarget, setHandoverTarget] = useState(null)
  const [handoverMessage, setHandoverMessage] = useState('')
  const [sendingHandover, setSendingHandover] = useState(false)

  const loadTemplateItems = () => {
    apiFetch(`${API_URL}/qa-checklist-items`)
      .then((res) => (res.ok ? res.json() : { items: [], baseItems: [] }))
      .then((body) => {
        setTemplateItems(Array.isArray(body.items) ? body.items : [])
        setBaseItems(Array.isArray(body.baseItems) ? body.baseItems : [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadTemplateItems()
  }, [])

  // Keeps the review modal in sync with the background refresh poll.
  useEffect(() => {
    if (!reviewTarget) return
    const fresh = submissions.find((s) => s._id === reviewTarget._id)
    if (fresh && fresh !== reviewTarget) setReviewTarget(fresh)
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

  const saveField = (submission, field, value) => saveFields(submission, { [field]: value })

  // Manual recovery for a persisted syncIssues badge (see models/Submission.js on the backend) —
  // re-runs the Sheet sync server-side and reflects whatever the server now reports (cleared on
  // success, the same failure again if it's still down) rather than optimistically assuming it
  // worked.
  const retrySync = async (submission) => {
    setSavingId(submission._id)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${submission._id}/retry-sync`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Sync still failing')
      setSubmissions((prev) => prev.map((s) => (s._id === submission._id ? body : s)))
      showToast('Sheet sync succeeded.')
    } catch (err) {
      showToast(err.message || 'Sync still failing', 'error')
    } finally {
      setSavingId(null)
    }
  }

  const takeOverSpecialist = (submission) => {
    markSeen('newRequest', submission._id)
    return saveFields(submission, { implementationSpecialist: user.name, configurationStatus: 'Not Started' })
  }

  const takeOverQa = (submission) => {
    markSeen('qaHandoff', submission._id)
    return saveFields(submission, { qaAgent: user.name })
  }

  const openReview = (s) => {
    loadTemplateItems()
    setReviewTarget(s)
    markSeen('qaHandoff', s._id)
  }

  const recheck = (s) => {
    const reopened = { ...s, configurationStatus: 'QA' }
    openReview(reopened)
    saveFields(s, { configurationStatus: 'QA', isRecheck: true }, 'Reopened for recheck.')
  }

  const confirmHandoff = async () => {
    if (!handoffTarget) return
    setSendingHandoff(true)
    const wasOnHold = normalize(handoffTarget.configurationStatus) === 'ON HOLD'
    const updates = { configurationStatus: 'QA', qaHandoffMessage: handoffMessage }
    if (wasOnHold) updates.statusBeforeHold = ''
    const ok = await saveFields(handoffTarget, updates)
    setSendingHandoff(false)
    if (ok) setHandoffTarget(null)
  }

  const finalizeComplete = async (submission, checklist, message) => {
    setCompleting(true)
    const ok = await saveFields(submission, { configurationStatus: 'Completed', qaChecklist: checklist, qaResultMessage: message }, 'QA result sent.')
    setCompleting(false)
    if (ok) setReviewTarget(null)
  }

  const requestMarkComplete = (checklist, message) => {
    if (!reviewTarget) return
    if (isMine(reviewTarget.implementationSpecialist, user?.name)) {
      setSelfReviewTarget({ submission: reviewTarget, checklist, message })
      return
    }
    finalizeComplete(reviewTarget, checklist, message)
  }

  const confirmSelfReview = () => {
    const target = selfReviewTarget
    setSelfReviewTarget(null)
    if (target) finalizeComplete(target.submission, target.checklist, target.message)
  }

  const startHandover = (s) => {
    setHandoverTarget(s)
    const numbers = (s.forwardingNumbers || '')
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean)
    const numbersBlock = numbers.length ? `\n\nForwarding numbers:\n${numbers.map((n) => `- ${n}`).join('\n')}` : ''
    // Tags the actual POC who submitted this if their Chat ID is on file (see AdminUsers.jsx >
    // Manage Access); otherwise falls back to pinging the whole POC space, same as before.
    const mention = s.pocChatUserId ? `<users/${s.pocChatUserId}>` : '<users/all>'
    setHandoverMessage(
      `${mention} Hi Team, the implementation for *${s.clientName || 'Untitled'} (${s.locationName || 'Untitled location'})* is complete. Please reach out in case of any questions.${numbersBlock}`,
    )
  }

  const confirmHandover = async () => {
    if (!handoverTarget) return
    setSendingHandover(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions/${handoverTarget._id}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: handoverMessage }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to send handover')
      setSubmissions((prev) => prev.map((s) => (s._id === handoverTarget._id ? { ...s, pocHandoverAt: body.pocHandoverAt } : s)))
      showToast('Handed over to POC.')
      setHandoverTarget(null)
    } catch (err) {
      showToast(err.message || 'Failed to send handover', 'error')
    } finally {
      setSendingHandover(false)
    }
  }

  const addChecklistTemplateItem = async (name) => {
    const res = await apiFetch(`${API_URL}/qa-checklist-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: name }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Failed to add checklist item')
    setTemplateItems(Array.isArray(body.items) ? body.items : [])
    setBaseItems(Array.isArray(body.baseItems) ? body.baseItems : [])
  }

  // Permanently drops a personal item from this agent's own template — not just this one review
  // (that's what removing a row from the in-progress checklist state already did; without this,
  // the item silently came back on the next review since it was only ever hidden locally, never
  // actually deleted from the shared personalItems it was seeded from).
  const removeChecklistTemplateItem = async (name) => {
    const res = await apiFetch(`${API_URL}/qa-checklist-items`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: name }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Failed to remove checklist item')
    setTemplateItems(Array.isArray(body.items) ? body.items : [])
    setBaseItems(Array.isArray(body.baseItems) ? body.baseItems : [])
  }

  const onCommentPosted = (updated) => {
    setViewing((v) => (v && v._id === updated._id ? updated : v))
    setReviewTarget((v) => (v && v._id === updated._id ? updated : v))
    setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))
  }

  // The actual drop logic — one rule per column, mirroring exactly what the dropdowns in the old
  // Configuration Requests / QA Requests pages used to do. Simple moves commit immediately;
  // handing off to QA (from a fresh In Progress/Not Started card) and marking Completed still go
  // through their existing modals, since those need a message/checklist the drop itself can't supply.
  const handleDrop = (card, columnKey) => {
    if (!canDragCard(card, isMine, user?.name, user?.role)) return
    const status = normalize(card.configurationStatus)
    const wasOnHold = status === 'ON HOLD'
    const resumingOwnQaHold = wasOnHold && normalize(card.statusBeforeHold) === 'QA'

    if (columnKey === 'NOT_STARTED') {
      if (!canActAsSpecialist || isInQaDomain(card)) return
      if (status === 'NOT STARTED' || !status) return
      const updates = { configurationStatus: 'Not Started' }
      if (wasOnHold) updates.statusBeforeHold = ''
      saveFields(card, updates)
    } else if (columnKey === 'IN_PROGRESS') {
      if (!canActAsSpecialist || isInQaDomain(card)) return
      if (status === 'IN PROGRESS') return
      const updates = { configurationStatus: 'In Progress' }
      if (wasOnHold) updates.statusBeforeHold = ''
      saveFields(card, updates)
    } else if (columnKey === 'ON_HOLD') {
      if (status === 'ON HOLD') return
      if (isInQaDomain(card) && !canActAsQa) return
      if (!isInQaDomain(card) && !canActAsSpecialist) return
      saveFields(card, { configurationStatus: 'On Hold', statusBeforeHold: card.configurationStatus })
    } else if (columnKey === 'QA') {
      if (status === 'QA') return
      if (status === 'COMPLETED') {
        if (!canActAsQa) return
        recheck(card)
      } else if (resumingOwnQaHold) {
        if (!canActAsQa) return
        saveFields(card, { configurationStatus: 'QA', statusBeforeHold: '' })
      } else {
        if (!canActAsSpecialist) return
        setHandoffTarget(card)
        setHandoffMessage(
          `<users/all> *${card.clientName || 'Untitled'} (${card.locationName || 'Untitled location'})* has been configured by *${user.name}* and is ready for QA review.`,
        )
      }
    } else if (columnKey === 'COMPLETED') {
      if (status === 'COMPLETED') return
      if (!canActAsQa) return
      if (status !== 'QA' && !resumingOwnQaHold) return
      openReview(card)
    }
  }

  return {
    savingId,
    viewing,
    setViewing,
    handoffTarget,
    handoffMessage,
    setHandoffMessage,
    sendingHandoff,
    confirmHandoff,
    cancelHandoff: () => setHandoffTarget(null),
    reviewTarget,
    setReviewTarget,
    templateItems,
    baseItems,
    completing,
    selfReviewTarget,
    confirmSelfReview,
    cancelSelfReview: () => setSelfReviewTarget(null),
    handoverTarget,
    handoverMessage,
    setHandoverMessage,
    sendingHandover,
    confirmHandover,
    cancelHandover: () => setHandoverTarget(null),
    saveField,
    saveFields,
    retrySync,
    takeOverSpecialist,
    takeOverQa,
    openReview,
    recheck,
    requestMarkComplete,
    startHandover,
    addChecklistTemplateItem,
    removeChecklistTemplateItem,
    onCommentPosted,
    handleDrop,
  }
}
