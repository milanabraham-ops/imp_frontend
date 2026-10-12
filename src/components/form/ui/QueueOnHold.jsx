import AudioScriptField from './AudioScriptField'

export default function QueueOnHold({ prefix, detail, apiUrl, practiceName, locationName, updateDetail, disabled = false }) {
  return (
    <AudioScriptField
      title="On-Hold Audio"
      name={`${prefix}Onhold`}
      customLabel="Custom on-hold audio"
      defaultLabel="Default phone ringing sound"
      type={detail.onholdType}
      onTypeChange={(v) => updateDetail('onholdType', v)}
      script={detail.onholdScript}
      onScriptChange={(v) => updateDetail('onholdScript', v)}
      file={detail.onholdFile}
      onFileChange={(v) => updateDetail('onholdFile', v)}
      apiUrl={apiUrl}
      practiceName={practiceName}
      locationName={locationName}
      showHeader={false}
      scriptPlaceholder="Type the on-hold audio script, or paste an audio link…"
      disabled={disabled}
    />
  )
}
