import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth, API_URL } from '../../context/AuthContext'
import { apiFetch } from '../../lib/apiFetch'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import Sidebar from '../common/Sidebar'
import TopUserBar from '../common/TopUserBar'
import CustomScrollbar from '../common/CustomScrollbar'
import ConfirmDialog from '../common/ConfirmDialog'
import SelectInput from '../common/SelectInput'
import '../form/form.css'

const ROLES = ['poc', 'specialist', 'qa', 'admin']
const ROLE_LABELS = { poc: 'POC', specialist: 'Specialist', qa: 'QA', admin: 'Admin' }

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const BLANK_FORM = { name: '', email: '', role: 'poc', isTestAccount: false, chatUserId: '' }

// The numeric ID has to be looked up externally (Directory API, People API, or captured from a
// browser network request while typing an @-mention) — there's nothing to validate it against
// here, so this is just a plain text field, saved on blur like the rest of the app's inline edits
// (ForwardingNumbersField, etc.) rather than firing a request on every keystroke.
function ChatIdCell({ user, saving, onSave }) {
  const [value, setValue] = useState(user.chatUserId || '')

  useEffect(() => {
    setValue(user.chatUserId || '')
  }, [user.chatUserId])

  return (
    <input
      type="text"
      className="inline-edit-input"
      placeholder="Chat user ID"
      disabled={saving}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const trimmed = value.trim()
        if (trimmed !== (user.chatUserId || '')) onSave(user, trimmed)
      }}
    />
  )
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const { theme } = useTheme()
  const { showToast } = useToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [pendingRemove, setPendingRemove] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [pendingReset, setPendingReset] = useState(null)
  const [resetting, setResetting] = useState(false)
  const [purgeOpen, setPurgeOpen] = useState(false)
  const [purging, setPurging] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`${API_URL}/admin/users`)
      if (!res.ok) throw new Error('Failed to load users')
      const body = await res.json()
      setUsers(Array.isArray(body) ? body : [])
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const changeRole = async (targetUser, role) => {
    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role } : u)))
    setSavingId(targetUser.id)
    setError('')
    try {
      const res = await apiFetch(`${API_URL}/admin/users/${targetUser.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to update role')
      showToast(`Role updated for ${targetUser.name}.`)
    } catch (err) {
      const message = err.message || 'Failed to update role'
      setError(message)
      showToast(message, 'error')
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: targetUser.role } : u)))
    } finally {
      setSavingId(null)
    }
  }

  const changeChatUserId = async (targetUser, chatUserId) => {
    setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, chatUserId } : u)))
    setSavingId(targetUser.id)
    try {
      const res = await apiFetch(`${API_URL}/admin/users/${targetUser.id}/chat-id`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatUserId }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to update chat user ID')
      showToast(`Chat user ID updated for ${targetUser.name}.`)
    } catch (err) {
      const message = err.message || 'Failed to update chat user ID'
      showToast(message, 'error')
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, chatUserId: targetUser.chatUserId } : u)))
    } finally {
      setSavingId(null)
    }
  }

  const confirmReset = async () => {
    if (!pendingReset) return
    setResetting(true)
    try {
      const res = await apiFetch(`${API_URL}/admin/users/${pendingReset.id}/reset-password`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to reset password')
      setUsers((prev) => prev.map((u) => (u.id === pendingReset.id ? body : u)))
      showToast(`Password reset for ${pendingReset.name} — they'll need to change it on next login.`)
      setPendingReset(null)
    } catch (err) {
      showToast(err.message || 'Failed to reset password', 'error')
    } finally {
      setResetting(false)
    }
  }

  const confirmRemove = async () => {
    if (!pendingRemove) return
    setRemoving(true)
    try {
      const res = await apiFetch(`${API_URL}/admin/users/${pendingRemove.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to remove access')
      }
      setUsers((prev) => prev.filter((u) => u.id !== pendingRemove.id))
      showToast(`Access revoked for ${pendingRemove.name}.`)
      setPendingRemove(null)
    } catch (err) {
      showToast(err.message || 'Failed to remove access', 'error')
    } finally {
      setRemoving(false)
    }
  }

  const addUser = async (e) => {
    e.preventDefault()
    setAdding(true)
    setAddError('')
    try {
      const res = await apiFetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to add agent')
      setUsers((prev) => [body, ...prev])
      setForm(BLANK_FORM)
      setAddOpen(false)
      showToast(`${body.name} added.`)
    } catch (err) {
      const message = err.message || 'Failed to add agent'
      setAddError(message)
      showToast(message, 'error')
    } finally {
      setAdding(false)
    }
  }

  const confirmPurge = async () => {
    setPurging(true)
    try {
      const res = await apiFetch(`${API_URL}/admin/purge-test-data`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to purge test data')
      showToast(
        `Purged ${body.submissionsDeleted} submission${body.submissionsDeleted === 1 ? '' : 's'} and ${body.groupsDeleted} group${
          body.groupsDeleted === 1 ? '' : 's'
        }.`,
      )
      setPurgeOpen(false)
    } catch (err) {
      showToast(err.message || 'Failed to purge test data', 'error')
    } finally {
      setPurging(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => [u.name, u.email, u.role].some((v) => (v || '').toLowerCase().includes(q)))
  }, [users, search])

  return (
    <div className="voicestack-form dash-shell" data-theme={theme}>
      <Sidebar />

      <main className="dash-main">
        <CustomScrollbar vertical className="dash-main-scroll">
          <TopUserBar />
          <div className="dash-main-header">
            <div>
              <h1>Manage Access</h1>
              <p>Add agents and assign roles (POC, Specialist, QA, or Admin) to each account.</p>
            </div>
            <div className="dash-main-header-actions">
              <button type="button" className="btn-sm danger" onClick={() => setPurgeOpen(true)}>
                <i className="ti ti-trash"></i> Purge Test Data
              </button>
              <button type="button" className="btn-sm" onClick={() => setAddOpen((v) => !v)}>
                <i className="ti ti-user-plus"></i> Add Agent
              </button>
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

          {addOpen && (
            <form className="dash-table-card add-user-panel" onSubmit={addUser}>
              {addError && (
                <div className="info-box error">
                  <i className="ti ti-alert-circle"></i>
                  {addError}
                </div>
              )}
              <div className="add-user-fields">
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="Full name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
                <input
                  type="email"
                  className="inline-edit-input"
                  placeholder="Email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                <SelectInput
                  className="inline-edit-select"
                  value={form.role}
                  onChange={(v) => setForm((f) => ({ ...f, role: v }))}
                  options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
                />
                <input
                  type="text"
                  className="inline-edit-input"
                  placeholder="Chat user ID (optional)"
                  value={form.chatUserId}
                  onChange={(e) => setForm((f) => ({ ...f, chatUserId: e.target.value }))}
                />
                <label className="show-own-toggle">
                  <input
                    type="checkbox"
                    checked={form.isTestAccount}
                    onChange={(e) => setForm((f) => ({ ...f, isTestAccount: e.target.checked }))}
                  />
                  Test account
                </label>
                <button type="submit" className="btn-sm" disabled={adding}>
                  {adding ? 'Adding…' : 'Add Agent'}
                </button>
                <button type="button" className="btn-sm" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
              </div>
              <div className="hint">
                New accounts start with the default password (12345678) and must change it on first login. Test accounts have full
                functionality but their submissions can be bulk-purged with the button above.
              </div>
            </form>
          )}

          <div className="dash-table-card">
            <div className="dash-table-toolbar">
              <div className="dash-search">
                <i className="ti ti-search"></i>
                <input
                  type="text"
                  placeholder="Search by name, email, role…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="dash-count-label">
                {filtered.length} of {users.length} user{users.length === 1 ? '' : 's'}
              </div>
            </div>

            {loading ? (
              <div className="dash-empty">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="dash-empty">
                <p>No users match &quot;{search}&quot;.</p>
              </div>
            ) : (
              <CustomScrollbar horizontal className="dash-table-scroll">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Role</th>
                      <th>Chat User ID</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.name}
                          {u.isTestAccount && <span className="you-badge">test</span>}
                        </td>
                        <td>{u.email}</td>
                        <td>{formatDate(u.createdAt)}</td>
                        <td>
                          <SelectInput
                            className="inline-edit-select"
                            value={u.role}
                            disabled={savingId === u.id || u.id === currentUser?.id}
                            onChange={(v) => changeRole(u, v)}
                            options={ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
                          />
                        </td>
                        <td>
                          <ChatIdCell user={u} saving={savingId === u.id} onSave={changeChatUserId} />
                        </td>
                        <td className="dash-table-actions">
                          {u.authProvider === 'local' && (
                            <button type="button" className="btn-sm" title="Reset to the default password" onClick={() => setPendingReset(u)}>
                              <i className="ti ti-key"></i> Reset Password
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-sm danger"
                            disabled={u.id === currentUser?.id}
                            title={u.id === currentUser?.id ? "You can't remove your own access" : undefined}
                            onClick={() => setPendingRemove(u)}
                          >
                            <i className="ti ti-user-x"></i> Remove
                          </button>
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

      <ConfirmDialog
        open={!!pendingReset}
        title="Reset password?"
        message={pendingReset && `${pendingReset.name}'s password will be reset to the default (12345678) and they'll be signed out everywhere and forced to change it on next login.`}
        confirmLabel="Reset Password"
        busy={resetting}
        onConfirm={confirmReset}
        onCancel={() => setPendingReset(null)}
      />

      <ConfirmDialog
        open={!!pendingRemove}
        title="Revoke access?"
        message={pendingRemove && `This permanently deletes ${pendingRemove.name}'s account (${pendingRemove.email}). They will no longer be able to log in.`}
        confirmLabel="Remove Access"
        danger
        busy={removing}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />

      <ConfirmDialog
        open={purgeOpen}
        title="Purge test data?"
        message="Permanently deletes every submission and group marked as test data — along with their uploaded files and Google Sheet rows — everywhere across the app. Real accounts and data are untouched, and test accounts themselves stay intact and reusable."
        confirmLabel="Purge Everything"
        danger
        busy={purging}
        onConfirm={confirmPurge}
        onCancel={() => setPurgeOpen(false)}
      />
    </div>
  )
}
