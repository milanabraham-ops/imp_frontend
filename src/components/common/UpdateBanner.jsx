import { useReleaseNotesCheck } from '../../hooks/useReleaseNotesCheck'
import { useTheme } from '../../context/ThemeContext'

export default function UpdateBanner() {
  const { theme } = useTheme()
  const { available, dismiss, reload } = useReleaseNotesCheck()
  if (!available) return null

  return (
    <div className="update-banner" data-theme={theme} role="status">
      <i className="ti ti-sparkles"></i>
      <div className="update-banner-body">
        <strong>What's new</strong>
        <ul>
          {available.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="update-banner-actions">
        <button type="button" className="update-banner-reload" onClick={reload}>
          Reload
        </button>
        <button type="button" className="update-banner-dismiss" aria-label="Dismiss" onClick={dismiss}>
          <i className="ti ti-x"></i>
        </button>
      </div>
    </div>
  )
}
