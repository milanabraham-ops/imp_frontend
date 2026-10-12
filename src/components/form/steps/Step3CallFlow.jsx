import RadioGroup from '../ui/RadioGroup'
import { PHONE_TREE_OPTIONS } from '../../../data/options'

export default function Step3CallFlow({ data, update }) {
  return (
    <div className="section visible">
      <div className="section-title">Phone Tree & Call Flow</div>
      <div className="section-sub">Define how incoming calls are routed during and after business hours.</div>

      <div className="field">
        <label>
          Business Hours Phone Tree <span className="req">*</span>
        </label>
        <RadioGroup
          name="tree"
          options={PHONE_TREE_OPTIONS}
          value={data.phoneTree}
          onChange={(v) => update('phoneTree', v)}
        />
      </div>
      <div className="field">
        <label>
          Business Hours Call Flow Detail <span className="req">*</span>
        </label>
        <textarea
          value={data.callFlow}
          placeholder="Describe the call flow for each number. If multiple numbers have different flows, explain each separately."
          onChange={(e) => update('callFlow', e.target.value)}
        />
      </div>
      <div className="info-box">
        <i className="ti ti-info-circle"></i>After-hours calls are forwarded to an offline phone tree with a
        default voicemail covering all agents, unless a custom condition is specified below.
      </div>
      <div className="field">
        <label>After-Hours Phone Tree</label>
        <RadioGroup
          name="afterHoursTree"
          options={PHONE_TREE_OPTIONS}
          value={data.afterHoursPhoneTree}
          onChange={(v) => update('afterHoursPhoneTree', v)}
        />
      </div>
      <div className="field">
        <label>After-Hours Condition (optional)</label>
        <textarea
          value={data.afterHoursCondition}
          placeholder="Describe any custom after-hours routing. Leave blank to use the default voicemail."
          onChange={(e) => update('afterHoursCondition', e.target.value)}
        />
      </div>
    </div>
  )
}
