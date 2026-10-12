import ComboBoxInput from '../ui/ComboBoxInput'
import { usePmsDocs } from '../../../hooks/usePmsDocs'

export default function Step8LinksPms({ data, update }) {
  const isCsVoicestack = data.environment === 'CS Voicestack'
  const { names: pmsOptions, findDoc } = usePmsDocs()
  // An admin can register a PMS by name alone, before its guide doc is written — only show the
  // info box once there's an actual link to send someone to.
  const foundDoc = findDoc(data.pms)
  const pmsDoc = foundDoc?.url ? foundDoc : null

  return (
    <div className="section visible">
      <div className="section-title">Links, Attachments & PMS</div>
      <div className="section-sub">Share required documents and configure the PMS integration.</div>

      <div className="field">
        <label>
          Phone Information Sheet Link <span className="req">*</span>
        </label>
        <input
          type="url"
          value={data.phoneSheetLink}
          placeholder="https://…"
          onChange={(e) => update('phoneSheetLink', e.target.value)}
        />
      </div>
      <div className="field">
        <label>
          Questionnaire Link <span className="req">*</span>
        </label>
        <input
          type="url"
          value={data.questionnaireLink}
          placeholder="https://…"
          onChange={(e) => update('questionnaireLink', e.target.value)}
        />
      </div>
      <div className="field">
        <label>Additional Notes</label>
        <textarea
          value={data.additionalNotes}
          placeholder="Any other information the implementation team should know…"
          onChange={(e) => update('additionalNotes', e.target.value)}
        />
      </div>

      <div className="divider"></div>
      <div className="subsection-title">PMS Integration</div>
      <div className="field">
        <label>PMS System</label>
        <ComboBoxInput
          value={data.pms}
          onChange={(value) => update('pms', value)}
          options={pmsOptions}
          placeholder="e.g. CareStack"
          disabled={isCsVoicestack}
        />
        {isCsVoicestack && <div className="hint">CS Voicestack accounts are always connected to CareStack.</div>}
      </div>

      {pmsDoc && (
        <div className="info-box">
          <i className="ti ti-file-text"></i>
          <span>
            Check the <strong>{pmsDoc.name}</strong> integration guide for what the integration team needs from this
            practice, then share whatever non-sensitive details you can below.{' '}
            <a href={pmsDoc.url} target="_blank" rel="noopener noreferrer">
              View guide <i className="ti ti-external-link"></i>
            </a>
          </span>
        </div>
      )}

      <div className="field">
        <label>Integration Notes</label>
        <textarea
          value={data.serverAccess}
          placeholder="Any non-sensitive notes for the PMS integration. Do not enter passwords or credentials here…"
          onChange={(e) => update('serverAccess', e.target.value)}
        />
        <div className="hint">
          Keep this to non-sensitive info, credentials shouldn't be entered here
          {pmsDoc ? ', the guide above explains how those should be shared.' : '.'}
        </div>
      </div>
    </div>
  )
}
