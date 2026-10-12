import { useRef, useState } from 'react'

const SIZE = 260
const CX = SIZE / 2
const CY = SIZE / 2
const MAX_R = 90
const RINGS = 4

function pointAt(index, count, value) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2
  const r = (value / 100) * MAX_R
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

function labelPointAt(index, count) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2
  const r = MAX_R + 18
  return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) }
}

// Multi-axis comparison. Two series ("You" vs "Team Average") is the emphasis pattern — one
// hue for the point, gray for context. Three+ series (admin's top specialists) uses the
// validated categorical slots, capped at 3 (the all-pairs-safe count for this palette).
export default function RadarChart({ axes, series, colors, legendLabels }) {
  const [hover, setHover] = useState(null)
  const containerRef = useRef(null)
  const count = axes.length

  const rings = Array.from({ length: RINGS }, (_, i) => ((i + 1) / RINGS) * 100)

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height={SIZE} role="img" aria-label="Radar comparison chart">
        {rings.map((ringValue) => (
          <polygon
            key={ringValue}
            className="chart-radar-grid"
            points={axes.map((_, i) => { const p = pointAt(i, count, ringValue); return `${p.x},${p.y}` }).join(' ')}
          />
        ))}

        {axes.map((axis, i) => {
          const outer = pointAt(i, count, 100)
          const label = labelPointAt(i, count)
          return (
            <g key={axis}>
              <line x1={CX} y1={CY} x2={outer.x} y2={outer.y} className="chart-radar-grid" />
              <text
                x={label.x}
                y={label.y}
                textAnchor={label.x > CX + 4 ? 'start' : label.x < CX - 4 ? 'end' : 'middle'}
                className="chart-radar-axis-label"
              >
                {axis}
              </text>
            </g>
          )
        })}

        {series.map((s, si) => {
          const color = colors[si]
          const pts = s.values.map((v, i) => pointAt(i, count, v))
          return (
            <g key={s.name}>
              <polygon
                className="chart-radar-poly"
                points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill={color}
                stroke={color}
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  className="chart-radar-dot"
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={color}
                  onMouseMove={(e) => {
                    const rect = containerRef.current.getBoundingClientRect()
                    setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, series: s.name, axis: axes[i], value: s.values[i] })
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </g>
          )
        })}
      </svg>

      <div className="chart-legend">
        {series.map((s, i) => (
          <div className="chart-legend-item" key={s.name}>
            <span className="chart-legend-swatch" style={{ background: colors[i] }}></span>
            {(legendLabels && legendLabels[i]) || s.name}
          </div>
        ))}
      </div>

      {hover && (
        <div className="chart-tooltip" style={{ left: hover.x + 12, top: hover.y - 10 }}>
          <div className="chart-tooltip-value">{hover.value}</div>
          <div className="chart-tooltip-label">
            {hover.series}: {hover.axis}
          </div>
        </div>
      )}
    </div>
  )
}
