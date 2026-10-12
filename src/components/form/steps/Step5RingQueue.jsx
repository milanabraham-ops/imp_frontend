import RadioGroup from '../ui/RadioGroup'
import QueueOnHold from '../ui/QueueOnHold'
import QueueDetails from '../ui/QueueDetails'
import { RING_TYPES, QUEUE_TYPES, emptyRingGroup } from '../../../data/options'

// Fields "Same configuration as previous" copies — everything about a ring group except who's
// actually in it. SVM users has its own separate toggle and isn't part of this set.
const CONFIG_FIELDS = ['ringType', 'ringDuration', 'vmEmail', 'vmEmailAddresses', 'queueType', 'queue', 'autoDial']

function pickConfig(group) {
  const out = {}
  for (const field of CONFIG_FIELDS) out[field] = group[field]
  return out
}

export default function Step5RingQueue({ data, update, apiUrl, practiceName, locationName }) {
  const groups = data.ringGroups

  const updateGroup = (index, patch) => {
    update(
      'ringGroups',
      groups.map((g, i) => (i === index ? { ...g, ...patch } : g)),
    )
  }

  // Editing a shared-config field cascades forward to any later groups flagged "same
  // configuration", so a chain of them all stay in sync with the one group that holds the
  // real values.
  const updateGroupConfig = (index, patch) => {
    let next = groups.map((g, i) => (i === index ? { ...g, ...patch } : g))
    for (let i = index + 1; i < next.length; i++) {
      if (!next[i].sameConfigAsPrevious) break
      next = next.map((g, gi) => (gi === i ? { ...g, ...pickConfig(next[i - 1]) } : g))
    }
    update('ringGroups', next)
  }

  const updateGroupQueueDetail = (index, key) => (field, value) => {
    const group = groups[index]
    updateGroupConfig(index, { queue: { ...group.queue, [key]: { ...group.queue[key], [field]: value } } })
  }

  const setSameConfigAsPrevious = (index, checked) => {
    if (checked) updateGroupConfig(index, { sameConfigAsPrevious: true, ...pickConfig(groups[index - 1]) })
    else updateGroup(index, { sameConfigAsPrevious: false })
  }

  // Editing a group's own SVM cascades forward to any later groups flagged "same as previous",
  // so a chain of them all stay in sync with the one group that actually holds the real value.
  const updateSvmUsers = (index, value) => {
    let next = groups.map((g, i) => (i === index ? { ...g, svmUsers: value } : g))
    for (let i = index + 1; i < next.length; i++) {
      if (!next[i].sameSvmAsPrevious) break
      next = next.map((g, gi) => (gi === i ? { ...g, svmUsers: next[i - 1].svmUsers } : g))
    }
    update('ringGroups', next)
  }

  const setSameSvmAsPrevious = (index, checked) => {
    updateGroup(index, { sameSvmAsPrevious: checked, svmUsers: checked ? groups[index - 1].svmUsers : groups[index].svmUsers })
  }

  const addRingGroup = () => update('ringGroups', [...groups, emptyRingGroup()])
  const removeRingGroup = (index) => update('ringGroups', groups.filter((_, i) => i !== index))

  return (
    <div className="section visible">
      <div className="section-title">Ring Groups & Call Queues</div>
      <div className="section-sub">Configure how agents receive calls and how callers wait in queue.</div>

      {groups.map((group, i) => {
        const activeQueueKey = QUEUE_TYPES.find((q) => q.value === group.queueType)?.key
        const sharedConfig = group.sameConfigAsPrevious

        return (
          <div className="ring-group-card" key={i}>
            <div className="ring-group-header">
              <h3>Ring Group {i + 1}</h3>
              {groups.length > 1 && (
                <button type="button" className="btn-sm danger" onClick={() => removeRingGroup(i)}>
                  <i className="ti ti-trash"></i> Remove
                </button>
              )}
            </div>

            {i > 0 && (
              <label className="check-inline">
                <input
                  type="checkbox"
                  checked={sharedConfig}
                  onChange={(e) => setSameConfigAsPrevious(i, e.target.checked)}
                />
                Same configuration as Ring Group {i} (only Ring Group Users can differ)
              </label>
            )}

            <div className="subsection-title" style={{ marginTop: 0 }}>
              Ring Group
            </div>
            <div className="field">
              <label>
                Users / Extensions in Ring Group <span className="req">*</span>
              </label>
              <textarea
                style={{ minHeight: 75 }}
                value={group.ringGroupUsers}
                placeholder="e.g. John - ext 101, Mary - ext 102"
                onChange={(e) => updateGroup(i, { ringGroupUsers: e.target.value })}
              />
            </div>

            {sharedConfig && (
              <div className="info-box">
                <i className="ti ti-info-circle"></i>
                Pre-filled from Ring Group {i}. Edit any field below and it'll carry forward to later ring groups also set to "Same configuration".
              </div>
            )}
            <div className="g2">
              <div className="field">
                <label>
                  Ring Type <span className="req">*</span>
                </label>
                <RadioGroup
                  name={`ringtype-${i}`}
                  options={RING_TYPES}
                  value={group.ringType}
                  onChange={(v) => updateGroupConfig(i, { ringType: v })}
                />
              </div>
              <div className="field">
                <label>
                  Ring Duration (seconds) <span className="req">*</span>
                </label>
                <input
                  type="number"
                  value={group.ringDuration}
                  placeholder="e.g. 30"
                  onChange={(e) => updateGroupConfig(i, { ringDuration: e.target.value })}
                />
              </div>
            </div>

            <div className="divider"></div>
            <div className="subsection-title">Shared Voicemail Group</div>
            {i > 0 && (
              <label className="check-inline">
                <input
                  type="checkbox"
                  checked={group.sameSvmAsPrevious}
                  onChange={(e) => setSameSvmAsPrevious(i, e.target.checked)}
                />
                Same SVM group as Ring Group {i}
              </label>
            )}
            <div className="field">
              <label>
                Users / Extensions in SVM Group <span className="req">*</span>
              </label>
              <textarea
                value={group.svmUsers}
                placeholder="e.g. John - ext 101, Mary - ext 102, Reception - ext 100"
                onChange={(e) => updateSvmUsers(i, e.target.value)}
              />
            </div>

            <div className="field">
              <label>
                Voicemail to Email Notification <span className="req">*</span>
              </label>
              <RadioGroup
                name={`vmEmail-${i}`}
                options={['Yes', 'No']}
                value={group.vmEmail}
                onChange={(v) => updateGroupConfig(i, { vmEmail: v })}
                row
              />
            </div>
            {group.vmEmail === 'Yes' && (
              <div className="cond show">
                <div className="field">
                  <label>Email addresses for voicemail notifications</label>
                  <textarea
                    value={group.vmEmailAddresses}
                    placeholder={'e.g. reception@clinic.com, manager@clinic.com\nEnter one email per line or comma-separated.'}
                    onChange={(e) => updateGroupConfig(i, { vmEmailAddresses: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="divider"></div>
            <div className="subsection-title">Call Queue</div>
            <div className="field">
              <label>
                Call Queue Type <span className="req">*</span>
              </label>
              <RadioGroup
                name={`qtype-${i}`}
                options={QUEUE_TYPES}
                value={group.queueType}
                onChange={(v) => updateGroupConfig(i, { queueType: v })}
              />
            </div>

            {activeQueueKey === 'exit' && (
              <div className="cond show">
                <QueueOnHold
                  prefix={`rg${i}-exit`}
                  detail={group.queue.exit}
                  apiUrl={apiUrl}
                  practiceName={practiceName}
                  locationName={locationName}
                  updateDetail={updateGroupQueueDetail(i, 'exit')}
                />
              </div>
            )}

            {activeQueueKey === 'dq' && (
              <div className="cond show">
                <QueueOnHold
                  prefix={`rg${i}-dq`}
                  detail={group.queue.dq}
                  apiUrl={apiUrl}
                  practiceName={practiceName}
                  locationName={locationName}
                  updateDetail={updateGroupQueueDetail(i, 'dq')}
                />
                <QueueDetails
                  detail={group.queue.dq}
                  apiUrl={apiUrl}
                  practiceName={practiceName}
                  locationName={locationName}
                  updateDetail={updateGroupQueueDetail(i, 'dq')}
                />
              </div>
            )}

            {activeQueueKey === 'qo' && (
              <div className="cond show">
                <QueueOnHold
                  prefix={`rg${i}-qo`}
                  detail={group.queue.qo}
                  apiUrl={apiUrl}
                  practiceName={practiceName}
                  locationName={locationName}
                  updateDetail={updateGroupQueueDetail(i, 'qo')}
                />
                <QueueDetails
                  detail={group.queue.qo}
                  apiUrl={apiUrl}
                  practiceName={practiceName}
                  locationName={locationName}
                  updateDetail={updateGroupQueueDetail(i, 'qo')}
                />
                <div className="field">
                  <label>
                    Auto-Dial <span className="req">*</span>
                  </label>
                  <RadioGroup
                    name={`autoDial-${i}`}
                    options={['Yes', 'No']}
                    value={group.autoDial}
                    onChange={(v) => updateGroupConfig(i, { autoDial: v })}
                    row
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}

      <button type="button" className="btn" onClick={addRingGroup}>
        <i className="ti ti-plus"></i> Add Ring Group/Call Queue
      </button>
    </div>
  )
}
