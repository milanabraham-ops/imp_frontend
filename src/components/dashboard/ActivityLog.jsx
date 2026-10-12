import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import SelectInput from '../common/SelectInput'
import '../form/form.css'

function formatDateTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const TARGET_ICON = {
  Submission: 'ti-map-pin',
  Group: 'ti-building-community',
  User: 'ti-user',
}

const TARGET_TYPE_OPTIONS = [
  { value: '', label: 'All targets' },
  { value: 'Submission', label: 'Submission' },
  { value: 'Group', label: 'Group' },
  { value: 'User', label: 'User' },
]

const PAGE_SIZE = 50

export default function ActivityLog() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  // A per-submission (or other target) "view full history" deep link — set once on arrival via
  // ?targetId=&targetType=, e.g. from SubmissionDetailModal's "View full history" button. Not a
  // manually-editable filter control like the ones below, so it's read straight from the URL
  // rather than mirrored into its own local state.
  const targetId = searchParams.get('targetId') || ''
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [targetType, setTargetType] = useState(() => searchParams.get('targetType') || '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Any filter change starts back at page 1 — staying on e.g. page 4 of an unfiltered list while
  // switching to a filter that only has 1 page of results would just show "no entries" confusingly.
  useEffect(() => {
    setPage(1)
  }, [targetType, startDate, endDate])

  // Shared by both the paginated fetch and the CSV export below, so the export always matches
  // whatever's currently on screen (same filters, same targetId deep-link scoping).
  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (targetType) params.set('targetType', targetType)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (targetId) params.set('targetId', targetId)
    return params
  }, [targetType, startDate, endDate, targetId])

  const load = useCallback(
    async (isBackgroundRefresh) => {
      if (!isBackgroundRefresh) setLoading(true)
      try {
        const params = buildFilterParams()
        params.set('page', String(page))
        params.set('pageSize', String(PAGE_SIZE))

        const res = await apiFetch(`${API_URL}/audit-logs?${params}`)
        if (!res.ok) throw new Error('Failed to load activity log')
        const body = await res.json()
        setLogs(Array.isArray(body.logs) ? body.logs : [])
        setTotal(body.total || 0)
        setError('')
      } catch (err) {
        setError(err.message || 'Failed to load activity log')
      } finally {
        setLoading(false)
      }
    },
    [page, buildFilterParams],
  )

  useEffect(() => {
    load(false)
    const interval = setInterval(() => load(true), 10000)
    return () => clearInterval(interval)
  }, [load])

  // The list endpoint is capped at PAGE_SIZE per page, so exporting "what's on screen" for real
  // needs the dedicated export endpoint (no page cap, server-side hard limit instead) rather than
  // just serializing `logs`. Downloaded via blob+temporary-link (not a plain <a href>) because this
  // endpoint requires the Bearer token apiFetch attaches — a bare link wouldn't carry it.
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      const res = await apiFetch(`${API_URL}/audit-logs/export?${buildFilterParams()}`)
      if (!res.ok) throw new Error('Failed to export activity log')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'activity-log.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to export activity log')
    } finally {
      setExporting(false)
    }
  }, [buildFilterParams])

  // Best-effort human label for the "Showing history for: …" banner — once the filtered logs come
  // back, every row shares the same denormalized targetLabel, so the first one is representative;
  // falls back to the raw id for the brief window before the first response lands.
  const historyLabel = useMemo(() => logs.find((l) => l.targetLabel)?.targetLabel || targetId, [logs, targetId])

  const clearHistoryFilter = useCallback(() => {
    setTargetType('')
    setSearchParams({})
  }, [setSearchParams])

  // Search only ever narrows down whichever page is currently loaded — a lightweight refinement
  // on top of the real filters above, not a substitute for a full server-side text search across
  // every entry (a bigger feature, not in scope here).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((l) =>
      [l.actorName, l.actorRole, l.targetType, l.targetLabel, l.summary].some((v) => (v || '').toLowerCase().includes(q)),
    )
  }, [logs, search])

  // Admin sees everyone's actions, so the actor is worth its own column. Everyone else only ever
  // sees their own — repeating "you" on every row would just be noise. Except in the targetId
  // deep-link case: there the whole point is showing every actor who touched this one target, so
  // the column earns its place even for a non-admin viewer.
  const showActor = user?.role === 'admin' || Boolean(targetId)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilters = Boolean(targetType || startDate || endDate)

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Activity Log</h1>
              <p>{showActor ? 'Every logged action across the team.' : 'A history of actions you’ve taken.'}</p>
            </div>
          </div>

          {targetId && (
            <div className="info-box">
              <i className="ti ti-filter"></i>
              Showing history for: {historyLabel}
              <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={clearHistoryFilter}>
                Clear
              </button>
            </div>
          )}

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
                  placeholder="Search this page by target, action, detail…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <SelectInput className="inline-edit-select" value={targetType} onChange={setTargetType} options={TARGET_TYPE_OPTIONS} />
              <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                From
                <input type="date" className="inline-edit-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="hint" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                To
                <input type="date" className="inline-edit-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
              {hasFilters && (
                <button
                  type="button"
                  className="btn-sm"
                  onClick={() => {
                    setTargetType('')
                    setStartDate('')
                    setEndDate('')
                  }}
                >
                  Clear filters
                </button>
              )}
              <button type="button" className="btn-sm" disabled={exporting} onClick={handleExport}>
                <i className="ti ti-download"></i> {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
              <div className="dash-count-label">
                {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} entr{total === 1 ? 'y' : 'ies'}
              </div>
            </div>

            {loading ? (
              <div className="dash-empty">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="dash-empty">
                <i className="ti ti-history" style={{ fontSize: 28 }}></i>
                <p>{hasFilters ? 'No entries match these filters.' : 'Nothing logged yet.'}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="dash-empty">
                <p>No entries on this page match &quot;{search}&quot;.</p>
              </div>
            ) : (
              <CustomScrollbar horizontal className="dash-table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      {showActor && <th>Actor</th>}
                      <th>Target</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l) => (
                      <tr key={l._id}>
                        <td>{formatDateTime(l.createdAt)}</td>
                        {showActor && (
                          <td>
                            {l.actorName || 'Unknown'} <span className="you-badge">{l.actorRole}</span>
                          </td>
                        )}
                        <td>
                          <i className={`ti ${TARGET_ICON[l.targetType] || 'ti-file'}`} style={{ marginRight: 6, color: 'var(--text3)' }}></i>
                          {l.targetLabel || l.targetType}
                        </td>
                        <td>{l.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CustomScrollbar>
            )}

            {totalPages > 1 && (
              <div className="dash-table-toolbar" style={{ justifyContent: 'center', gap: 12 }}>
                <button type="button" className="btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <i className="ti ti-chevron-left"></i> Previous
                </button>
                <span className="hint">
                  Page {page} of {totalPages}
                </span>
                <button type="button" className="btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next <i className="ti ti-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </CustomScrollbar>
      </main>
    </div>
  )
}
