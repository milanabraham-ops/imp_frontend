import { useCallback, useEffect, useMemo, useState } from 'react'
import { API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import ForwardingNumbersField from '../common/ForwardingNumbersField'
import { formatDate } from './pipelineHelpers'
import { downloadBlob } from '../../lib/downloadBlob'
import '../form/form.css'

// A plain, searchable log of every account's forwarding numbers, deliberately not a kanban
// board like Pipeline/Integrations, since there's no stage to move through here, just a shared
// record everyone (POC included) can add to. A POC only ever sees their own accounts here (same
// /submissions scoping Integrations uses); specialist/QA/admin see every account.
export default function ForwardingNumbersPage() {
  const { theme } = useTheme()
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async (isBackgroundRefresh) => {
    if (!isBackgroundRefresh) setLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions`)
      if (!res.ok) throw new Error('Failed to load accounts')
      const body = await res.json()
      // Only accounts that actually need their numbers forwarded (see Step2PhoneHours' toggle) ,
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
    // dateTo's own day is inclusive (comparing against the START of the NEXT day), a plain
    // <input type="date"> value has no time component, and a submission created any time during
    // that calendar day should still count as "within range", not just up to midnight.
    const from = dateFrom ? new Date(dateFrom) : null
    const to = dateTo ? new Date(new Date(dateTo).getTime() + 24 * 60 * 60 * 1000) : null
    return submissions.filter((s) => {
      if (q && ![s.clientName, s.locationName, s.environment, s.forwardingNumbers].some((v) => (v || '').toLowerCase().includes(q))) {
        return false
      }
      const created = s.createdAt ? new Date(s.createdAt) : null
      if (from && (!created || created < from)) return false
      if (to && (!created || created >= to)) return false
      return true
    })
  }, [submissions, search, dateFrom, dateTo])

  // Selection survives across a filter change rather than being wiped by it (someone narrowing
  // the search further after picking a few rows shouldn't lose what they already picked), but a
  // row that's no longer in `submissions` at all (deleted, or this account no longer needs
  // forwarding) has to go, there's nothing left to export it from.
  useEffect(() => {
    setSelected((prev) => {
      const validIds = new Set(submissions.map((s) => s._id))
      const next = new Set([...prev].filter((id) => validIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [submissions])

  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.has(s._id))
  const toggleSelectAllFiltered = () => {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev)
        for (const s of filtered) next.delete(s._id)
        return next
      }
      return new Set([...prev, ...filtered.map((s) => s._id)])
    })
  }

  // Exports whichever rows are explicitly checked, or every currently-filtered row if nothing's
  // checked, so a plain "search/date-filter, then export" flow (no selecting needed) still works.
  const handleExport = async () => {
    const ids = selected.size > 0 ? [...selected] : filtered.map((s) => s._id)
    if (ids.length === 0) return
    setExporting(true)
    try {
      const res = await apiFetch(`${API_URL}/submissions/forwarding-numbers/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Failed to export forwarding numbers')
      downloadBlob(await res.blob(), 'forwarding-numbers.xlsx')
    } catch (err) {
      setError(err.message || 'Failed to export forwarding numbers')
    } finally {
      setExporting(false)
    }
  }

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
              <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                From
                <input type="date" className="inline-edit-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </label>
              <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                To
                <input type="date" className="inline-edit-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </label>
              <button type="button" className="btn-sm" disabled={exporting || filtered.length === 0} onClick={handleExport}>
                <i className="ti ti-download"></i>{' '}
                {exporting ? 'Exporting…' : selected.size > 0 ? `Export Selected (${selected.size})` : 'Export All Filtered'}
              </button>
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
                <p>No accounts match the current search/date filter.</p>
              </div>
            ) : (
              <CustomScrollbar horizontal className="dash-table-scroll">
                <table className="dash-table forwarding-numbers-table">
                  <thead>
                    <tr>
                      <th style={{ width: 32 }}>
                        <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAllFiltered} aria-label="Select all" />
                      </th>
                      <th>Account Name</th>
                      <th>Account Type</th>
                      <th>Submitted</th>
                      <th>Forwarding Numbers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr key={s._id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.has(s._id)}
                            onChange={() => toggleSelected(s._id)}
                            aria-label={`Select ${s.clientName || 'Untitled'}`}
                          />
                        </td>
                        <td>
                          {s.clientName || 'Untitled'}
                          <div className="hint">{s.locationName || 'Untitled location'}</div>
                        </td>
                        <td>
                          <span className="status-badge">
                            {(s.environment || '').trim().toLowerCase() === 'cs voicestack' ? 'CS Voicestack' : 'Voicestack'}
                          </span>
                        </td>
                        <td>{formatDate(s.createdAt)}</td>
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
