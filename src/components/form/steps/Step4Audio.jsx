import RadioGroup from '../ui/RadioGroup'
import AudioScriptField from '../ui/AudioScriptField'

export default function Step4Audio({ data, update, apiUrl, practiceName, locationName }) {
  return (
    <div className="section visible">
      <div className="section-title">Audio & Voicemail Scripts</div>
      <div className="section-sub">
        Set the language and scripts for greetings and voicemails. Leave blank to use defaults.
      </div>

      <div className="field">
        <label>
          Audio Language <span className="req">*</span>
        </label>
        <RadioGroup
          name="lang"
          options={['English', 'Spanish', 'Bilingual']}
          value={data.audioLanguage}
          onChange={(v) => update('audioLanguage', v)}
        />
      </div>

      <AudioScriptField
        title="Welcome Audio"
        name="welcome"
        defaultLabel="Use default welcome audio"
        type={data.welcomeType}
        onTypeChange={(v) => update('welcomeType', v)}
        script={data.welcomeScript}
        onScriptChange={(v) => update('welcomeScript', v)}
        file={data.welcomeFile}
        onFileChange={(v) => update('welcomeFile', v)}
        apiUrl={apiUrl}
        practiceName={practiceName}
        locationName={locationName}
      />

      <AudioScriptField
        title="After-Hours Voicemail Audio"
        name="ahvm"
        defaultLabel="Use default after-hours voicemail"
        type={data.ahvmType}
        onTypeChange={(v) => update('ahvmType', v)}
        script={data.ahvmScript}
        onScriptChange={(v) => update('ahvmScript', v)}
        file={data.ahvmFile}
        onFileChange={(v) => update('ahvmFile', v)}
        apiUrl={apiUrl}
        practiceName={practiceName}
        locationName={locationName}
      />

      <AudioScriptField
        title="Busy Hours Voicemail Audio"
        name="bhvm"
        defaultLabel="Use default busy voicemail"
        type={data.bhvmType}
        onTypeChange={(v) => update('bhvmType', v)}
        script={data.bhvmScript}
        onScriptChange={(v) => update('bhvmScript', v)}
        file={data.bhvmFile}
        onFileChange={(v) => update('bhvmFile', v)}
        apiUrl={apiUrl}
        practiceName={practiceName}
        locationName={locationName}
      />
    </div>
  )
}
