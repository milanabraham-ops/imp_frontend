import { useState } from 'react'
import { COLUMNS as PIPELINE_COLUMNS } from './pipelineHelpers'
import './pipelineBoard.css'

// The column shell shared by every kanban-style board in the app (Pipeline, Accounts, the group
// drill-in, Integrations) — same drag-over highlighting and bucketing mechanics regardless of how
// many stages a given board has. `columns` defaults to Pipeline's own 5-stage set so its existing
// callers (Pipeline/Accounts/GroupDetail) don't need to pass it explicitly; a board with a
// different stage set (e.g. Integrations' 4) passes its own. Each page decides what a card
// actually looks like (and whether it's draggable at all) via `renderCard`; this only owns
// bucketing + the drop target itself.
export default function KanbanColumns({ cards, columns = PIPELINE_COLUMNS, columnFor, onDrop, renderCard, highlightColumn }) {
  const [dragOverColumn, setDragOverColumn] = useState(null)

  const cardsByColumn = new Map(columns.map((c) => [c.key, []]))
  for (const card of cards) {
    const key = columnFor(card)
    cardsByColumn.get(key)?.push(card)
  }

  return (
    <div className="kanban-board">
      {columns.map((col) => (
        <div
          key={col.key}
          id={`kanban-column-${col.key}`}
          className={`kanban-column tone-${col.tone}${dragOverColumn === col.key ? ' drag-over' : ''}${highlightColumn === col.key ? ' column-flash' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOverColumn(col.key)
          }}
          onDragLeave={() => setDragOverColumn((c) => (c === col.key ? null : c))}
          onDrop={(e) => {
            e.preventDefault()
            setDragOverColumn(null)
            onDrop(col.key, e)
          }}
        >
          <div className="kanban-column-header">
            <span>{col.label}</span>
            <span className="kanban-column-count">{cardsByColumn.get(col.key).length}</span>
          </div>
          <div className="kanban-column-cards">
            {cardsByColumn.get(col.key).length === 0 && <div className="kanban-column-empty">No cards</div>}
            {cardsByColumn.get(col.key).map((card) => renderCard(card, col))}
          </div>
        </div>
      ))}
    </div>
  )
}
