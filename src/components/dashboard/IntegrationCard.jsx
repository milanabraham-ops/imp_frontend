import { isMine } from '../../lib/isMine'
import { reassignOptions } from '../../lib/reassignOptions'
import SelectInput from '../common/SelectInput'
import './pipelineBoard.css'

// Deliberately minimal — this is the one card in the app that can carry real PMS login
// credentials (serverAccess) behind it, so only the account name, location name, and which PMS
// is involved ever render here. Everything else (integration notes, links) only ever shows up
// once someone actually clicks View, which opens IntegrationEditModal — never the full
// intake-wizard detail view, and never inline on the board itself. Only one action here, not a
// separate Edit button: whether that modal opens editable is decided purely by role
// (IntegrationBoard/IntegrationGroupDetail's canEditDetails -> the modal's own readOnly prop),
// so View is the single entry point for everyone regardless of permission.
export default function IntegrationCard({
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
  canAct,
  unseenIds,
  onTakeOver,
  onReassign,
  onView,
}) {
  const hasUnseen = unseenIds && (unseenIds.newIntegration.has(s._id) || unseenIds.integrationComplete.has(s._id) || unseenIds.comment.has(s._id))
  const isComplete = columnKey === 'COMPLETED'
  // Nudge for a ticket nobody's picked up yet — same rule as SubmissionCard's isUnclaimed.
  const isUnclaimed = !isComplete && !s.integrationAgent

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
              <span className="dash-nav-badge" title="New activity" />
              {unseenIds.comment.has(s._id) && <span className="dash-nav-badge comment" title="New comment" />}
            </span>
          )}
          <span className="kanban-card-title-text">{s.clientName || 'Untitled'}</span>
        </div>
        {draggable && <i className="ti ti-grip-vertical kanban-card-grip" title="Drag to move"></i>}
      </div>

      {isUnclaimed && (
        <div className="kanban-card-badges">
          <span className="unclaimed-badge" title="Nobody has taken this over yet">
            <i className="ti ti-alert-triangle"></i> Unclaimed
          </span>
        </div>
      )}

      <div className="kanban-card-subtitle">
        <i className="ti ti-map-pin"></i> {s.locationName || 'Untitled location'}
        <span className="kanban-card-market">{s.pms}</span>
      </div>

      <div className="kanban-card-divider" />

      <div className="kanban-card-row">
        <span className="kanban-card-row-label">
          <i className="ti ti-user-circle"></i> Integration Agent
        </span>
        <div className="kanban-card-row-value">
          {!s.integrationAgent ? (
            canAct && (
              <button type="button" className="btn-sm ghost" disabled={savingId === s._id} onClick={onTakeOver}>
                <i className="ti ti-hand-stop"></i> Take Over
              </button>
            )
          ) : isMine(s.integrationAgent, user?.name) ? (
            <SelectInput
              className="inline-edit-select"
              value={s.integrationAgent}
              disabled={savingId === s._id || isComplete}
              onChange={onReassign}
              options={reassignOptions(agentNames, s.integrationAgent)}
            />
          ) : (
            <span className="review-value">{s.integrationAgent}</span>
          )}
        </div>
      </div>

      <div className="kanban-card-footer">
        <span className="kanban-card-timestamp" />
        <div className="kanban-card-actions">
          <button type="button" className="icon-btn" title="View" aria-label="View" onClick={onView}>
            <i className="ti ti-eye"></i>
          </button>
        </div>
      </div>
    </div>
  )
}
