import { useEffect } from 'react'
import { REVIEW_SECTIONS, RING_GROUP_FIELDS } from '../reviewSections'
import ReviewFieldValue from '../ReviewFieldValue'

function ReviewSection({ section, goToStep }) {
  return (
    <div className="review-section">
      <div className="review-section-header">
        <h3>{section.title}</h3>
        <button type="button" className="btn-sm" onClick={() => goToStep(section.step)}>
          <i className="ti ti-pencil"></i> Edit
        </button>
      </div>
      <div className="review-list">
        {section.fields.map((f) => {
          const value = f.get(section.data)
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

function defaultPocMessage(clientName, locationName) {
  return `<users/all> Hi Team, I have filled in the implementation requirement gathering form for ${clientName || 'this account'} - ${locationName || 'this location'}. Please do proceed with the configurations. Please reach out in case of any questions.`
}

export default function Step9Review({ data, update, goToStep, isEditMode }) {
  // Ring Groups & Call Queues is step 4 but isn't in REVIEW_SECTIONS since it's a repeatable
  // list rather than a fixed set of fields — rendered here between Audio (step 3) and
  // Devices (step 5) to match the wizard's own step order.
  const before = REVIEW_SECTIONS.slice(0, 4)
  const after = REVIEW_SECTIONS.slice(4)

  // Seeds the editable message once the account/location are known and nothing's been typed
  // yet — never overwrites something the POC already wrote or edited.
  useEffect(() => {
    if (isEditMode || data.pocMessage) return
    update('pocMessage', defaultPocMessage(data.clientName, data.locationName))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, data.clientName, data.locationName])

  return (
    <div className="section visible">
      <div className="section-title">Review & Submit</div>
      <div className="section-sub">Double-check everything below. Click Edit on any section to jump back and make changes.</div>

      {before.map((section) => (
        <ReviewSection key={section.title} section={{ ...section, data }} goToStep={goToStep} />
      ))}

      <div className="review-section">
        <div className="review-section-header">
          <h3>Ring Groups & Call Queues</h3>
          <button type="button" className="btn-sm" onClick={() => goToStep(4)}>
            <i className="ti ti-pencil"></i> Edit
          </button>
        </div>
        {data.ringGroups.map((group, i) => (
          <div className="review-list" key={i}>
            <div className="review-row">
              <span className="review-label" style={{ fontWeight: 600 }}>
                Ring Group {i + 1}
              </span>
              <span className="review-value"></span>
            </div>
            {RING_GROUP_FIELDS.map((f) => {
              const value = f.get(group)
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
        ))}
      </div>

      {after.map((section) => (
        <ReviewSection key={section.title} section={{ ...section, data }} goToStep={goToStep} />
      ))}

      {!isEditMode && (
        <div className="review-section">
          <div className="review-section-header">
            <h3>Message to Your Team</h3>
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Posted to your implementation Chat space when you submit — edit as needed</label>
            <textarea
              style={{ minHeight: 100 }}
              value={data.pocMessage}
              onChange={(e) => update('pocMessage', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
