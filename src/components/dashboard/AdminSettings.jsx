import { useCallback, useEffect, useState } from 'react'
import { API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import '../form/form.css'

const BLANK = {
  gchatQaWebhookUrl: '',
  gchatPocWebhookUrl: '',
  googleDriveFolderId: '',
  auditLogRetentionDays: 30,
}

export default function AdminSettings() {
  const { theme } = useTheme()
  const { showToast } = useToast()
  const [form, setForm] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [checklistItems, setChecklistItems] = useState([])
  const [checklistError, setChecklistError] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [checklistBusy, setChecklistBusy] = useState(false)

  const [pmsDocs, setPmsDocs] = useState([])
  const [pmsDocsError, setPmsDocsError] = useState('')
  const [newPmsDocName, setNewPmsDocName] = useState('')
  const [newPmsDocUrl, setNewPmsDocUrl] = useState('')
  const [pmsDocsBusy, setPmsDocsBusy] = useState(false)
  // Keyed by PMS name — only populated once someone actually starts typing in that row's URL
  // field, so a freshly-loaded list reads straight off `pmsDocs` until then. Lets a doc added
  // name-only (no guide written yet) have its URL attached later, in place, instead of needing to
  // remove and re-add the entry.
  const [pmsDocUrlDrafts, setPmsDocUrlDrafts] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/admin/settings`)
      if (!res.ok) throw new Error('Failed to load settings')
      const body = await res.json()
      setForm((f) => ({ ...f, ...body }))
    } catch (err) {
      setError(err.message || 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadChecklist = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_URL}/qa-checklist-items`)
      if (!res.ok) throw new Error('Failed to load QA checklist')
      const body = await res.json()
      setChecklistItems(Array.isArray(body.baseItems) ? body.baseItems : [])
      setChecklistError('')
    } catch (err) {
      setChecklistError(err.message || 'Failed to load QA checklist')
    }
  }, [])

  const loadPmsDocs = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_URL}/pms-docs`)
      if (!res.ok) throw new Error('Failed to load PMS integration docs')
      const body = await res.json()
      setPmsDocs(Array.isArray(body.docs) ? body.docs : [])
      setPmsDocsError('')
    } catch (err) {
      setPmsDocsError(err.message || 'Failed to load PMS integration docs')
    }
  }, [])

  useEffect(() => {
    load()
    loadChecklist()
    loadPmsDocs()
  }, [load, loadChecklist, loadPmsDocs])

  const addChecklistItem = async (e) => {
    e.preventDefault()
    const name = newChecklistItem.trim()
    if (!name) return
    setChecklistBusy(true)
    try {
      const res = await apiFetch(`${API_URL}/qa-checklist-items/base-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to add item')
      setChecklistItems(Array.isArray(body.baseItems) ? body.baseItems : [])
      setNewChecklistItem('')
    } catch (err) {
      showToast(err.message || 'Failed to add item', 'error')
    } finally {
      setChecklistBusy(false)
    }
  }

  const removeChecklistItem = async (name) => {
    setChecklistBusy(true)
    try {
      const res = await apiFetch(`${API_URL}/qa-checklist-items/base-items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to remove item')
      setChecklistItems(Array.isArray(body.baseItems) ? body.baseItems : [])
    } catch (err) {
      showToast(err.message || 'Failed to remove item', 'error')
    } finally {
      setChecklistBusy(false)
    }
  }

  // `url` is optional here on purpose — the doc often isn't written yet when the integration
  // itself needs to exist as a dropdown option, so just the name is enough to register it. It can
  // be attached later via savePmsDocUrl below, without re-adding the entry.
  const addPmsDoc = async (e) => {
    e.preventDefault()
    const name = newPmsDocName.trim()
    const url = newPmsDocUrl.trim()
    if (!name) return
    setPmsDocsBusy(true)
    try {
      const res = await apiFetch(`${API_URL}/pms-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to add PMS')
      setPmsDocs(Array.isArray(body.docs) ? body.docs : [])
      setNewPmsDocName('')
      setNewPmsDocUrl('')
    } catch (err) {
      showToast(err.message || 'Failed to add PMS', 'error')
    } finally {
      setPmsDocsBusy(false)
    }
  }

  // Re-upserts the same name with whatever's currently in that row's draft field — attaching a
  // doc link to a PMS that was added name-only, or swapping a stale one, without touching anything
  // else about the entry.
  const savePmsDocUrl = async (doc) => {
    const url = (pmsDocUrlDrafts[doc.name] ?? doc.url).trim()
    setPmsDocsBusy(true)
    try {
      const res = await apiFetch(`${API_URL}/pms-docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: doc.name, url }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to save doc link')
      setPmsDocs(Array.isArray(body.docs) ? body.docs : [])
      setPmsDocUrlDrafts((d) => {
        const next = { ...d }
        delete next[doc.name]
        return next
      })
    } catch (err) {
      showToast(err.message || 'Failed to save doc link', 'error')
    } finally {
      setPmsDocsBusy(false)
    }
  }

  const removePmsDoc = async (name) => {
    setPmsDocsBusy(true)
    try {
      const res = await apiFetch(`${API_URL}/pms-docs`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to remove doc link')
      setPmsDocs(Array.isArray(body.docs) ? body.docs : [])
      setPmsDocUrlDrafts((d) => {
        const next = { ...d }
        delete next[name]
        return next
      })
    } catch (err) {
      showToast(err.message || 'Failed to remove doc link', 'error')
    } finally {
      setPmsDocsBusy(false)
    }
  }

  const update = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch(`${API_URL}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to save settings')
      setForm((f) => ({ ...f, ...body }))
      showToast('Settings saved.')
    } catch (err) {
      const message = err.message || 'Failed to save settings'
      setError(message)
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="voicestack-form dash-shell" data-theme={theme}>
        <Sidebar />
        <main className="dash-main">
          <div className="dash-empty">Loading…</div>
        </main>
      </div>
    )
  }

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Settings</h1>
              <p>Google Chat notifications and Drive storage. Changes apply immediately, no restart needed.</p>
            </div>
          </div>

          {error && (
            <div className="info-box error">
              <i className="ti ti-alert-circle"></i>
              {error}
              <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={() => load()}>
                <i className="ti ti-refresh"></i> Retry
              </button>
            </div>
          )}

          <form onSubmit={save}>
            <div className="settings-panel">
              <div className="settings-panel-header">
                <h2>Google Chat</h2>
                <p>
                  Incoming webhook URLs. In the target space: space name (top-left) → Apps &amp; integrations → Webhooks → Add
                  webhook.
                </p>
              </div>
              <div className="field tight">
                <label>QA team space (posted when a specialist hands a location to QA)</label>
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="https://chat.googleapis.com/v1/spaces/..."
                  value={form.gchatQaWebhookUrl}
                  onChange={(e) => update('gchatQaWebhookUrl', e.target.value)}
                />
              </div>
              <div className="field">
                <label>POC space (posted when QA marks a location Completed)</label>
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="https://chat.googleapis.com/v1/spaces/..."
                  value={form.gchatPocWebhookUrl}
                  onChange={(e) => update('gchatPocWebhookUrl', e.target.value)}
                />
              </div>
            </div>

            <div className="settings-panel">
              <div className="settings-panel-header">
                <h2>Google Drive</h2>
                <p>
                  The Shared Drive uploaded audio and profile photos are stored in. Find its id in the Drive URL
                  (drive.google.com/drive/folders/<strong>this-part</strong>), after sharing it with the service account
                  (Editor access). Changing this takes effect on the very next upload, no restart needed.
                </p>
              </div>
              <div className="field tight">
                <label>Drive folder (Shared Drive) id</label>
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="e.g. 0AO8px7bKarwcUk9PVA"
                  value={form.googleDriveFolderId}
                  onChange={(e) => update('googleDriveFolderId', e.target.value)}
                />
              </div>
            </div>

            <div className="settings-panel">
              <div className="settings-panel-header">
                <h2>Activity Log</h2>
                <p>
                  How long detailed audit-log entries (take-overs, status changes, edits, comments, etc.) are kept before
                  being cleared out automatically. Who submitted/reviewed each location, its status, and who last touched
                  it are kept permanently regardless. Shortening this only trims the detailed trail.
                </p>
              </div>
              <div className="field tight">
                <label>Retention (days)</label>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  className="inline-edit-input"
                  style={{ maxWidth: 120 }}
                  value={form.auditLogRetentionDays}
                  onChange={(e) => update('auditLogRetentionDays', e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', marginBottom: '1.75rem' }} disabled={saving}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </form>

          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2>QA Checklist</h2>
              <p>
                The shared base checklist every QA agent reviews against, on top of whatever personal items each agent
                adds for themselves. Changes here apply immediately, no restart needed.
              </p>
            </div>

            {checklistError && (
              <div className="info-box error">
                <i className="ti ti-alert-circle"></i>
                {checklistError}
                <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={() => loadChecklist()}>
                  <i className="ti ti-refresh"></i> Retry
                </button>
              </div>
            )}

            {checklistItems.map((item) => (
              <div className="qa-checklist-row" key={item}>
                <span className="qa-checklist-item-name">{item}</span>
                <button
                  type="button"
                  className="btn-sm danger"
                  disabled={checklistBusy}
                  onClick={() => removeChecklistItem(item)}
                  title="Remove this base checklist item"
                  aria-label={`Remove ${item} from the base checklist`}
                >
                  <i className="ti ti-trash"></i>
                </button>
              </div>
            ))}

            <div className="qa-checklist-add-row">
              <input
                type="text"
                className="inline-edit-input"
                placeholder="Add a base checklist item…"
                value={newChecklistItem}
                disabled={checklistBusy}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addChecklistItem(e)
                }}
              />
              <button type="button" className="btn-sm" disabled={checklistBusy || !newChecklistItem.trim()} onClick={addChecklistItem}>
                <i className="ti ti-plus"></i> Add Item
              </button>
            </div>
          </div>

          <div className="settings-panel">
            <div className="settings-panel-header">
              <h2>PMS Integration Docs</h2>
              <p>
                Every PMS an admin adds here shows up as a pickable option on the form's PMS dropdown. A guide link is
                optional. Add the PMS by name alone if its doc isn't written yet, and attach the link later once it
                is. When picked, a POC sees a link to this guide instead of typing credentials straight into the
                submission.
              </p>
            </div>

            {pmsDocsError && (
              <div className="info-box error">
                <i className="ti ti-alert-circle"></i>
                {pmsDocsError}
                <button type="button" className="btn-sm" style={{ marginLeft: 'auto' }} onClick={() => loadPmsDocs()}>
                  <i className="ti ti-refresh"></i> Retry
                </button>
              </div>
            )}

            {pmsDocs.map((doc) => {
              const draft = pmsDocUrlDrafts[doc.name] ?? doc.url
              const changed = draft.trim() !== (doc.url || '')
              return (
                <div className="qa-checklist-row" key={doc.name}>
                  <span className="qa-checklist-item-name">{doc.name}</span>
                  <input
                    type="url"
                    className="inline-edit-input"
                    placeholder="https://… guide link (none yet)"
                    value={draft}
                    disabled={pmsDocsBusy}
                    onChange={(e) => setPmsDocUrlDrafts((d) => ({ ...d, [doc.name]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && changed) savePmsDocUrl(doc)
                    }}
                  />
                  {changed && (
                    <button
                      type="button"
                      className="btn-sm"
                      disabled={pmsDocsBusy}
                      onClick={() => savePmsDocUrl(doc)}
                      title="Save this doc link"
                      aria-label={`Save the doc link for ${doc.name}`}
                    >
                      <i className="ti ti-device-floppy"></i> Save
                    </button>
                  )}
                  {doc.url && !changed && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn-sm">
                      <i className="ti ti-external-link"></i> View
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn-sm danger"
                    disabled={pmsDocsBusy}
                    onClick={() => removePmsDoc(doc.name)}
                    title="Remove this PMS integration"
                    aria-label={`Remove the ${doc.name} integration`}
                  >
                    <i className="ti ti-trash"></i>
                  </button>
                </div>
              )
            })}

            <div className="qa-checklist-add-row">
              <input
                type="text"
                className="inline-edit-input"
                placeholder="PMS name (e.g. CareStack)…"
                value={newPmsDocName}
                disabled={pmsDocsBusy}
                onChange={(e) => setNewPmsDocName(e.target.value)}
              />
              <input
                type="url"
                className="inline-edit-input"
                placeholder="https://… guide link (optional, can add later)"
                value={newPmsDocUrl}
                disabled={pmsDocsBusy}
                onChange={(e) => setNewPmsDocUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addPmsDoc(e)
                }}
              />
              <button type="button" className="btn-sm" disabled={pmsDocsBusy || !newPmsDocName.trim()} onClick={addPmsDoc}>
                <i className="ti ti-plus"></i> Add
              </button>
            </div>
          </div>
        </CustomScrollbar>
      </main>
    </div>
  )
}
