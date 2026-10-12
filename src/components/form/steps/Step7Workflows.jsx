import RadioGroup from '../ui/RadioGroup'
import CheckboxGroup from '../ui/CheckboxGroup'
import { WORKFLOW_ACTIONS } from '../../../data/options'

export default function Step7Workflows({ data, update }) {
  return (
    <div className="section visible">
      <div className="section-title">Workflows, DNI & SMS/Fax</div>
      <div className="section-sub">Set up automated workflows, campaign tracking, and messaging services.</div>

      <div className="field">
        <label>
          Automated Workflows <span className="req">*</span>
        </label>
        <RadioGroup
          name="workflow"
          options={[
            { value: 'Yes', label: 'Yes, configure workflows' },
            { value: 'No', label: 'No' },
          ]}
          value={data.workflow}
          onChange={(v) => update('workflow', v)}
        />
      </div>
      {data.workflow === 'Yes' && (
        <div className="cond show">
          <div className="field">
            <label>Workflow Condition</label>
            <textarea
              value={data.workflowCondition}
              placeholder="Describe the trigger condition…"
              onChange={(e) => update('workflowCondition', e.target.value)}
            />
          </div>
          <div className="field">
            <label>Workflow Action</label>
            <CheckboxGroup
              options={WORKFLOW_ACTIONS}
              value={data.workflowAction}
              onChange={(v) => update('workflowAction', v)}
            />
          </div>
          <div className="field">
            <label>SMS Content per Workflow</label>
            <textarea
              value={data.smsContent}
              placeholder="Mention SMS content for each workflow action…"
              onChange={(e) => update('smsContent', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="divider"></div>
      <div className="field">
        <label>
          DNI Campaigns <span className="req">*</span>
        </label>
        <RadioGroup
          name="dni"
          options={[
            { value: 'Yes', label: 'Yes, provide campaign details' },
            { value: 'No', label: 'No' },
          ]}
          value={data.dni}
          onChange={(v) => update('dni', v)}
        />
      </div>
      {data.dni === 'Yes' && (
        <div className="cond show">
          <div className="field">
            <label>Campaign Details & Google Ads Credentials</label>
            <textarea
              value={data.dniCampaigns}
              placeholder="List campaigns and provide Google Ads credentials…"
              onChange={(e) => update('dniCampaigns', e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="divider"></div>
      <div className="g2">
        <div className="field">
          <label>
            SMS Numbers <span className="req">*</span>
          </label>
          <textarea
            style={{ minHeight: 75 }}
            value={data.smsNumbers}
            placeholder="List SMS numbers. Type NIL if not required."
            onChange={(e) => update('smsNumbers', e.target.value)}
          />
        </div>
        <div className="field">
          <label>
            Users with SMS Access <span className="req">*</span>
          </label>
          <textarea
            style={{ minHeight: 75 }}
            value={data.smsUsers}
            placeholder="List users. Type NIL if not required."
            onChange={(e) => update('smsUsers', e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>
          Text Unification <span className="req">*</span>
        </label>
        <RadioGroup
          name="textunif"
          options={['Yes', 'No']}
          value={data.textUnification}
          onChange={(v) => update('textUnification', v)}
          row
        />
        <div className="hint">Enabled by default when Environment is CS Voicestack.</div>
      </div>
      <div className="g2">
        <div className="field">
          <label>
            Fax Numbers <span className="req">*</span>
          </label>
          <textarea
            style={{ minHeight: 75 }}
            value={data.faxNumbers}
            placeholder="List fax numbers. Type NIL if not required."
            onChange={(e) => update('faxNumbers', e.target.value)}
          />
        </div>
        <div className="field">
          <label>
            Users with Fax Access <span className="req">*</span>
          </label>
          <textarea
            style={{ minHeight: 75 }}
            value={data.faxUsers}
            placeholder="List users. Type NIL if not required."
            onChange={(e) => update('faxUsers', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
