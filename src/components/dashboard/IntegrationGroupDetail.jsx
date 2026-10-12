import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useNotifications } from '../../context/NotificationContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import IntegrationCard from './IntegrationCard'
import IntegrationEditModal from './IntegrationEditModal'
import KanbanColumns from './KanbanColumns'
import { useIntegrationActions } from './useIntegrationActions'
import { INTEGRATION_COLUMNS, columnForIntegration } from './pipelineHelpers'
import '../form/form.css'
import './pipelineBoard.css'

// One group's own integration board — same card/column design as the Integrations overview,
// scoped to just this group's locations that actually need one (a mixed group can have some
// locations that never needed integration at all, e.g. CS Voicestack ones — those never show up
// here). Read-only page for group identity itself (rename/add-location/delete all stay on the
// Configuration side, GroupDetail.jsx) — this is purely the integration workflow for the group.
export default function IntegrationGroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()
  const { unseenIds, markSeen } = useNotifications()

  const [groupMeta, setGroupMeta] = useState(null)
  const [locations, setLocations] = useState([])
  const [agentNames, setAgentNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draggingId, setDraggingId] = useState(null)

  const canAct = user?.role !== 'poc'
  const canEditDetails = ['poc', 'admin'].includes(user?.role)

  const load = useCallback(
    async (isBackgroundRefresh) => {
      if (!isBackgroundRefresh) setLoading(true)
      try {
        const [groupRes, agentsRes] = await Promise.all([apiFetch(`${API_URL}/groups/${id}`), apiFetch(`${API_URL}/agents`)])
        if (!groupRes.ok) throw new Error('Could not load this group')
        const body = await groupRes.json()
        const { locations: locs, ...meta } = body
        setGroupMeta(meta)
        setLocations((Array.isArray(locs) ? locs : []).filter((l) => l.integrationStatus))
        const agentsBody = agentsRes.ok ? await agentsRes.json() : []
        if (Array.isArray(agentsBody)) setAgentNames(agentsBody.map((a) => a.name))
        setError('')
      } catch (err) {
        setError(err.message || 'Could not load this group')
      } finally {
        setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    load(false)
    const interval = setInterval(() => load(true), 5000)
    return () => clearInterval(interval)
  }, [load])

  const actions = useIntegrationActions({ submissions: locations, setSubmissions: setLocations, user, canAct })

  const onDragStart = (e, card) => {
    if (!canAct || !actions.canDragIntegration(card)) {
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
          <CustomScrollbar vertical className="dash-main-scroll">
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
          <CustomScrollbar vertical className="dash-main-scroll">
            <TopUserBar />
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error || 'Group not found'}
              <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={() => load(false)}>
                <i className="ti ti-refresh"></i> Retry
              </button>
            </div>
            <button type="button" className="btn" onClick={() => navigate('/integrations')}>
              Back to Integrations
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
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />

          <div className="dash-main-header">
            <div>
              <Link to="/integrations" className="btn-sm" style={{ marginBottom: 10, display: 'inline-flex' }}>
                <i className="ti ti-arrow-left"></i> Back to Integrations
              </Link>
              <h1>
                {groupMeta.clientName}
                {groupMeta.isTestData && <span className="you-badge">test</span>}
              </h1>
              <p>
                {locations.length} location{locations.length === 1 ? '' : 's'} need integration
              </p>
            </div>
          </div>

          {locations.length === 0 ? (
            <div className="dash-empty">
              <i className="ti ti-plug-connected" style={{ fontSize: 28 }}></i>
              <p>No locations in this group need integration.</p>
            </div>
          ) : (
            <KanbanColumns
              cards={locations}
              columns={INTEGRATION_COLUMNS}
              columnFor={columnForIntegration}
              onDrop={onColumnDrop}
              renderCard={(card, col) => (
                <IntegrationCard
                  key={card._id}
                  card={card}
                  columnKey={col.key}
                  tone={col.tone}
                  draggable={canAct && actions.canDragIntegration(card)}
                  dragging={draggingId === card._id}
                  onDragStart={(e) => onDragStart(e, card)}
                  onDragEnd={onDragEnd}
                  savingId={actions.savingId}
                  user={user}
                  agentNames={agentNames}
                  canAct={canAct}
                  unseenIds={unseenIds}
                  onTakeOver={() => actions.takeOver(card)}
                  onReassign={(v) => actions.reassign(card, v)}
                  onView={() => {
                    actions.setEditing(card)
                    markSeen('newIntegration', card._id)
                    markSeen('integrationComplete', card._id)
                    markSeen('comment', card._id)
                  }}
                />
              )}
            />
          )}
        </CustomScrollbar>
      </main>

      <IntegrationEditModal
        submission={actions.editing}
        busy={actions.editSaving}
        readOnly={!canEditDetails}
        onClose={() => actions.setEditing(null)}
        onSave={actions.saveEdit}
        onCommentPosted={actions.onCommentPosted}
      />
    </div>
  )
}
