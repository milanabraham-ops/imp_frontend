import RadioGroup from './RadioGroup'
import AudioSourceInput from './AudioSourceInput'

// Shared "Custom vs Default" audio field — used directly for Step 4's Welcome/After-Hours/Busy
// voicemail fields (with its own divider + subsection header), and via QueueOnHold for the
// On-Hold Audio field inside each Call Queue Type (with showHeader off, since it already sits
// inside that queue type's own subsection).
export default function AudioScriptField({
  title,
  name,
  defaultLabel,
  customLabel = 'Custom script / audio',
  type,
  onTypeChange,
  script,
  onScriptChange,
  file,
  onFileChange,
  apiUrl,
  practiceName,
  locationName,
  showHeader = true,
  scriptPlaceholder,
  disabled = false,
}) {
  return (
    <>
      {showHeader && (
        <>
          <div className="divider"></div>
          <div className="subsection-title">{title}</div>
        </>
      )}
      <div className="field">
        {!showHeader && <label>{title}</label>}
        <RadioGroup
          name={name}
          options={[
            { value: 'Custom', label: customLabel },
            { value: 'Default', label: defaultLabel },
          ]}
          value={type}
          onChange={onTypeChange}
          disabled={disabled}
        />
      </div>
      {type === 'Custom' && (
        <AudioSourceInput
          script={script}
          onScriptChange={onScriptChange}
          file={file}
          onFileChange={onFileChange}
          apiUrl={apiUrl}
          practiceName={practiceName}
          locationName={locationName}
          scriptPlaceholder={scriptPlaceholder || `Type your ${title.toLowerCase()} script, or paste an audio link…`}
          disabled={disabled}
        />
      )}
    </>
  )
}
