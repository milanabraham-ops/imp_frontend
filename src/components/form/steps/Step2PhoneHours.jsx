import CheckboxGroup from '../ui/CheckboxGroup'
import { WEEKDAYS, ALL_DAYS } from '../../../data/options'

export default function Step2PhoneHours({ data, update }) {
  const monFriChecked = WEEKDAYS.every((d) => data.businessDays.includes(d))

  const setMonFri = (checked) => {
    const rest = data.businessDays.filter((d) => !WEEKDAYS.includes(d))
    update('businessDays', checked ? [...rest, ...WEEKDAYS] : rest)
  }

  return (
    <div className="section visible">
      <div className="section-title">Phone Numbers & Hours</div>
      <div className="section-sub">Specify the numbers being configured and the operating schedule.</div>

      <div className="field">
        <label>
          List of Phone Numbers <span className="req">*</span>
        </label>
        <textarea
          value={data.phoneNumbers}
          placeholder={'1234567890 - Main Line - Billable, 0987654321 - Internal - Non-Billable\nFormat: number - source name - Billable/Non-Billable, comma-separated'}
          onChange={(e) => update('phoneNumbers', e.target.value)}
        />
        <div className="hint">
          Include the source name for each number and specify whether it is Billable or Non-Billable. Separate multiple entries with a comma.
        </div>
      </div>

      <div className="divider"></div>

      <div className="field">
        <label>
          Business Days <span className="req">*</span>
        </label>
        <label className="monfri-label">
          <input type="checkbox" checked={monFriChecked} onChange={(e) => setMonFri(e.target.checked)} />
          <i className="ti ti-calendar-week"></i> Mon – Fri (select all weekdays)
        </label>
        <CheckboxGroup
          options={ALL_DAYS}
          value={data.businessDays}
          onChange={(v) => update('businessDays', v)}
        />
      </div>

      <div className="field">
        <label>
          Business Hours <span className="req">*</span>
        </label>
        <input
          type="text"
          value={data.businessHours}
          placeholder="e.g. 8:00 AM – 6:00 PM"
          onChange={(e) => update('businessHours', e.target.value)}
        />
      </div>

      <div className="divider"></div>

      <div className="field">
        <label>After-Hours Days</label>
        <CheckboxGroup
          options={ALL_DAYS}
          value={data.afterHoursDays}
          onChange={(v) => update('afterHoursDays', v)}
        />
      </div>

      <div className="field">
        <label>After-Hours Timing</label>
        <input
          type="text"
          value={data.afterHoursTiming}
          placeholder="e.g. 6:00 PM – 8:00 AM"
          onChange={(e) => update('afterHoursTiming', e.target.value)}
        />
      </div>

      <div className="divider"></div>

      <div className="field">
        <label>Custom Holidays</label>
        <textarea
          value={data.customHolidays}
          placeholder={"e.g. Jan 1 – New Year's Day, Jul 4 – Independence Day, Dec 25 – Christmas\nList any custom holiday closures, one per line or comma-separated."}
          onChange={(e) => update('customHolidays', e.target.value)}
        />
      </div>
    </div>
  )
}
