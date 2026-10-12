import { isMine } from '../../lib/isMine'
import { reassignOptions } from '../../lib/reassignOptions'
import SelectInput from '../common/SelectInput'
import { formatDate, isInQaDomain, activeOwnerName, ACCOUNT_ONBOARDED_OPTIONS } from './pipelineHelpers'
import './pipelineBoard.css'

function OwnerRow({ label, name, canAct, savingId, s, onTakeOver, onReassign, agentNames, user }) {
  return (
    <div className="kanban-card-row">
      <span className="kanban-card-row-label">
        <i className="ti ti-user-circle"></i> {label}
      </span>
      <div className="kanban-card-row-value">
        {!name ? (
          canAct &&
          onTakeOver && (
            <button type="button" className="btn-sm ghost" disabled={savingId === s._id} onClick={onTakeOver}>
              <i className="ti ti-hand-stop"></i> Take Over
            </button>
          )
        ) : onReassign && isMine(name, user?.name) ? (
          <SelectInput className="inline-edit-select" value={name} disabled={savingId === s._id} onChange={onReassign} options={reassignOptions(agentNames, name)} />
        ) : (
          <span className="review-value">{name}</span>
        )}
      </div>
    </div>
  )
}

// The one card used everywhere a submission (a single location) shows up in a pipeline-style
// board — Pipeline itself, Accounts, and the group drill-in. `draggable`/the take-over and
// reassign callbacks are what actually gate interactivity; passing none of them (Accounts/
// GroupDetail for a POC) renders a purely read-only card with no behavior change needed here.
export default function SubmissionCard({
  card: s,
  columnKey,
  tone,
  draggable = false,
  dragging = false,
  onDragStart,
  onDragEnd,
  savingId,
  user,
  agentNames,
  canActAsSpecialist = false,
  canActAsQa = false,
  unseenIds,
  onTakeOverSpecialist,
  onTakeOverQa,
  onReassignSpecialist,
  onReassignQa,
  onSetOnboarded,
  onView,
  onReview,
  onRecheck,
  onHandover,
  onEdit,
  onDelete,
  onRetrySync,
}) {
  const inQaDomain = isInQaDomain(s)
  const isComplete = columnKey === 'COMPLETED'
  const isHold = columnKey === 'ON_HOLD'
  // Nudge for anything sitting with nobody actively working it right now — easy to lose track of
  // once it's buried among claimed cards, especially a QA-domain one nobody's picked up yet.
  const isUnclaimed = !isComplete && !activeOwnerName(s)
  const syncIssue = (s.syncIssues || [])[0]
  // Same "current owner may edit it" rule as the dropdown in the old Configuration Requests/QA
  // Requests pages — whoever is actively working this location right now.
  const canEditOnboarded = onSetOnboarded && (inQaDomain ? canActAsQa && isMine(s.qaAgent, user?.name) : canActAsSpecialist && isMine(s.implementationSpecialist, user?.name))
  const hasUnseen =
    unseenIds &&
    (unseenIds.newRequest.has(s._id) ||
      unseenIds.qaHandoff.has(s._id) ||
      unseenIds.comment.has(s._id) ||
      unseenIds.pocHandover.has(s._id) ||
      unseenIds.pocEdit.has(s._id))

  return (
    <div
      className={`kanban-card tone-${tone}${dragging ? ' dragging' : ''}${draggable ? ' draggable' : ' locked'}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="kanban-card-header">
        <div className="kanban-card-title">
          {hasUnseen && (
            <span className="row-badges">
              {(unseenIds.newRequest.has(s._id) ||
                unseenIds.qaHandoff.has(s._id) ||
                unseenIds.pocHandover.has(s._id) ||
                unseenIds.pocEdit.has(s._id)) && <span className="dash-nav-badge" title="New activity" />}
              {unseenIds.comment.has(s._id) && <span className="dash-nav-badge comment" title="New comment" />}
            </span>
          )}
          <span className="kanban-card-title-text">{s.clientName || 'Untitled'}</span>
        </div>
        {draggable && <i className="ti ti-grip-vertical kanban-card-grip" title="Drag to move"></i>}
      </div>

      {(s.isTestData || s.group || isUnclaimed || syncIssue) && (
        <div className="kanban-card-badges">
          {syncIssue && (
            <span className="sync-issue-badge" title={`Sheet sync failed: ${syncIssue.message}`}>
              <i className="ti ti-cloud-off"></i> Sync failed
            </span>
          )}
          {isUnclaimed && (
            <span className="unclaimed-badge" title="Nobody has taken this over yet">
              <i className="ti ti-alert-triangle"></i> Unclaimed
            </span>
          )}
          {s.group && (
            <span className="group-badge" title="Part of a multi-location group">
              <i className="ti ti-building-community"></i> Group
            </span>
          )}
          {s.isTestData && <span className="you-badge">test</span>}
        </div>
      )}

      <div className="kanban-card-subtitle">
        <i className="ti ti-map-pin"></i> {s.locationName || 'Untitled location'}
        {s.market && <span className="kanban-card-market">{s.market}</span>}
      </div>
      {s.poc && <div className="kanban-card-meta">POC: {s.poc}</div>}

      {isHold && (
        <div className="kanban-card-chip warning">
          <i className="ti ti-player-pause"></i> Paused from {s.statusBeforeHold || 'Not Started'}
        </div>
      )}

      <div className="kanban-card-divider" />

      {inQaDomain && s.implementationSpecialist && (
        <div className="kanban-card-row">
          <span className="kanban-card-row-label">
            <i className="ti ti-tool"></i> Configured by
          </span>
          <div className="kanban-card-row-value">
            <span className="review-value">{s.implementationSpecialist}</span>
          </div>
        </div>
      )}

      <OwnerRow
        label={inQaDomain ? 'QA Reviewer' : 'Specialist'}
        name={inQaDomain ? s.qaAgent : s.implementationSpecialist}
        canAct={inQaDomain ? canActAsQa : canActAsSpecialist}
        savingId={savingId}
        s={s}
        onTakeOver={inQaDomain ? onTakeOverQa : onTakeOverSpecialist}
        onReassign={inQaDomain ? onReassignQa : onReassignSpecialist}
        agentNames={agentNames}
        user={user}
      />

      <div className="kanban-card-row">
        <span className="kanban-card-row-label">
          <i className="ti ti-clipboard-check"></i> Onboarded
        </span>
        <div className="kanban-card-row-value">
          {canEditOnboarded ? (
            <SelectInput
              className="inline-edit-select"
              value={s.accountOnboarded || ''}
              disabled={savingId === s._id || isComplete}
              onChange={onSetOnboarded}
              options={ACCOUNT_ONBOARDED_OPTIONS.map((opt) => ({ value: opt, label: opt || 'Not set' }))}
            />
          ) : s.accountOnboarded ? (
            <span className="status-badge">{s.accountOnboarded}</span>
          ) : (
            <span className="kanban-card-meta">Not set</span>
          )}
        </div>
      </div>

      <div className="kanban-card-footer">
        <span className="kanban-card-timestamp">{formatDate(s.createdAt)}</span>
        <div className="kanban-card-actions">
          {onView && (
            <button type="button" className="icon-btn" title="View" aria-label="View" onClick={onView}>
              <i className="ti ti-eye"></i>
            </button>
          )}
          {onEdit && (
            <button type="button" className="icon-btn" title="Edit" aria-label="Edit" onClick={onEdit}>
              <i className="ti ti-pencil"></i>
            </button>
          )}
          {inQaDomain && canActAsQa && isMine(s.qaAgent, user?.name) && onReview && (
            <button type="button" className="icon-btn" title="Review" aria-label="Review" onClick={onReview}>
              <i className="ti ti-clipboard-check"></i>
            </button>
          )}
          {isComplete && canActAsQa && isMine(s.qaAgent, user?.name) && (
            <>
              {onRecheck && (
                <button type="button" className="icon-btn" title="Recheck" aria-label="Recheck" onClick={onRecheck}>
                  <i className="ti ti-refresh"></i>
                </button>
              )}
              {onHandover && (
                <button type="button" className="icon-btn" title={s.pocHandoverAt ? 'Handover Again' : 'Handover'} aria-label={s.pocHandoverAt ? 'Handover Again' : 'Handover'} onClick={onHandover}>
                  <i className="ti ti-send"></i>
                </button>
              )}
            </>
          )}
          {syncIssue && onRetrySync && (
            <button type="button" className="icon-btn" title="Retry Sheet sync" aria-label="Retry Sheet sync" onClick={onRetrySync}>
              <i className="ti ti-refresh"></i>
            </button>
          )}
          {onDelete && (
            <button type="button" className="icon-btn danger" title="Delete" aria-label="Delete" onClick={onDelete}>
              <i className="ti ti-trash"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
