import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { useNotifications } from '../../context/NotificationContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import ConfirmDialog from '../common/ConfirmDialog'
import CustomScrollbar from '../common/CustomScrollbar'
import SubmissionDetailModal from './SubmissionDetailModal'
import QAReviewModal from './QAReviewModal'
import MessageComposeModal from '../common/MessageComposeModal'
import SubmissionCard from './SubmissionCard'
import GroupCard from './GroupCard'
import KanbanColumns from './KanbanColumns'
import { usePipelineActions } from './usePipelineActions'
import { formatDate, normalize, columnFor, columnForGroupStatus, canDrag } from './pipelineHelpers'
import { isMine } from '../../lib/isMine'
import '../form/form.css'
import './pipelineBoard.css'

// Accounts — an overview of every location you (or, for admin, anyone) submitted. Grouped
// locations show as one card for their group (never as individual cards here, or they'd be
// double-counted) with a drill-in into their own board. A POC can't change any tracking field on
// their own submission (the backend blocks it), so their cards are read-only; admin gets the same
// drag rights as on Pipeline since admin can edit everything.
export default function Dashboard() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const { unseenIds, markSeen } = useNotifications()
  const navigate = useNavigate()

  const [submissions, setSubmissions] = useState([])
  const [groups, setGroups] = useState([])
  const [agentNames, setAgentNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [draggingId, setDraggingId] = useState(null)

  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState(null)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const canActAsSpecialist = user?.role !== 'poc'
  const canActAsQa = ['qa', 'admin'].includes(user?.role)

  const load = useCallback(async (isBackgroundRefresh) => {
    if (!isBackgroundRefresh) setLoading(true)
    try {
      const [subsRes, groupsRes, agentsRes] = await Promise.all([
        apiFetch(`${API_URL}/submissions`),
        apiFetch(`${API_URL}/groups`),
        apiFetch(`${API_URL}/agents`),
      ])
      if (!subsRes.ok || !groupsRes.ok) throw new Error('Failed to load submissions')
      const subsBody = await subsRes.json()
      const groupsBody = await groupsRes.json()
      const agentsBody = agentsRes.ok ? await agentsRes.json() : []
      // Grouped locations are shown via their group's card instead — never as their own
      // top-level card, or they'd be double-counted here and in every stat tile.
      const allSubs = Array.isArray(subsBody) ? subsBody : subsBody.submissions || []
      setSubmissions(allSubs.filter((s) => !s.group))
      setGroups(Array.isArray(groupsBody) ? groupsBody : [])
      if (Array.isArray(agentsBody)) setAgentNames(agentsBody.map((a) => a.name))
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(false)
    const interval = setInterval(() => load(true), 5000)
    return () => clearInterval(interval)
  }, [load])

  const actions = usePipelineActions({ submissions, setSubmissions, user, canActAsSpecialist, canActAsQa })

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await apiFetch(`${API_URL}/submissions/${pendingDelete._id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete submission')
      setSubmissions((prev) => prev.filter((s) => s._id !== pendingDelete._id))
      showToast('Submission deleted.')
      setPendingDelete(null)
    } catch (err) {
      const message = err.message || 'Failed to delete submission'
      setDeleteError(message)
      showToast(message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const confirmDeleteGroup = async () => {
    if (!pendingDeleteGroup) return
    setDeletingGroup(true)
    setDeleteError('')
    try {
      const res = await apiFetch(`${API_URL}/groups/${pendingDeleteGroup._id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete group')
      setGroups((prev) => prev.filter((g) => g._id !== pendingDeleteGroup._id))
      showToast('Group deleted.')
      setPendingDeleteGroup(null)
    } catch (err) {
      const message = err.message || 'Failed to delete group'
      setDeleteError(message)
      showToast(message, 'error')
    } finally {
      setDeletingGroup(false)
    }
  }

  const rows = useMemo(
    () => [...submissions.map((s) => ({ kind: 'submission', ...s })), ...groups.map((g) => ({ kind: 'group', ...g }))],
    [submissions, groups],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.kind === 'group'
        ? [r.clientName, ...(r.markets || []), ...(r.pocs || []), ...(r.specialists || []), ...(r.qaAgents || [])].some((v) =>
            (v || '').toLowerCase().includes(q),
          )
        : [r.clientName, r.locationName, r.market, r.poc, r.implementationSpecialist, r.qaAgent].some((v) => (v || '').toLowerCase().includes(q)),
    )
  }, [rows, search])

  const totalLocations = useMemo(() => submissions.length + groups.reduce((sum, g) => sum + (g.locationCount || 0), 0), [submissions, groups])

  const uniqueAccounts = submissions.length + groups.length

  const thisMonthCount = useMemo(() => {
    const now = new Date()
    const standalone = submissions.filter((s) => {
      if (!s.createdAt) return false
      const d = new Date(s.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
    const grouped = groups.reduce((sum, g) => sum + (g.locationsThisMonth || 0), 0)
    return standalone + grouped
  }, [submissions, groups])

  const mostRecent = useMemo(() => {
    const dates = [...submissions.map((s) => s.createdAt), ...groups.map((g) => g.mostRecentLocationAt)].filter(Boolean)
    if (!dates.length) return null
    return dates.reduce((latest, d) => (new Date(d) > new Date(latest) ? d : latest))
  }, [submissions, groups])

  const onDragStart = (e, card) => {
    if (!canDrag(card, isMine, user?.name, user?.role)) {
      e.preventDefault()
      return
    }
    setDraggingId(card._id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', card._id)
  }

  const onDragEnd = () => setDraggingId(null)

  const onColumnDrop = (columnKey) => {
    const card = submissions.find((s) => s._id === draggingId)
    setDraggingId(null)
    if (card) actions.handleDrop(card, columnKey)
  }

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Accounts</h1>
              <p>Your submitted and in-progress location requests.</p>
            </div>
          </div>

          <div className="dash-stats-row">
            <div className="stat-tile">
              <div className="stat-value">{totalLocations}</div>
              <div className="stat-label">Total Locations</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{uniqueAccounts}</div>
              <div className="stat-label">Unique Accounts</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{thisMonthCount}</div>
              <div className="stat-label">Submitted This Month</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value">{mostRecent ? formatDate(mostRecent) : '—'}</div>
              <div className="stat-label">Most Recent Submission</div>
            </div>
          </div>

          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
              <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={() => load(false)}>
                <i className="ti ti-refresh"></i> Retry
              </button>
            </div>
          )}

          {deleteError && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {deleteError}
            </div>
          )}

          <div className="dash-table-toolbar" style={{ marginBottom: 12 }}>
            <div className="dash-search">
              <i className="ti ti-search"></i>
              <input type="text" placeholder="Search by client, location, market, POC…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="dash-count-label">
              {filtered.length} of {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
            </div>
          </div>

          {loading ? (
            <div className="dash-empty">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="dash-empty">
              <i className="ti ti-file-off" style={{ fontSize: 28 }}></i>
              <p>You haven&apos;t submitted any implementation requests yet.</p>
            </div>
          ) : (
            <KanbanColumns
              cards={filtered}
              columnFor={(r) => (r.kind === 'group' ? columnForGroupStatus(r.configurationStatus) : columnFor(r))}
              onDrop={onColumnDrop}
              renderCard={(card, col) =>
                card.kind === 'group' ? (
                  <GroupCard key={card._id} group={card} onDelete={() => setPendingDeleteGroup(card)} />
                ) : (
                  <SubmissionCard
                    key={card._id}
                    card={card}
                    columnKey={col.key}
                    tone={col.tone}
                    draggable={canDrag(card, isMine, user?.name, user?.role)}
                    dragging={draggingId === card._id}
                    onDragStart={(e) => onDragStart(e, card)}
                    onDragEnd={onDragEnd}
                    savingId={actions.savingId}
                    user={user}
                    agentNames={agentNames}
                    canActAsSpecialist={canActAsSpecialist}
                    canActAsQa={canActAsQa}
                    unseenIds={unseenIds}
                    onTakeOverSpecialist={() => actions.takeOverSpecialist(card)}
                    onTakeOverQa={() => actions.takeOverQa(card)}
                    onReassignSpecialist={(v) => actions.saveField(card, 'implementationSpecialist', v)}
                    onReassignQa={(v) => actions.saveField(card, 'qaAgent', v)}
                    onSetOnboarded={(v) => actions.saveField(card, 'accountOnboarded', v)}
                    onView={() => {
                      actions.setViewing(card)
                      markSeen('pocHandover', card._id)
                      markSeen('comment', card._id)
                      markSeen('pocEdit', card._id)
                    }}
                    onEdit={() => {
                      markSeen('pocHandover', card._id)
                      navigate(`/submissions/${card._id}`)
                    }}
                    onReview={() => actions.openReview(card)}
                    onRecheck={() => actions.recheck(card)}
                    onHandover={() => actions.startHandover(card)}
                    onRetrySync={() => actions.retrySync(card)}
                    onDelete={() => {
                      setDeleteError('')
                      setPendingDelete(card)
                    }}
                  />
                )
              }
            />
          )}
        </CustomScrollbar>
      </main>

      <SubmissionDetailModal submission={actions.viewing} onClose={() => actions.setViewing(null)} onCommentPosted={actions.onCommentPosted} />

      <QAReviewModal
        submission={actions.reviewTarget}
        taken={Boolean(actions.reviewTarget?.qaAgent)}
        alreadyComplete={actions.reviewTarget && normalize(actions.reviewTarget.configurationStatus) === 'COMPLETED'}
        busy={actions.completing}
        templateItems={actions.templateItems}
        baseItems={actions.baseItems}
        onAddTemplateItem={actions.addChecklistTemplateItem}
        onRemoveTemplateItem={actions.removeChecklistTemplateItem}
        onClose={() => actions.setReviewTarget(null)}
        onMarkComplete={actions.requestMarkComplete}
        onCommentPosted={actions.onCommentPosted}
      />

      <ConfirmDialog
        open={!!actions.selfReviewTarget}
        title="Reviewing Your Own Work"
        message={
          actions.selfReviewTarget &&
          `You also configured "${actions.selfReviewTarget.submission.clientName} - ${actions.selfReviewTarget.submission.locationName}" as the specialist. Only QA your own work if the rest of the team is unavailable. Continue?`
        }
        confirmLabel="Yes, Mark Complete"
        cancelLabel="Cancel"
        onConfirm={actions.confirmSelfReview}
        onCancel={actions.cancelSelfReview}
      />

      <MessageComposeModal
        open={!!actions.handoffTarget}
        title="Hand Off to QA"
        subtitle={`${actions.handoffTarget?.clientName || 'Untitled'} (${actions.handoffTarget?.locationName || 'Untitled location'}) · posted to the QA/specialist Chat space`}
        message={actions.handoffMessage}
        onMessageChange={actions.setHandoffMessage}
        busy={actions.sendingHandoff}
        confirmLabel="Send & Hand Off"
        onConfirm={actions.confirmHandoff}
        onCancel={actions.cancelHandoff}
      />

      <MessageComposeModal
        open={!!actions.handoverTarget}
        title="Handover to POC"
        subtitle={`${actions.handoverTarget?.clientName || 'Untitled'} (${actions.handoverTarget?.locationName || 'Untitled location'}) · posted to the POC Chat space`}
        message={actions.handoverMessage}
        onMessageChange={actions.setHandoverMessage}
        busy={actions.sendingHandover}
        confirmLabel="Send Handover"
        onConfirm={actions.confirmHandover}
        onCancel={actions.cancelHandover}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete submission?"
        message={pendingDelete && `This permanently deletes "${pendingDelete.clientName || 'Untitled'} (${pendingDelete.locationName || 'Untitled location'})" and everything filled in for it.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <ConfirmDialog
        open={!!pendingDeleteGroup}
        title="Delete group?"
        message={pendingDeleteGroup && `This permanently deletes "${pendingDeleteGroup.clientName || 'Untitled'}" and all ${pendingDeleteGroup.locationCount || 0} of its location${pendingDeleteGroup.locationCount === 1 ? '' : 's'} — this can't be undone.`}
        confirmLabel="Delete Group"
        danger
        busy={deletingGroup}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setPendingDeleteGroup(null)}
      />
    </div>
  )
}
