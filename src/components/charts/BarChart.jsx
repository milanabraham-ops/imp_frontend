import { useRef, useState } from 'react'
import { formatCompact } from './chartTheme'

const BAR_THICKNESS = 22
const GAP = 10

// Single-series bar/column chart — one hue throughout (per dataviz: nominal categories like
// names or time buckets get one color, never a rainbow). `orientation="vertical"` renders a
// trend-over-time column chart; `"horizontal"` renders a sorted leaderboard.
export default function BarChart({ data, orientation = 'vertical', color = 'var(--accent)', height = 220, valueSuffix = '', onBarClick }) {
  const [hover, setHover] = useState(null)
  const containerRef = useRef(null)

  if (!data || data.length === 0) {
    return <div className="chart-empty">No data for this period.</div>
  }

  const max = Math.max(1, ...data.map((d) => d.value))

  if (orientation === 'horizontal') {
    const width = 520
    const labelWidth = 120
    const plotWidth = width - labelWidth - 50
    const rowHeight = BAR_THICKNESS + GAP
    const svgHeight = data.length * rowHeight + 10

    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${svgHeight}`} width="100%" height={svgHeight} role="img" aria-label="Leaderboard bar chart">
          {data.map((d, i) => {
            const barW = Math.max(2, (d.value / max) * plotWidth)
            const y = i * rowHeight + GAP / 2
            return (
              <g key={d.label}>
                <text x={labelWidth - 8} y={y + BAR_THICKNESS / 2 + 4} textAnchor="end" className="chart-bar-label">
                  {d.label.length > 16 ? `${d.label.slice(0, 15)}…` : d.label}
                </text>
                <rect
                  className="chart-bar"
                  x={labelWidth}
                  y={y}
                  width={barW}
                  height={BAR_THICKNESS}
                  rx={4}
                  fill={color}
                  onMouseMove={(e) => {
                    const rect = containerRef.current.getBoundingClientRect()
                    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: d.label, value: d.value })
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={onBarClick ? () => onBarClick(d) : undefined}
                  role={onBarClick ? 'button' : undefined}
                  tabIndex={onBarClick ? 0 : undefined}
                  onKeyDown={onBarClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBarClick(d) } } : undefined}
                  aria-label={onBarClick ? `View ${d.label} in pipeline` : undefined}
                />
                <text x={labelWidth + barW + 6} y={y + BAR_THICKNESS / 2 + 4} className="chart-value-label">
                  {formatCompact(d.value)}
                  {valueSuffix}
                </text>
              </g>
            )
          })}
        </svg>
        {hover && (
          <div className="chart-tooltip" style={{ left: hover.x + 12, top: hover.y - 10 }}>
            <div className="chart-tooltip-value">
              {formatCompact(hover.value)}
              {valueSuffix}
            </div>
            <div className="chart-tooltip-label">{hover.label}</div>
          </div>
        )}
      </div>
    )
  }

  // Vertical columns (trend over time)
  const width = 560
  const plotHeight = height - 30
  const colWidth = width / data.length
  const barW = Math.min(BAR_THICKNESS, colWidth - GAP)

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Trend column chart">
        <line x1={0} y1={plotHeight} x2={width} y2={plotHeight} className="chart-axis-line" />
        {data.map((d, i) => {
          const barH = Math.max(2, (d.value / max) * (plotHeight - 20))
          const cx = i * colWidth + colWidth / 2
          const x = cx - barW / 2
          const y = plotHeight - barH
          return (
            <g key={d.label}>
              <rect
                className="chart-bar"
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill={color}
                onMouseMove={(e) => {
                  const rect = containerRef.current.getBoundingClientRect()
                  setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: d.label, value: d.value })
                }}
                onMouseLeave={() => setHover(null)}
              />
              <text x={cx} y={plotHeight + 16} textAnchor="middle" className="chart-tick-label">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      {hover && (
        <div className="chart-tooltip" style={{ left: hover.x + 12, top: hover.y - 10 }}>
          <div className="chart-tooltip-value">{formatCompact(hover.value)}</div>
          <div className="chart-tooltip-label">{hover.label}</div>
        </div>
      )}
    </div>
  )
}
