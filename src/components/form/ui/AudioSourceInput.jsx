import AudioUploadInput from './AudioUploadInput'

export default function AudioSourceInput({
  script,
  onScriptChange,
  file,
  onFileChange,
  apiUrl,
  practiceName,
  locationName,
  scriptPlaceholder = 'Type a script, or paste an audio link…',
  disabled = false,
}) {
  return (
    <div className="cond show">
      <div className="field">
        <label>Script or Audio Link</label>
        <textarea
          value={script}
          placeholder={scriptPlaceholder}
          disabled={disabled}
          onChange={(e) => onScriptChange(e.target.value)}
        />
      </div>
      <AudioUploadInput
        apiUrl={apiUrl}
        value={file}
        onChange={onFileChange}
        practiceName={practiceName}
        locationName={locationName}
        disabled={disabled}
      />
    </div>
  )
}
