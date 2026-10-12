import { Link } from 'react-router-dom'
import { formatDate } from './pipelineHelpers'
import './pipelineBoard.css'

function formatLocationLabel(g) {
  return `${g.integrationLocationCount || 0} of ${g.locationCount || 0} location${g.locationCount === 1 ? '' : 's'} need integration`
}

// Same "one card per client relationship" rule as GroupCard — never individual location cards at
// this level, and never draggable (no single stage for locations that may each be somewhere
// different). "View" drills into this group's own integration board (IntegrationGroupDetail),
// scoped to just the locations that actually need one. Deliberately shows only PMS system names —
// no server access or other sensitive details ever render on a card face, same rule as IntegrationCard.
export default function IntegrationGroupCard({ group }) {
  return (
    <Link to={`/integrations/groups/${group._id}`} className="kanban-card kanban-card-group">
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
        <i className="ti ti-building-community"></i> {formatLocationLabel(group)}
        {group.pmsSystems?.length > 0 && <span className="kanban-card-market">{group.pmsSystems.join(', ')}</span>}
      </div>

      <div className="kanban-card-divider" />

      <div className="kanban-card-row">
        <span className="kanban-card-row-label">
          <i className="ti ti-user-circle"></i> Integration Agents
        </span>
        <div className="kanban-card-row-value">
          <span className="review-value">{group.integrationAgents?.length ? group.integrationAgents.join(', ') : '—'}</span>
        </div>
      </div>

      <div className="kanban-card-footer">
        <span className="kanban-card-timestamp">{formatDate(group.mostRecentLocationAt || group.createdAt)}</span>
      </div>
    </Link>
  )
}
