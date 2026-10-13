import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import './form.css'
import '../dashboard/pipelineBoard.css'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { useNotifications } from '../../context/NotificationContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import ConfirmDialog from '../common/ConfirmDialog'
import SelectInput from '../common/SelectInput'
import SubmissionDetailModal from '../dashboard/SubmissionDetailModal'
import QAReviewModal from '../dashboard/QAReviewModal'
import MessageComposeModal from '../common/MessageComposeModal'
import SubmissionCard from '../dashboard/SubmissionCard'
import KanbanColumns from '../dashboard/KanbanColumns'
import { usePipelineActions } from '../dashboard/usePipelineActions'
import { normalize, columnFor, canDrag } from '../dashboard/pipelineHelpers'
import { isMine } from '../../lib/isMine'

// A single group's own board — same card/column design as Accounts and Pipeline, scoped to just
// this group's locations. A POC can't drag (the backend blocks every tracking-field edit from
// them); admin gets the same full drag rights as everywhere else.
export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const { unseenIds, markSeen } = useNotifications()
  const scrollRef = useRef(null)

  const [groupMeta, setGroupMeta] = useState(null)
  const [locations, setLocations] = useState([])
  const [agentNames, setAgentNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draggingId, setDraggingId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [cloneFrom, setCloneFrom] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [editingCount, setEditingCount] = useState(false)
  const [countDraft, setCountDraft] = useState('')
  const [pendingDeleteLocation, setPendingDeleteLocation] = useState(null)
  const [deletingLocation, setDeletingLocation] = useState(false)
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [actionError, setActionError] = useState('')

  const canActAsSpecialist = user?.role !== 'poc'
  const canActAsQa = ['qa', 'admin'].includes(user?.role)

  const load = async (isBackgroundRefresh) => {
    if (!isBackgroundRefresh) setLoading(true)
    setError('')
    try {
      const [groupRes, agentsRes] = await Promise.all([apiFetch(`${API_URL}/groups/${id}`), apiFetch(`${API_URL}/agents`)])
      if (!groupRes.ok) throw new Error('Could not load this group')
      const body = await groupRes.json()
      const { locations: locs, ...meta } = body
      setGroupMeta(meta)
      setLocations(Array.isArray(locs) ? locs : [])
      const agentsBody = agentsRes.ok ? await agentsRes.json() : []
      if (Array.isArray(agentsBody)) setAgentNames(agentsBody.map((a) => a.name))
    } catch (err) {
      setError(err.message || 'Could not load this group')
    } finally {
      if (!isBackgroundRefresh) setLoading(false)
    }
  }

  useEffect(() => {
    load(false)
    // Keeps Configuration Status / Account Onboarded fresh if edited directly in the Sheet while
    // this page is open, same background-refresh pattern as Accounts.
    const interval = setInterval(() => load(true), 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token])

  const actions = usePipelineActions({ submissions: locations, setSubmissions: setLocations, user, canActAsSpecialist, canActAsQa })

  const startRename = () => {
    setNameDraft(groupMeta.clientName)
    setRenaming(true)
  }

  const saveRename = async () => {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === groupMeta.clientName) {
      setRenaming(false)
      return
    }
    try {
      const res = await apiFetch(`${API_URL}/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: trimmed }),
      })
      if (!res.ok) throw new Error('Could not rename group')
      const updated = await res.json()
      setGroupMeta((prev) => ({ ...prev, clientName: updated.clientName }))
      showToast('Renamed.')
    } catch (err) {
      const message = err.message || 'Could not rename group'
      setActionError(message)
      showToast(message, 'error')
    } finally {
      setRenaming(false)
    }
  }

  const startEditCount = () => {
    setCountDraft(groupMeta.expectedLocationCount ?? '')
    setEditingCount(true)
  }

  const saveCount = async () => {
    const trimmed = String(countDraft).trim()
    const value = trimmed === '' ? null : Number(trimmed)
    if (value === (groupMeta.expectedLocationCount ?? null)) {
      setEditingCount(false)
      return
    }
    try {
      const res = await apiFetch(`${API_URL}/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedLocationCount: value }),
      })
      const updated = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(updated.error || 'Could not update expected location count')
      setGroupMeta((prev) => ({ ...prev, expectedLocationCount: updated.expectedLocationCount }))
      showToast('Saved.')
    } catch (err) {
      const message = err.message || 'Could not update expected location count'
      setActionError(message)
      showToast(message, 'error')
    } finally {
      setEditingCount(false)
    }
  }

  const confirmDeleteLocation = async () => {
    if (!pendingDeleteLocation) return
    setDeletingLocation(true)
    setActionError('')
    try {
      const res = await apiFetch(`${API_URL}/submissions/${pendingDeleteLocation._id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete location')
      setLocations((prev) => prev.filter((l) => l._id !== pendingDeleteLocation._id))
      showToast('Location deleted.')
      setPendingDeleteLocation(null)
    } catch (err) {
      const message = err.message || 'Failed to delete location'
      setActionError(message)
      showToast(message, 'error')
    } finally {
      setDeletingLocation(false)
    }
  }

  const confirmDeleteGroup = async () => {
    setDeletingGroup(true)
    setActionError('')
    try {
      const res = await apiFetch(`${API_URL}/groups/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error('Failed to delete group')
      showToast('Group deleted.')
      navigate('/')
    } catch (err) {
      const message = err.message || 'Failed to delete group'
      setActionError(message)
      showToast(message, 'error')
      setDeletingGroup(false)
    }
  }

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
    const card = locations.find((s) => s._id === draggingId)
    setDraggingId(null)
    if (card) actions.handleDrop(card, columnKey)
  }

  if (loading) {
    return (
      <div className="voicestack-form dash-shell" data-theme={theme}>
        <Sidebar />
        <main className="dash-main">
          <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
            <TopUserBar />
            <div className="dash-empty">Loading group…</div>
          </CustomScrollbar>
        </main>
      </div>
    )
  }

  if (error || !groupMeta) {
    return (
      <div className="voicestack-form dash-shell" data-theme={theme}>
        <Sidebar />
        <main className="dash-main">
          <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
            <TopUserBar />
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error || 'Group not found'}
              <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={() => load(false)}>
                <i className="ti ti-refresh"></i> Retry
              </button>
            </div>
            <button type="button" className="btn" onClick={() => navigate('/')}>
              Back to Dashboard
            </button>
          </CustomScrollbar>
        </main>
      </div>
    )
  }

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />
      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll" ref={scrollRef}>
          <TopUserBar />

          <div className="dash-main-header">
            <div>
              <Link to="/" className="btn-sm" style={{ marginBottom: 10, display: 'inline-flex' }}>
                <i className="ti ti-arrow-left"></i> Back to Dashboard
              </Link>
              {renaming ? (
                <input
                  type="text"
                  value={nameDraft}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename()
                    if (e.key === 'Escape') setRenaming(false)
                  }}
                  style={{ fontSize: 22, fontWeight: 600, maxWidth: 420 }}
                />
              ) : (
                <h1 onClick={startRename} title="Click to rename" style={{ cursor: 'pointer' }}>
                  {groupMeta.clientName} <i className="ti ti-pencil" style={{ fontSize: 15, color: 'var(--text3)' }}></i>
                  {groupMeta.isTestData && <span className="you-badge">test</span>}
                </h1>
              )}
              <p>
                Multi-location group ·{' '}
                {editingCount ? (
                  <input
                    type="number"
                    min="1"
                    value={countDraft}
                    autoFocus
                    onChange={(e) => setCountDraft(e.target.value)}
                    onBlur={saveCount}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveCount()
                      if (e.key === 'Escape') setEditingCount(false)
                    }}
                    style={{ width: 60 }}
                  />
                ) : (
                  <>
                    {locations.length}
                    {groupMeta.expectedLocationCount ? ` of ${groupMeta.expectedLocationCount}` : ''} location
                    {locations.length === 1 && !groupMeta.expectedLocationCount ? '' : 's'}{' '}
                    <i
                      className="ti ti-pencil"
                      onClick={startEditCount}
                      title="Edit expected location count"
                      style={{ fontSize: 13, color: 'var(--text3)', cursor: 'pointer' }}
                    ></i>
                  </>
                )}
              </p>
            </div>
            <button type="button" className="btn-sm danger" onClick={() => setPendingDeleteGroup(true)}>
              <i className="ti ti-trash"></i> Delete Group
            </button>
          </div>

          {actionError && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {actionError}
            </div>
          )}

          <div className="dash-table-toolbar" style={{ marginBottom: 12 }}>
            <div className="dash-count-label">Locations in this group</div>
            {!addOpen ? (
              <button type="button" className="btn-sm" onClick={() => (locations.length === 0 ? navigate(`/groups/${id}/new`) : setAddOpen(true))}>
                <i className="ti ti-plus"></i> Add Location
              </button>
            ) : (
              <div className="add-location-panel">
                <Link to={`/groups/${id}/new`} className="btn-sm">
                  <i className="ti ti-file-plus"></i> Start Blank
                </Link>
                <SelectInput
                  value={cloneFrom}
                  onChange={setCloneFrom}
                  placeholder="Clone from…"
                  options={locations.map((l) => ({ value: l._id, label: l.locationName || 'Untitled' }))}
                />
                <Link
                  to={cloneFrom ? `/groups/${id}/new?cloneFrom=${cloneFrom}` : '#'}
                  className={`btn-sm ${!cloneFrom ? 'disabled' : ''}`}
                  onClick={(e) => !cloneFrom && e.preventDefault()}
                >
                  Clone
                </Link>
                <button type="button" className="btn-sm" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {locations.length === 0 ? (
            <div className="dash-empty">
              <i className="ti ti-map-pin-off" style={{ fontSize: 28 }}></i>
              <p>No locations added yet. Click &quot;Add Location&quot; to get started.</p>
            </div>
          ) : (
            <KanbanColumns
              cards={locations}
              columnFor={columnFor}
              onDrop={onColumnDrop}
              renderCard={(card, col) => (
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
                    markSeen('sectionComment', card._id)
                    markSeen('pocEdit', card._id)
                  }}
                  onEdit={() => navigate(`/submissions/${card._id}`)}
                  onReview={() => actions.openReview(card)}
                  onRecheck={() => actions.recheck(card)}
                  onHandover={() => actions.startHandover(card)}
                  onRetrySync={() => actions.retrySync(card)}
                  onDelete={() => setPendingDeleteLocation(card)}
                />
              )}
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
        open={!!pendingDeleteLocation}
        title="Delete location?"
        message={pendingDeleteLocation && `This permanently deletes "${pendingDeleteLocation.locationName || 'Untitled location'}" and everything filled in for it.`}
        confirmLabel="Delete"
        danger
        busy={deletingLocation}
        onConfirm={confirmDeleteLocation}
        onCancel={() => setPendingDeleteLocation(null)}
      />

      <ConfirmDialog
        open={pendingDeleteGroup}
        title="Delete group?"
        message={`This permanently deletes "${groupMeta?.clientName || 'Untitled'}" and all ${locations.length} of its location${locations.length === 1 ? '' : 's'}. This can't be undone.`}
        confirmLabel="Delete Group"
        danger
        busy={deletingGroup}
        onConfirm={confirmDeleteGroup}
        onCancel={() => setPendingDeleteGroup(false)}
      />
    </div>
  )
}
