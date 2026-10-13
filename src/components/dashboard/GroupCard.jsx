import { Link } from 'react-router-dom'
import { formatDate } from './pipelineHelpers'
import './pipelineBoard.css'

function formatGroupLabel(g) {
  return `${g.locationCount || 0}${g.expectedLocationCount ? ` of ${g.expectedLocationCount}` : ''} location${
    g.locationCount === 1 && !g.expectedLocationCount ? '' : 's'
  }`
}

// A group never appears as individual location cards at this level, that would double-count
// (and double-clutter) an "Accounts" view whose whole point is one entry per client relationship.
// Never draggable (there's no single stage for several locations that may each be somewhere
// different); "View Locations" drills into the group's own board instead.
export default function GroupCard({ group, onDelete }) {
  return (
    <Link to={`/groups/${group._id}`} className="kanban-card kanban-card-group">
      <div className="kanban-card-header">
        <div className="kanban-card-title">
          <span className="kanban-card-title-text">{group.clientName || 'Untitled'}</span>
        </div>
        <i className="ti ti-list-details kanban-card-grip" title="View locations"></i>
      </div>

      {group.isTestData && (
        <div className="kanban-card-badges">
          <span className="you-badge">test</span>
        </div>
      )}

      <div className="kanban-card-subtitle">
        <i className="ti ti-building-community"></i> {formatGroupLabel(group)}
        {group.markets?.length > 0 && <span className="kanban-card-market">{group.markets.join(', ')}</span>}
      </div>
      {group.pocs?.length > 0 && <div className="kanban-card-meta">POC: {group.pocs.join(', ')}</div>}

      <div className="kanban-card-divider" />

      <div className="kanban-card-row">
        <span className="kanban-card-row-label">
          <i className="ti ti-user-circle"></i> Specialists
        </span>
        <div className="kanban-card-row-value">
          <span className="review-value">{group.specialists?.length ? group.specialists.join(', ') : '-'}</span>
        </div>
      </div>

      <div className="kanban-card-row">
        <span className="kanban-card-row-label">
          <i className="ti ti-clipboard-check"></i> Onboarded
        </span>
        <div className="kanban-card-row-value">
          {group.accountOnboarded ? <span className="status-badge">{group.accountOnboarded}</span> : <span className="kanban-card-meta">Not set</span>}
        </div>
      </div>

      <div className="kanban-card-footer">
        <span className="kanban-card-timestamp">{formatDate(group.mostRecentLocationAt || group.createdAt)}</span>
        {onDelete && (
          <div className="kanban-card-actions">
            <button
              type="button"
              className="icon-btn danger"
              title="Delete group"
              aria-label="Delete group"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete()
              }}
            >
              <i className="ti ti-trash"></i>
            </button>
          </div>
        )}
      </div>
    </Link>
  )
}
