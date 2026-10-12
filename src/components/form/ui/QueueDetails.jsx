import CheckboxGroup from './CheckboxGroup'
import AudioSourceInput from './AudioSourceInput'
import SelectInput from '../../common/SelectInput'
import { QUEUE_ANNOUNCEMENTS, QUEUE_EXIT_TYPES } from '../../../data/options'

export default function QueueDetails({ detail, apiUrl, practiceName, locationName, updateDetail, disabled = false }) {
  return (
    <>
      <div className="g2">
        <div className="field">
          <label>Max Queue Duration (s)</label>
          <input
            type="number"
            value={detail.maxDuration}
            placeholder="e.g. 300"
            disabled={disabled}
            onChange={(e) => updateDetail('maxDuration', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Max Callers in Queue</label>
          <input
            type="number"
            value={detail.maxCallers}
            placeholder="e.g. 10"
            disabled={disabled}
            onChange={(e) => updateDetail('maxCallers', e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>Queue Announcement</label>
        <CheckboxGroup
          options={QUEUE_ANNOUNCEMENTS}
          value={detail.announcement}
          onChange={(v) => updateDetail('announcement', v)}
          disabled={disabled}
        />
      </div>
      <div className="g2">
        <div className="field">
          <label>Queue Exit Type</label>
          <SelectInput
            value={detail.exitType}
            onChange={(v) => updateDetail('exitType', v)}
            options={QUEUE_EXIT_TYPES}
            disabled={disabled}
          />
        </div>
        <div className="field">
          <label>Key to Activate Exit</label>
          <input
            type="text"
            value={detail.exitKey}
            placeholder="e.g. 1"
            disabled={disabled}
            onChange={(e) => updateDetail('exitKey', e.target.value)}
          />
        </div>
      </div>
      <div className="field">
        <label>Exit Voicemail / Call-Back Audio</label>
      </div>
      <AudioSourceInput
        script={detail.exitScript}
        onScriptChange={(v) => updateDetail('exitScript', v)}
        file={detail.exitFile}
        onFileChange={(v) => updateDetail('exitFile', v)}
        apiUrl={apiUrl}
        practiceName={practiceName}
        locationName={locationName}
        scriptPlaceholder="Script, filename, or audio link if audio already exists…"
        disabled={disabled}
      />
    </>
  )
}
