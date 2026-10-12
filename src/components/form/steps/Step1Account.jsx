import RadioGroup from '../ui/RadioGroup'
import ComboBoxInput from '../ui/ComboBoxInput'
import { MARKETS, TIMEZONES } from '../../../data/options'

export default function Step1Account({ data, update }) {
  const onMarket = (market) => {
    if (market === 'Dental') {
      update('market', market)
    } else {
      update({ market, environment: 'Voicestack' })
    }
  }

  return (
    <div className="section visible">
      <div className="section-title">Account & Location</div>
      <div className="section-sub">Basic information about the client and this specific location.</div>

      <div className="g2">
        <div className="field">
          <label>
            Client / Account Name <span className="req">*</span>
          </label>
          <input
            type="text"
            value={data.clientName}
            placeholder="e.g. Bright Smiles Dental"
            onChange={(e) => update('clientName', e.target.value)}
          />
        </div>
        <div className="field">
          <label>
            Location Name <span className="req">*</span>
          </label>
          <input
            type="text"
            value={data.locationName}
            placeholder="e.g. Downtown Branch"
            onChange={(e) => update('locationName', e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label>
          Is this location billable? <span className="req">*</span>
        </label>
        <RadioGroup
          name="locationBillable"
          options={['Billable', 'Non-Billable']}
          value={data.locationBillable}
          onChange={(v) => update('locationBillable', v)}
          row
        />
      </div>

      <div className="g2">
        <div className="field">
          <label>
            Market <span className="req">*</span>
          </label>
          <RadioGroup name="market" options={MARKETS} value={data.market} onChange={onMarket} />
        </div>
        <div className="field">
          <label>
            Environment <span className="req">*</span>
          </label>
          {data.market === 'Dental' ? (
            <RadioGroup
              name="env"
              options={['CS Voicestack', 'Voicestack']}
              value={data.environment}
              onChange={(v) => update('environment', v)}
            />
          ) : (
            <>
              <div className="auto-tag">
                <i className="ti ti-check" style={{ fontSize: 14 }}></i> Voicestack (auto-selected)
              </div>
              <div className="hint" style={{ marginTop: 6 }}>
                Only Dental accounts can select CS Voicestack.
              </div>
            </>
          )}
        </div>
      </div>

      <div className="field">
        <label>Billing Plan</label>
        <input
          type="text"
          value={data.billingPlan}
          placeholder="e.g. Professional, Enterprise, Starter…"
          onChange={(e) => update('billingPlan', e.target.value)}
        />
      </div>

      <div className="g2">
        <div className="field">
          <label>
            Implementation POC <span className="req">*</span>
          </label>
          <input
            type="text"
            value={data.poc}
            placeholder="e.g. Sarah Johnson"
            onChange={(e) => update('poc', e.target.value)}
          />
        </div>
        <div className="field">
          <label>
            Timezone <span className="req">*</span>
          </label>
          <ComboBoxInput
            value={data.timezone}
            onChange={(value) => update('timezone', value)}
            options={TIMEZONES}
            placeholder="e.g. Eastern Standard Time"
          />
        </div>
      </div>

      <div className="field">
        <label>Desired Go-Live Date</label>
        <input type="date" value={data.goLiveDate} onChange={(e) => update('goLiveDate', e.target.value)} />
      </div>
    </div>
  )
}
