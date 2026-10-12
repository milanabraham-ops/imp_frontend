import { RANGE_OPTIONS } from './chartTheme'

// One filter row, above everything it scopes — every stat/chart on the page re-renders
// against the same range so the numbers always agree (see dataviz skill: interaction.md).
//
// `value` is the active named range ('week'/'month'/'quarter'/'year'/'all') or 'custom'.
// `customStart`/`customEnd` are the YYYY-MM-DD strings for the two date inputs, only shown
// (and only meaningful) once 'custom' is selected. `onChange` is always called with a single
// object — `{ range: 'week' }` for a named button, or `{ range: 'custom', startDate, endDate }`
// whenever the Custom button or either date input changes — so the caller has one shape to
// handle regardless of which control fired.
export default function TimeRangeFilter({ value, customStart, customEnd, onChange }) {
  const isCustom = value === 'custom'

  return (
    <div className="range-filter-wrap">
      <div className="range-filter scope-toggle">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`scope-toggle-btn ${value === opt.key ? 'active' : ''}`}
            onClick={() => onChange({ range: opt.key })}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          className={`scope-toggle-btn ${isCustom ? 'active' : ''}`}
          onClick={() => onChange({ range: 'custom', startDate: customStart, endDate: customEnd })}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="range-filter-custom" style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            From
            <input
              type="date"
              className="inline-edit-input"
              value={customStart || ''}
              onChange={(e) => onChange({ range: 'custom', startDate: e.target.value, endDate: customEnd })}
            />
          </label>
          <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            To
            <input
              type="date"
              className="inline-edit-input"
              value={customEnd || ''}
              onChange={(e) => onChange({ range: 'custom', startDate: customStart, endDate: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  )
}
