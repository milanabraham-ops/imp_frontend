import SelectInput from '../../common/SelectInput'
import { CARD_ASSIGNMENT_OPTIONS } from '../../../data/options'
import PhoneInfoSheetSection from '../../dashboard/PhoneInfoSheetSection'

export default function Step6Devices({ data, update }) {
  return (
    <div className="section visible">
      <div className="section-title">Devices, Agents & Access</div>
      <div className="section-sub">Configure device keys, hot desking, admin access, and card rules.</div>

      <PhoneInfoSheetSection
        submissionId={data._id}
        devices={data.phoneSheetDevices || []}
        agents={data.phoneSheetAgents || []}
        onDevicesChange={(devices) => update('phoneSheetDevices', devices)}
        onAgentsChange={(agents) => update('phoneSheetAgents', agents)}
      />
      <div className="divider"></div>

      <div className="field">
        <label>
          Device Line Keys <span className="req">*</span>
        </label>
        <textarea
          value={data.lineKeys}
          placeholder="Specify line key configuration. Type NIL to use the default (3 park keys)."
          onChange={(e) => update('lineKeys', e.target.value)}
        />
        <div className="hint">By default, 3 park keys are added. Mention NIL if the default setup is fine.</div>
      </div>
      <div className="field">
        <label>
          Hot Desking Users <span className="req">*</span>
        </label>
        <textarea
          value={data.hotDesking}
          placeholder="List agents requiring hot desking. Type NIL if none."
          onChange={(e) => update('hotDesking', e.target.value)}
        />
      </div>

      <div className="divider"></div>
      <div className="g2">
        <div className="field">
          <label>
            Admin Users <span className="req">*</span>
          </label>
          <textarea
            style={{ minHeight: 75 }}
            value={data.adminUsers}
            placeholder="List admin users. Type NIL if not required."
            onChange={(e) => update('adminUsers', e.target.value)}
          />
        </div>
        <div className="field">
          <label>
            AI Usage Limit <span className="req">*</span>
          </label>
          <input
            type="text"
            value={data.aiLimit}
            placeholder="UNLIMITED or specify a limit"
            onChange={(e) => update('aiLimit', e.target.value)}
          />
          <div className="hint">Default is UNLIMITED.</div>
        </div>
      </div>

      <div className="divider"></div>
      <div className="field">
        <label>
          Card Assignment Rules <span className="req">*</span>
        </label>
        <SelectInput value={data.cardAssignment} onChange={(v) => update('cardAssignment', v)} options={CARD_ASSIGNMENT_OPTIONS} />
      </div>
      <div className="field">
        <label>
          Card Visibility (Agent Names) <span className="req">*</span>
        </label>
        <textarea
          value={data.cardVisibility}
          placeholder="List the agent names who should have card visibility…"
          onChange={(e) => update('cardVisibility', e.target.value)}
        />
      </div>
    </div>
  )
}
