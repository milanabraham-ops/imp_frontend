import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useNotifications } from '../../context/NotificationContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import IntegrationCard from './IntegrationCard'
import IntegrationGroupCard from './IntegrationGroupCard'
import IntegrationEditModal from './IntegrationEditModal'
import KanbanColumns from './KanbanColumns'
import { useIntegrationActions } from './useIntegrationActions'
import { INTEGRATION_COLUMNS, columnForIntegration, columnForIntegrationGroupStatus } from './pipelineHelpers'
import '../form/form.css'
import './pipelineBoard.css'

// A separate tracking dimension from the main configuration/QA Pipeline — hooking a location's
// PMS up to the phone system. Only ever relevant for a non-"CS Voicestack" environment with a
// PMS actually specified (see submissionController's needsIntegration); a CS Voicestack account
// never shows up here at all, since it's always already wired to CareStack directly.
//
// Multi-location accounts get the same "double pipeline" treatment as Accounts/Configuration —
// one IntegrationGroupCard per client relationship instead of one card per location — but unlike
// Configuration this applies identically for every role, not just POC. Integration work is
// normally handled as one unit per account rather than split location-by-location across
// different people, so there's no flat "every role sees every location separately" mode here.
export default function IntegrationBoard() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { unseenIds, markSeen } = useNotifications()

  const [submissions, setSubmissions] = useState([])
  const [groups, setGroups] = useState([])
  const [agentNames, setAgentNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [draggingId, setDraggingId] = useState(null)

  // No specialist/QA split here — anyone but a POC can pick up an integration ticket. A POC's
  // board is read-only for the same reason it is everywhere else: the backend already blocks
  // every tracking-field edit from them.
  const canAct = user?.role !== 'poc'
  // Only POC/admin may actually edit the PMS/server-access/notes fields (see submissionController's
  // fieldsForRole) — everyone else opens the exact same modal via View, just read-only.
  const canEditDetails = ['poc', 'admin'].includes(user?.role)

  const load = useCallback(async (isBackgroundRefresh) => {
    if (!isBackgroundRefresh) setLoading(true)
    try {
      const [subsRes, groupsRes, agentsRes] = await Promise.all([
        apiFetch(`${API_URL}/submissions`),
        apiFetch(`${API_URL}/groups`),
        apiFetch(`${API_URL}/agents`),
      ])
      if (!subsRes.ok || !groupsRes.ok) throw new Error('Failed to load integrations')
      const subsBody = await subsRes.json()
      const groupsBody = await groupsRes.json()
      const agentsBody = agentsRes.ok ? await agentsRes.json() : []
      const allSubs = Array.isArray(subsBody) ? subsBody : []
      // Grouped locations are shown via their group's card instead — never as their own
      // top-level card, or they'd be double-counted here (same rule as Accounts).
      setSubmissions(allSubs.filter((s) => s.integrationStatus && !s.group))
      const allGroups = Array.isArray(groupsBody) ? groupsBody : []
      setGroups(allGroups.filter((g) => g.needsIntegration))
      if (Array.isArray(agentsBody)) setAgentNames(agentsBody.map((a) => a.name))
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(false)
    const interval = setInterval(() => load(true), 5000)
    return () => clearInterval(interval)
  }, [load])

  const actions = useIntegrationActions({ submissions, setSubmissions, user, canAct })

  const rows = useMemo(
    () => [...submissions.map((s) => ({ kind: 'submission', ...s })), ...groups.map((g) => ({ kind: 'group', ...g }))],
    [submissions, groups],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      r.kind === 'group'
        ? [r.clientName, ...(r.pmsSystems || []), ...(r.integrationAgents || [])].some((v) => (v || '').toLowerCase().includes(q))
        : [r.clientName, r.locationName, r.pms, r.integrationAgent].some((v) => (v || '').toLowerCase().includes(q)),
    )
  }, [rows, search])

  const onDragStart = (e, card) => {
    if (card.kind === 'group' || !canAct || !actions.canDragIntegration(card)) {
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
              <h1>Integrations</h1>
              <p>PMS integration tickets for non-CS Voicestack accounts.</p>
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
              <input type="text" placeholder="Search by client, location, PMS…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="dash-count-label">
              {filtered.length} of {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}
            </div>
          </div>

          {loading ? (
            <div className="dash-empty">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="dash-empty">
              <i className="ti ti-plug-connected" style={{ fontSize: 28 }}></i>
              <p>No integration tickets right now.</p>
            </div>
          ) : (
            <KanbanColumns
              cards={filtered}
              columns={INTEGRATION_COLUMNS}
              columnFor={(r) => (r.kind === 'group' ? columnForIntegrationGroupStatus(r.integrationStatus) : columnForIntegration(r))}
              onDrop={onColumnDrop}
              renderCard={(card, col) =>
                card.kind === 'group' ? (
                  <IntegrationGroupCard key={card._id} group={card} />
                ) : (
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
                )
              }
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
