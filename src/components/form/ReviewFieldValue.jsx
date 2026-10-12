import { useAuth, API_URL } from '../../context/AuthContext'

// Mirrors AudioUploadInput.jsx's own link logic exactly — Drive's link needs nothing extra;
// the GridFS dev-fallback stream route requires auth, and <a href> can't send a header, so the
// current access token rides along as a query param instead (see requireAuthStreaming.js).
function fileHref(file, token) {
  return file.driveUrl || `${API_URL}/uploads/${file.fileId}?token=${encodeURIComponent(token || '')}`
}

// Shared by every place a submission's fields are displayed read-only (Step9Review, the
// Dashboard/Specialist/QA "View Details" modal, QA's review modal) — reviewSections.js stays
// plain JS and returns { text, file } for an audio field that has an actual uploaded file
// attached, instead of a plain string; this is the one place that turns that into a real link,
// so all three views get it identically rather than three separate copies of the same logic.
export default function ReviewFieldValue({ value }) {
  const { token } = useAuth()

  if (value && typeof value === 'object' && value.file) {
    return (
      <>
        {value.text ? `${value.text} · ` : ''}
        <a href={fileHref(value.file, token)} target="_blank" rel="noreferrer">
          File: {value.file.filename}
        </a>
      </>
    )
  }

  return value || 'Not provided'
}
