import { REVIEW_SECTIONS, STATUS_SECTION } from '../form/reviewSections'
import ReviewFieldValue from '../form/ReviewFieldValue'

function Section({ section, submission }) {
  return (
    <div className="review-section">
      <div className="review-section-header">
        <h3>{section.title}</h3>
      </div>
      <div className="review-list">
        {section.fields.map((f) => {
          const value = f.get(submission)
          return (
            <div className="review-row" key={f.label}>
              <span className="review-label">{f.label}</span>
              <span className={`review-value${value ? '' : ' empty'}`}>
                <ReviewFieldValue value={value} />
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SubmissionDetailSections({ submission }) {
  return (
    <>
      <Section section={STATUS_SECTION} submission={submission} />
      {REVIEW_SECTIONS.map((section) => (
        <Section key={section.title} section={section} submission={submission} />
      ))}
    </>
  )
}
