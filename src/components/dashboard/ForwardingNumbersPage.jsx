import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import ForwardingNumbersField from '../common/ForwardingNumbersField'
import '../form/form.css'

// A plain, searchable log of every account's forwarding numbers — deliberately not a kanban
// board like Pipeline/Integrations, since there's no stage to move through here, just a shared
// record everyone (POC included) can add to. A POC only ever sees their own accounts here (same
// /submissions scoping Integrations uses); specialist/QA/admin see every account.
export default function ForwardingNumbersPage() {
  const { theme } = useTheme()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const load = useCallback(async (isBackgroundRefresh) => {
    if (!isBackgroundRefresh) setLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions`)
      if (!res.ok) throw new Error('Failed to load accounts')
      const body = await res.json()
      // Only accounts that actually need their numbers forwarded (see Step2PhoneHours' toggle) —
      // otherwise every new practice defaults onto this page before anyone's confirmed it needs
      // that setup at all.
      setSubmissions(Array.isArray(body) ? body.filter((s) => s.forwardingNumberRequired) : [])
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(false)
    const interval = setInterval(() => load(true), 5000)
    return () => clearInterval(interval)
  }, [load])

  const onChanged = (updated) => {
    setSubmissions((prev) => prev.map((s) => (s._id === updated._id ? updated : s)))
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return submissions
    return submissions.filter((s) =>
      [s.clientName, s.locationName, s.environment, s.forwardingNumbers].some((v) => (v || '').toLowerCase().includes(q)),
    )
  }, [submissions, search])

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Forwarding Numbers</h1>
              <p>Every account's forwarded numbers, in one searchable log. Anyone can add or fix one.</p>
            </div>
          </div>

          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
              <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={() => load(false)}>
                <i className="ti ti-refresh"></i> Retry
              </button>
            </div>
          )}

          <div className="dash-table-card">
            <div className="dash-table-toolbar">
              <div className="dash-search">
                <i className="ti ti-search"></i>
                <input
                  type="text"
                  placeholder="Search by account, location, PMS environment, or number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="dash-count-label">
                {filtered.length} of {submissions.length} account{submissions.length === 1 ? '' : 's'}
              </div>
            </div>

            {loading ? (
              <div className="dash-empty">Loading…</div>
            ) : submissions.length === 0 ? (
              <div className="dash-empty">
                <i className="ti ti-phone-outgoing" style={{ fontSize: 28 }}></i>
                <p>No accounts yet.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="dash-empty">
                <p>No accounts match &quot;{search}&quot;.</p>
              </div>
            ) : (
              <CustomScrollbar horizontal className="dash-table-scroll">
                <table className="dash-table forwarding-numbers-table">
                  <thead>
                    <tr>
                      <th>Account Name</th>
                      <th>Account Type</th>
                      <th>Forwarding Numbers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s._id}>
                        <td>
                          {s.clientName || 'Untitled'}
                          <div className="hint">{s.locationName || 'Untitled location'}</div>
                        </td>
                        <td>
                          <span className="status-badge">
                            {(s.environment || '').trim().toLowerCase() === 'cs voicestack' ? 'CS Voicestack' : 'Voicestack'}
                          </span>
                        </td>
                        <td className="forwarding-numbers-cell">
                          <ForwardingNumbersField submission={s} onChanged={onChanged} compact />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CustomScrollbar>
            )}
          </div>
        </CustomScrollbar>
      </main>
    </div>
  )
}
