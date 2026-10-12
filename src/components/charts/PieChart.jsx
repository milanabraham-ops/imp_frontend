import { useRef, useState } from 'react'
import { formatCompact } from './chartTheme'

const SIZE = 200
const R = SIZE / 2 - 4
const CX = SIZE / 2
const CY = SIZE / 2

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function wedgePath(cx, cy, r, startDeg, endDeg) {
  const p1 = polarToCartesian(cx, cy, r, startDeg)
  const p2 = polarToCartesian(cx, cy, r, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx},${cy} L ${p1.x},${p1.y} A ${r},${r} 0 ${largeArc} 1 ${p2.x},${p2.y} Z`
}

// Full part-to-whole pie — nominal CATEGORICAL breakdown (e.g. market mix), unlike the ordinal
// donut used for the status funnel. One color per identity, fixed hue order, no natural order
// to the slices themselves. Capped at ~6 segments per the dataviz skill; fold a longer tail into
// "Other" at the call site rather than growing this past that.
export default function PieChart({ segments }) {
  const [hover, setHover] = useState(null)
  const containerRef = useRef(null)
  const total = segments.reduce((s, seg) => s + seg.value, 0)

  if (total === 0) {
    return <div className="chart-empty">No data for this period.</div>
  }

  // Wedges are drawn edge-to-edge with no gap between them — a single 100% segment renders as
  // a plain full circle (no arc math involved), and multiple segments meet exactly with no seam.
  const visible = segments.filter((s) => s.value > 0)
  const singleSegment = visible.length === 1

  let cursor = 0
  const wedges = visible.map((seg) => {
    const sweep = (seg.value / total) * 360
    const startDeg = cursor
    const endDeg = cursor + sweep
    cursor += sweep
    return { ...seg, startDeg, endDeg: Math.max(endDeg, startDeg + 0.01) }
  })

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label="Pie chart">
        {singleSegment ? (
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill={wedges[0].color}
            onMouseMove={(e) => {
              const rect = containerRef.current.getBoundingClientRect()
              setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: wedges[0].label, value: wedges[0].value })
            }}
            onMouseLeave={() => setHover(null)}
          />
        ) : (
          wedges.map((seg) => (
            <path
              key={seg.label}
              className="chart-donut-seg"
              d={wedgePath(CX, CY, R, seg.startDeg, seg.endDeg)}
              fill={seg.color}
              onMouseMove={(e) => {
                const rect = containerRef.current.getBoundingClientRect()
                setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, label: seg.label, value: seg.value })
              }}
              onMouseLeave={() => setHover(null)}
            />
          ))
        )}
      </svg>

      <div className="chart-legend" style={{ flexDirection: 'column', marginTop: 0 }}>
        {segments.map((seg) => (
          <div className="chart-legend-item" key={seg.label}>
            <span className="chart-legend-swatch" style={{ background: seg.color }}></span>
            {seg.label}: {formatCompact(seg.value)} ({Math.round((seg.value / total) * 100)}%)
          </div>
        ))}
      </div>

      {hover && (
        <div className="chart-tooltip" style={{ left: hover.x + 12, top: hover.y - 10 }}>
          <div className="chart-tooltip-value">
            {formatCompact(hover.value)} ({Math.round((hover.value / total) * 100)}%)
          </div>
          <div className="chart-tooltip-label">{hover.label}</div>
        </div>
      )}
    </div>
  )
}
