import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useNotifications } from '../../context/NotificationContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import ConfirmDialog from '../common/ConfirmDialog'
import SubmissionDetailModal from './SubmissionDetailModal'
import QAReviewModal from './QAReviewModal'
import MessageComposeModal from '../common/MessageComposeModal'
import SubmissionCard from './SubmissionCard'
import KanbanColumns from './KanbanColumns'
import { usePipelineActions } from './usePipelineActions'
import { normalize, columnFor, canDrag } from './pipelineHelpers'
import { isMine } from '../../lib/isMine'
import '../form/form.css'
import './pipelineBoard.css'

export default function PipelineBoard() {
  const { user } = useAuth()
  const { theme } = useTheme()

  const [submissions, setSubmissions] = useState([])
  const [agentNames, setAgentNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Pre-filled from a Stats-page leaderboard/tile drill-down link (?q=name or ?status=COLUMN_KEY)
  // — read once on mount, same as any other deep link; typing in the box afterwards behaves as
  // normal local state.
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '')
  const [highlightColumn, setHighlightColumn] = useState(() => new URLSearchParams(window.location.search).get('status') || null)
  const [draggingId, setDraggingId] = useState(null)

  useEffect(() => {
    if (!highlightColumn) return
    const el = document.getElementById(`kanban-column-${highlightColumn}`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    const timer = setTimeout(() => setHighlightColumn(null), 2000)
    return () => clearTimeout(timer)
  }, [highlightColumn])

  const canActAsSpecialist = user?.role !== 'poc'
  const canActAsQa = ['qa', 'admin'].includes(user?.role)

  const load = useCallback(async (isBackgroundRefresh) => {
    if (!isBackgroundRefresh) setLoading(true)
    try {
      const [subsRes, agentsRes] = await Promise.all([apiFetch(`${API_URL}/submissions`), apiFetch(`${API_URL}/agents`)])
      if (!subsRes.ok) throw new Error('Failed to load submissions')
      const body = await subsRes.json()
      const agentsBody = agentsRes.ok ? await agentsRes.json() : []
      setSubmissions(Array.isArray(body) ? body : [])
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
  const { unseenIds, markSeen } = useNotifications()

  // Every location is its own card, standalone or part of a multi-location group — grouping them
  // under one card would mean drilling into a separate sub-board to actually work each location,
  // which defeats the point of a single drag surface. A card still shows which group it belongs
  // to so the relationship isn't lost, just not collapsed away.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return submissions
    return submissions.filter((s) =>
      [s.clientName, s.locationName, s.market, s.poc, s.implementationSpecialist, s.qaAgent].some((v) => (v || '').toLowerCase().includes(q)),
    )
  }, [submissions, search])

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
              <h1>Pipeline</h1>
              <p>Drag a card to move it to the next stage.</p>
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

          <div className="dash-table-toolbar" style={{ marginBottom: 12 }}>
            <div className="dash-search">
              <i className="ti ti-search"></i>
              <input type="text" placeholder="Search by client, location, market, POC…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="dash-count-label">
              {filtered.length} of {submissions.length} card{submissions.length === 1 ? '' : 's'}
            </div>
          </div>

          {loading ? (
            <div className="dash-empty">Loading…</div>
          ) : (
            <KanbanColumns
              cards={filtered}
              columnFor={columnFor}
              onDrop={onColumnDrop}
              highlightColumn={highlightColumn}
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
                    markSeen('newRequest', card._id)
                    markSeen('comment', card._id)
                    markSeen('pocEdit', card._id)
                  }}
                  onReview={() => actions.openReview(card)}
                  onRecheck={() => actions.recheck(card)}
                  onHandover={() => actions.startHandover(card)}
                  onRetrySync={() => actions.retrySync(card)}
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
    </div>
  )
}
