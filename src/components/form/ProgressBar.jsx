import { Fragment } from 'react'
import { STEP_LABELS, TOTAL_STEPS } from '../../data/options'

export default function ProgressBar({ current, onStepClick }) {
  return (
    <div className="progress-wrap">
      <div className="progress-bar">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <Fragment key={i}>
            <button
              type="button"
              className={`step-dot${i < current ? ' done' : i === current ? ' active' : ''}`}
              onClick={() => onStepClick(i)}
              aria-label={`Go to step ${i + 1}: ${STEP_LABELS[i]}`}
            >
              {i < current ? <i className="ti ti-check"></i> : i + 1}
            </button>
            {i < TOTAL_STEPS - 1 && <div className={`step-line${i < current ? ' done' : ''}`}></div>}
          </Fragment>
        ))}
      </div>
      <div className="step-labels">
        {STEP_LABELS.map((label, i) => (
          <span key={label} className={i === current ? 'active' : ''} onClick={() => onStepClick(i)}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
